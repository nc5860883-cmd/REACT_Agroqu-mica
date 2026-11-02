# inventario/api_remitos.py

from datetime import date

from django.db import transaction, IntegrityError, DatabaseError
from django.db.models import Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import (
    Remitos,
    Lotes,
    Productos,
    Proveedores,
    Stock,
    MovimientosStock,
    TiposMovimientos,
    Usuarios,
)

from .permissions import puede, puede_accion
from .auditoria import snapshot, registrar_auditoria


TIPO_ENTRADA = 'Entrada de lote'
TIPO_ANULACION_REMITO = 'Anulación de remito'


# ============================================================
# RESPUESTAS Y VALIDACIONES GENERALES
# ============================================================

def _error(mensaje, codigo=status.HTTP_400_BAD_REQUEST):
    return Response(
        {'ok': False, 'error': mensaje},
        status=codigo
    )


def _usuario_actual(request):
    """
    Recupera el usuario de la sesión Django.
    Verifica que el usuario y su perfil estén activos.
    """

    usuario_id = request.session.get('usuario_id')

    if not usuario_id:
        return None

    usuario = Usuarios.objects.select_related(
        'ID_Perfil'
    ).filter(
        ID_Usuario=usuario_id,
        Estado_usuario=True
    ).first()

    if not usuario:
        return None

    if not usuario.ID_Perfil:
        return None

    if not usuario.ID_Perfil.Estado_perfil:
        return None

    return usuario


def _fecha_valida(valor):
    """Convierte una fecha ISO a date."""

    if isinstance(valor, date):
        return valor

    if not valor:
        return None

    try:
        return date.fromisoformat(str(valor))
    except (ValueError, TypeError):
        return None


# ============================================================
# SERIALIZACIÓN MANUAL
# ============================================================

def _serializar_lote(lote):
    return {
        'id': lote.ID_Lote,
        'ID_Lote': lote.ID_Lote,

        'ID_Producto': lote.ID_Producto_id,
        'producto': lote.ID_Producto.Nombre_producto,

        'Numero_lote': lote.Numero_lote,
        'numero': lote.Numero_lote,

        'Cantidad_cajas': lote.Cantidad_cajas,
        'Unidades_por_caja': lote.Unidades_por_caja,

        'Cantidad_ingresada': lote.Cantidad_ingresada,
        'Cantidad_actual': lote.Cantidad_actual,

        'Fecha_ingreso': (
            lote.Fecha_ingreso.isoformat()
            if lote.Fecha_ingreso else None
        ),

        'Fecha_vencimiento': (
            lote.Fecha_vencimiento.isoformat()
            if lote.Fecha_vencimiento else None
        ),

        'estado_actual': getattr(
            lote,
            'estado_actual',
            'Activo'
        ),
    }


def _serializar_remito(remito):
    lotes = list(
        remito.lotes.select_related(
            'ID_Producto'
        ).order_by(
            'Fecha_vencimiento',
            'ID_Lote'
        )
    )

    total_unidades = sum(
        lote.Cantidad_ingresada or 0
        for lote in lotes
    )

    return {
        'id': remito.ID_Remito,
        'ID_Remito': remito.ID_Remito,

        'Numero_remito': remito.Numero_remito,
        'Fecha_remito': (
            remito.Fecha_remito.isoformat()
            if remito.Fecha_remito else None
        ),

        'Estado_remito': remito.Estado_remito,

        'ID_Proveedor': remito.ID_Proveedor_id,
        'proveedor': remito.ID_Proveedor.nombre_proveedor,

        'total_lotes': len(lotes),
        'total_unidades': total_unidades,

        'Fecha_anulacion': (
            remito.Fecha_anulacion.isoformat()
            if remito.Fecha_anulacion else None
        ),

        'Motivo_anulacion': remito.Motivo_anulacion or '',

        'usuario_anulacion': (
            f'{remito.ID_Usuario_anulacion.Nombre_usuario} '
            f'{remito.ID_Usuario_anulacion.Apellido_usuario}'
            if remito.ID_Usuario_anulacion else None
        ),

        'lotes': [
            _serializar_lote(lote)
            for lote in lotes
        ],
    }


# ============================================================
# CATÁLOGOS PARA EL FORMULARIO DE REMITOS
# ============================================================

def _catalogos_remitos():
    proveedores = Proveedores.objects.filter(
        estado_proveedor=True
    ).order_by(
        'nombre_proveedor'
    )

    productos = Productos.objects.filter(
        Estado_producto='Activo'
    ).prefetch_related(
        'proveedores'
    ).order_by(
        'Nombre_producto'
    )

    return {
        'proveedores': [
            {
                'id': proveedor.ID_Proveedor,
                'nombre': proveedor.nombre_proveedor,
            }
            for proveedor in proveedores
        ],

        'productos': [
            {
                'id': producto.ID_Producto,
                'nombre': producto.Nombre_producto,

                'Unidades_por_presentacion': (
                    producto.Unidades_por_presentacion
                ),

                'Cantidad_presentacion': (
                    str(producto.Cantidad_presentacion)
                    if producto.Cantidad_presentacion is not None
                    else None
                ),

                'Unidad_medida_producto': (
                    producto.Unidad_medida_producto
                ),

                'proveedores': [
                    proveedor.ID_Proveedor
                    for proveedor in producto.proveedores.all()
                ],
            }
            for producto in productos
        ],
    }


# ============================================================
# LISTAR Y REGISTRAR REMITOS
# ============================================================

@api_view(['GET', 'POST'])
def remitos(request):

    usuario = _usuario_actual(request)

    if not usuario:
        return _error(
            'La sesión no es válida. Iniciá sesión nuevamente.',
            status.HTTP_401_UNAUTHORIZED
        )

    # ========================================================
    # GET: CONSULTAR REMITOS
    # ========================================================

    if request.method == 'GET':

        if not puede(usuario, 'remitos'):
            return _error(
                'No tenés permiso para consultar remitos.',
                status.HTTP_403_FORBIDDEN
            )

        queryset = Remitos.objects.select_related(
            'ID_Proveedor',
            'ID_Usuario_anulacion'
        ).prefetch_related(
            'lotes__ID_Producto'
        ).annotate(
            total_unidades=Coalesce(
                Sum('lotes__Cantidad_ingresada'),
                0
            )
        ).order_by(
            '-Fecha_remito',
            '-ID_Remito'
        )

        # Búsqueda
        busqueda = request.query_params.get('q', '').strip()

        if busqueda:
            queryset = queryset.filter(
                Q(Numero_remito__icontains=busqueda)
                | Q(
                    ID_Proveedor__nombre_proveedor__icontains=busqueda
                )
            )

        # Filtro por proveedor
        proveedor_id = request.query_params.get(
            'proveedor',
            ''
        ).strip()

        if proveedor_id:
            queryset = queryset.filter(
                ID_Proveedor_id=proveedor_id
            )

        # Filtro por estado
        estado = request.query_params.get(
            'estado',
            ''
        ).strip()

        if estado in ('Confirmado', 'Anulado'):
            queryset = queryset.filter(
                Estado_remito=estado
            )

        datos = [
            _serializar_remito(remito)
            for remito in queryset
        ]

        return Response({
            'ok': True,

            'remitos': datos,

            'resumen': {
                'total_remitos': Remitos.objects.count(),

                'total_proveedores': (
                    Remitos.objects.values(
                        'ID_Proveedor'
                    ).distinct().count()
                ),

                'total_lotes': Lotes.objects.count(),
            },

            'catalogos': _catalogos_remitos(),

            'puede_gestionar': puede(
                usuario,
                'remitos',
                gestionar=True
            ),

            'puede_anular': puede_accion(
                usuario,
                'anular_remitos'
            ),
        })

    # ========================================================
    # POST: REGISTRAR REMITO CON SUS LOTES
    # ========================================================

    if not puede(usuario, 'remitos', gestionar=True):
        return _error(
            'No tenés permiso para registrar remitos.',
            status.HTTP_403_FORBIDDEN
        )

    datos = request.data

    proveedor_id = datos.get('ID_Proveedor')
    numero_remito = str(
        datos.get('Numero_remito', '')
    ).strip()

    fecha_remito = _fecha_valida(
        datos.get('Fecha_remito')
    )

    lotes_recibidos = datos.get('lotes', [])

    hoy = timezone.localdate()

    # Validar cabecera
    if not proveedor_id or not numero_remito or not fecha_remito:
        return _error(
            'Completá el número, la fecha y el proveedor del remito.'
        )

    if len(numero_remito) > 20:
        return _error(
            'El número de remito no puede superar los 20 caracteres.'
        )

    if fecha_remito > hoy:
        return _error(
            'La fecha del remito no puede ser futura.'
        )

    if not isinstance(lotes_recibidos, list) or not lotes_recibidos:
        return _error(
            'El remito debe tener al menos un lote asociado.'
        )

    proveedor = Proveedores.objects.filter(
        ID_Proveedor=proveedor_id,
        estado_proveedor=True
    ).first()

    if not proveedor:
        return _error(
            'El proveedor seleccionado no existe o está inactivo.'
        )

    # ========================================================
    # VALIDAR TODOS LOS LOTES ANTES DE GUARDAR
    # ========================================================

    lotes_validados = []
    combinaciones = set()

    for indice, datos_lote in enumerate(lotes_recibidos, start=1):

        producto_id = datos_lote.get('ID_Producto')
        numero_lote = str(
            datos_lote.get('Numero_lote', '')
        ).strip()

        vencimiento = _fecha_valida(
            datos_lote.get('Fecha_vencimiento')
        )

        try:
            cajas = int(datos_lote.get('Cantidad_cajas'))
            unidades_caja = int(
                datos_lote.get('Unidades_por_caja')
            )
        except (ValueError, TypeError):
            return _error(
                f'Revisá las cantidades del lote {indice}.'
            )

        if not all([
            producto_id,
            numero_lote,
            vencimiento
        ]):
            return _error(
                f'Completá todos los datos del lote {indice}.'
            )

        if len(numero_lote) > 50:
            return _error(
                f'El número del lote {indice} supera los 50 caracteres.'
            )

        if cajas <= 0 or unidades_caja <= 0:
            return _error(
                f'Las cantidades del lote {indice} deben ser mayores a cero.'
            )

        if vencimiento < hoy:
            return _error(
                f'El lote {numero_lote} ya está vencido.'
            )

        if vencimiento < fecha_remito:
            return _error(
                f'El vencimiento del lote {numero_lote} no puede ser '
                'anterior a la fecha del remito.'
            )

        producto = Productos.objects.filter(
            ID_Producto=producto_id,
            Estado_producto='Activo'
        ).first()

        if not producto:
            return _error(
                f'El producto del lote {indice} no existe o está inactivo.'
            )

        # El producto debe pertenecer a los proveedores asociados.
        if not producto.proveedores.filter(
            pk=proveedor.pk
        ).exists():
            return _error(
                f'El producto "{producto.Nombre_producto}" no es '
                f'suministrado por "{proveedor.nombre_proveedor}".'
            )

        combinacion = (
            producto.pk,
            numero_lote.lower()
        )

        if combinacion in combinaciones:
            return _error(
                'No podés repetir el número de lote para el mismo producto.'
            )

        if Lotes.objects.filter(
            ID_Producto=producto,
            Numero_lote__iexact=numero_lote
        ).exists():
            return _error(
                f'El lote "{numero_lote}" ya existe para '
                f'"{producto.Nombre_producto}".'
            )

        combinaciones.add(combinacion)

        cantidad = cajas * unidades_caja

        lotes_validados.append({
            'producto': producto,
            'numero': numero_lote,
            'vencimiento': vencimiento,
            'cajas': cajas,
            'unidades_caja': unidades_caja,
            'cantidad': cantidad,
        })

    # Verificar tipo de movimiento
    tipo_entrada = TiposMovimientos.objects.filter(
        Nombre_tipo_movimiento__iexact=TIPO_ENTRADA
    ).first()

    if not tipo_entrada:
        return _error(
            'Falta registrar el tipo de movimiento "Entrada de lote".',
            status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # ========================================================
    # GUARDAR REMITO, LOTES, STOCK Y MOVIMIENTOS
    # ========================================================

    try:

        with transaction.atomic():

            remito = Remitos.objects.create(
                ID_Proveedor=proveedor,
                Numero_remito=numero_remito,
                Fecha_remito=fecha_remito
            )

            registrar_auditoria(
                usuario,
                'Remitos',
                remito,
                'CREACION',
                {},
                dict(
                    snapshot(remito),
                    Cantidad_lotes=len(lotes_validados)
                )
            )

            for datos_lote in lotes_validados:

                lote = Lotes.objects.create(
                    ID_Remito=remito,
                    ID_Producto=datos_lote['producto'],
                    Numero_lote=datos_lote['numero'],
                    Cantidad_cajas=datos_lote['cajas'],
                    Unidades_por_caja=datos_lote['unidades_caja'],
                    Cantidad_ingresada=datos_lote['cantidad'],
                    Cantidad_actual=datos_lote['cantidad'],
                    Fecha_ingreso=hoy,
                    Fecha_vencimiento=datos_lote['vencimiento']
                )

                stock, creado = Stock.objects.select_for_update().get_or_create(
                    ID_Producto=datos_lote['producto'],
                    defaults={
                        'Cantidad_stock': 0,
                        'Stock_minimo': 10
                    }
                )

                stock_antes = stock.Cantidad_stock

                stock.Cantidad_stock += datos_lote['cantidad']

                stock.save(
                    update_fields=['Cantidad_stock']
                )

                MovimientosStock.objects.create(
                    ID_Usuario=usuario,
                    ID_Tipo_movimiento=tipo_entrada,
                    ID_Lote=lote,
                    Cantidad_movimiento_stock=datos_lote['cantidad'],
                    Observaciones=(
                        f'Entrada por remito {numero_remito}'
                    )
                )

                registrar_auditoria(
                    usuario,
                    'Lotes',
                    lote,
                    'INGRESO_LOTE',
                    {},
                    dict(
                        snapshot(lote),
                        Stock_antes=stock_antes,
                        Stock_despues=stock.Cantidad_stock
                    )
                )

        return Response({
            'ok': True,
            'mensaje': (
                'El remito, sus lotes, el stock y los movimientos '
                'se registraron correctamente.'
            ),
            'remito': _serializar_remito(remito)
        }, status=status.HTTP_201_CREATED)

    except IntegrityError:
        return _error(
            'El número de remito ya existe para ese proveedor '
            'o uno de los lotes está duplicado.',
            status.HTTP_409_CONFLICT
        )

    except DatabaseError:
        return _error(
            'Ocurrió un error en la base de datos. No se guardaron los cambios.',
            status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ============================================================
# CONSULTAR, EDITAR Y ANULAR UN REMITO
# ============================================================

@api_view(['GET', 'PATCH', 'POST'])
def remito_detalle(request, pk):

    usuario = _usuario_actual(request)

    if not usuario:
        return _error(
            'La sesión no es válida. Iniciá sesión nuevamente.',
            status.HTTP_401_UNAUTHORIZED
        )

    # ========================================================
    # CONSULTAR DETALLE
    # ========================================================

    if request.method == 'GET':

        if not puede(usuario, 'remitos'):
            return _error(
                'No tenés permiso para consultar remitos.',
                status.HTTP_403_FORBIDDEN
            )

        remito = Remitos.objects.select_related(
            'ID_Proveedor',
            'ID_Usuario_anulacion'
        ).filter(
            ID_Remito=pk
        ).first()

        if not remito:
            return _error(
                'El remito seleccionado no existe.',
                status.HTTP_404_NOT_FOUND
            )

        return Response({
            'ok': True,
            'remito': _serializar_remito(remito)
        })

    # ========================================================
    # CONTROL DE PERMISOS PARA MODIFICACIONES
    # ========================================================

    if not puede(usuario, 'remitos', gestionar=True):
        return _error(
            'No tenés permiso para gestionar remitos.',
            status.HTTP_403_FORBIDDEN
        )

    datos = request.data

    # ========================================================
    # PATCH: EDITAR DATOS DEL REMITO
    # ========================================================

    if request.method == 'PATCH':

        numero = str(
            datos.get('Numero_remito', '')
        ).strip()

        fecha = _fecha_valida(
            datos.get('Fecha_remito')
        )

        if not numero or not fecha:
            return _error(
                'Completá el número y la fecha del remito.'
            )

        if len(numero) > 20:
            return _error(
                'El número de remito no puede superar los 20 caracteres.'
            )

        if fecha > timezone.localdate():
            return _error(
                'La fecha del remito no puede ser futura.'
            )

        try:

            with transaction.atomic():

                remito = Remitos.objects.select_for_update().select_related(
                    'ID_Proveedor'
                ).get(
                    ID_Remito=pk
                )

                if remito.Estado_remito == 'Anulado':
                    return _error(
                        'No se puede modificar un remito anulado.'
                    )

                antes = snapshot(remito)

                remito.Numero_remito = numero
                remito.Fecha_remito = fecha

                remito.save(
                    update_fields=[
                        'Numero_remito',
                        'Fecha_remito'
                    ]
                )

                registrar_auditoria(
                    usuario,
                    'Remitos',
                    remito,
                    'MODIFICACION',
                    antes,
                    snapshot(remito)
                )

            return Response({
                'ok': True,
                'mensaje': 'El remito se actualizó correctamente.',
                'remito': _serializar_remito(remito)
            })

        except Remitos.DoesNotExist:
            return _error(
                'El remito seleccionado no existe.',
                status.HTTP_404_NOT_FOUND
            )

        except IntegrityError:
            return _error(
                'Ya existe otro remito con ese número para el proveedor.',
                status.HTTP_409_CONFLICT
            )

        except DatabaseError:
            return _error(
                'Ocurrió un error al modificar el remito.',
                status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # ========================================================
    # POST: ACCIONES SOBRE EL REMITO
    # ========================================================

    accion = datos.get('accion', '')

    # ========================================================
    # EDITAR LOTE ASOCIADO
    # ========================================================

    if accion == 'editar_lote':

        lote_id = datos.get('ID_Lote')
        producto_id = datos.get('ID_Producto')

        numero_lote = str(
            datos.get('Numero_lote', '')
        ).strip()

        try:
            cajas = int(datos.get('Cantidad_cajas'))
            unidades_caja = int(datos.get('Unidades_por_caja'))
            cantidad_actual = int(datos.get('Cantidad_actual'))

        except (ValueError, TypeError):
            return _error(
                'Las cantidades ingresadas no son válidas.'
            )

        fecha_ingreso = _fecha_valida(
            datos.get('Fecha_ingreso')
        )

        fecha_vencimiento = _fecha_valida(
            datos.get('Fecha_vencimiento')
        )

        if not all([
            lote_id,
            producto_id,
            numero_lote,
            fecha_ingreso,
            fecha_vencimiento
        ]):
            return _error(
                'Completá todos los campos del lote.'
            )

        if len(numero_lote) > 50:
            return _error(
                'El número de lote no puede superar los 50 caracteres.'
            )

        if cajas <= 0 or unidades_caja <= 0:
            return _error(
                'Las cantidades deben ser mayores a cero.'
            )

        cantidad_ingresada = cajas * unidades_caja

        if not 0 <= cantidad_actual <= cantidad_ingresada:
            return _error(
                'La cantidad actual debe estar entre cero '
                'y la cantidad ingresada.'
            )

        hoy = timezone.localdate()

        if fecha_ingreso > hoy:
            return _error(
                'La fecha de ingreso no puede ser futura.'
            )

        if fecha_vencimiento < fecha_ingreso:
            return _error(
                'El vencimiento no puede ser anterior al ingreso.'
            )

        try:

            with transaction.atomic():

                remito = Remitos.objects.select_for_update().get(
                    ID_Remito=pk
                )

                if remito.Estado_remito == 'Anulado':
                    return _error(
                        'No se puede modificar un lote de un remito anulado.'
                    )

                lote = Lotes.objects.select_for_update().select_related(
                    'ID_Producto',
                    'ID_Remito'
                ).get(
                    ID_Lote=lote_id,
                    ID_Remito=remito
                )

                producto = Productos.objects.filter(
                    ID_Producto=producto_id,
                    Estado_producto='Activo'
                ).first()

                if not producto:
                    return _error(
                        'El producto seleccionado no existe o está inactivo.'
                    )

                duplicado = Lotes.objects.filter(
                    ID_Producto=producto,
                    Numero_lote__iexact=numero_lote
                ).exclude(
                    ID_Lote=lote.ID_Lote
                ).exists()

                if duplicado:
                    return _error(
                        'Ya existe ese número de lote para el producto.'
                    )

                tipo_entrada = TiposMovimientos.objects.filter(
                    Nombre_tipo_movimiento__iexact=TIPO_ENTRADA
                ).first()

                if not tipo_entrada:
                    return _error(
                        'No existe el tipo de movimiento de entrada.',
                        status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

                entrada = MovimientosStock.objects.select_for_update().filter(
                    ID_Lote=lote,
                    ID_Tipo_movimiento=tipo_entrada
                ).first()

                if not entrada:
                    return _error(
                        'No se encontró el movimiento de entrada del lote.'
                    )

                otros_movimientos = MovimientosStock.objects.filter(
                    ID_Lote=lote
                ).exclude(
                    ID_Movimiento_stock=entrada.ID_Movimiento_stock
                ).exists()

                cambio_producto = (
                    lote.ID_Producto_id != producto.pk
                )

                if cambio_producto:
                    return _error(
                        'No se puede cambiar el producto de un lote '
                        'que ya tiene un movimiento de entrada registrado.'
                    )

                cambio_cantidades = (
                    lote.Cantidad_ingresada != cantidad_ingresada
                    or lote.Cantidad_actual != cantidad_actual
                )

                if otros_movimientos and cambio_cantidades:
                    return _error(
                        'No se pueden modificar las cantidades porque '
                        'el lote tiene otros movimientos registrados.'
                    )

                if cambio_cantidades and (
                    lote.Cantidad_actual != lote.Cantidad_ingresada
                ):
                    return _error(
                        'No se pueden corregir las cantidades porque '
                        'el lote ya tuvo salidas.'
                    )

                antes = snapshot(lote)

                if cambio_cantidades:
                    cantidad_actual = cantidad_ingresada

                    stock = Stock.objects.select_for_update().filter(
                        ID_Producto=lote.ID_Producto
                    ).first()

                    if not stock:
                        return _error(
                            'No se encontró el stock del producto.'
                        )

                    diferencia = (
                        cantidad_ingresada - lote.Cantidad_ingresada
                    )

                    if stock.Cantidad_stock + diferencia < 0:
                        return _error(
                            'La corrección dejaría el stock general en negativo.'
                        )

                    stock.Cantidad_stock += diferencia

                    stock.save(
                        update_fields=['Cantidad_stock']
                    )

                    entrada.Cantidad_movimiento_stock = cantidad_ingresada

                    entrada.save(
                        update_fields=['Cantidad_movimiento_stock']
                    )

                else:
                    cantidad_actual = lote.Cantidad_actual

                lote.ID_Producto = producto
                lote.Numero_lote = numero_lote
                lote.Cantidad_cajas = cajas
                lote.Unidades_por_caja = unidades_caja
                lote.Cantidad_ingresada = cantidad_ingresada
                lote.Cantidad_actual = cantidad_actual
                lote.Fecha_ingreso = fecha_ingreso
                lote.Fecha_vencimiento = fecha_vencimiento

                lote.save()

                registrar_auditoria(
                    usuario,
                    'Lotes',
                    lote,
                    'MODIFICACION',
                    antes,
                    snapshot(lote)
                )

            return Response({
                'ok': True,
                'mensaje': 'Los datos del lote se actualizaron correctamente.',
                'lote': _serializar_lote(lote)
            })

        except Lotes.DoesNotExist:
            return _error(
                'El lote no existe o no pertenece a este remito.',
                status.HTTP_404_NOT_FOUND
            )

        except DatabaseError:
            return _error(
                'Ocurrió un error al actualizar el lote.',
                status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # ========================================================
    # ANULAR REMITO
    # ========================================================

    if accion == 'anular_remito':

        if not puede_accion(usuario, 'anular_remitos'):
            return _error(
                'No tenés permiso para anular remitos.',
                status.HTTP_403_FORBIDDEN
            )

        motivo = str(
            datos.get('Motivo_anulacion', '')
        ).strip()

        if len(motivo) < 10:
            return _error(
                'La justificación debe tener al menos 10 caracteres.'
            )

        if len(motivo) > 200:
            return _error(
                'La justificación no puede superar los 200 caracteres.'
            )

        try:

            with transaction.atomic():

                remito = Remitos.objects.select_for_update().get(
                    ID_Remito=pk
                )

                if remito.Estado_remito == 'Anulado':
                    return _error(
                        'El remito ya se encuentra anulado.'
                    )

                lotes_remito = list(
                    Lotes.objects.select_for_update().select_related(
                        'ID_Producto'
                    ).filter(
                        ID_Remito=remito
                    )
                )

                stocks = {}

                # Validar todos los lotes antes de modificar el stock.
                for lote in lotes_remito:

                    if lote.Cantidad_actual != lote.Cantidad_ingresada:
                        return _error(
                            f'No se puede anular: el lote '
                            f'"{lote.Numero_lote}" ya tuvo salidas.'
                        )

                    stock = stocks.get(
                        lote.ID_Producto_id
                    )

                    if stock is None:
                        stock = Stock.objects.select_for_update().filter(
                            ID_Producto=lote.ID_Producto
                        ).first()

                        stocks[lote.ID_Producto_id] = stock

                    if not stock:
                        return _error(
                            f'No se encontró el stock de '
                            f'"{lote.ID_Producto.Nombre_producto}".'
                        )

                tipo_anulacion, _ = TiposMovimientos.objects.get_or_create(
                    Nombre_tipo_movimiento=TIPO_ANULACION_REMITO
                )

                antes = snapshot(remito)

                # Revertir cada ingreso.
                for lote in lotes_remito:

                    stock = stocks[lote.ID_Producto_id]

                    stock.Cantidad_stock -= lote.Cantidad_ingresada

                    stock.save(
                        update_fields=['Cantidad_stock']
                    )

                    MovimientosStock.objects.create(
                        ID_Usuario=usuario,
                        ID_Tipo_movimiento=tipo_anulacion,
                        ID_Lote=lote,
                        Cantidad_movimiento_stock=lote.Cantidad_ingresada,
                        Observaciones=(
                            f'Anulación del remito '
                            f'{remito.Numero_remito}: {motivo}'
                        )[:255]
                    )

                    lote.Cantidad_actual = 0

                    lote.save(
                        update_fields=['Cantidad_actual']
                    )

                # Actualizar cabecera.
                remito.Estado_remito = 'Anulado'
                remito.Fecha_anulacion = timezone.now()
                remito.Motivo_anulacion = motivo
                remito.ID_Usuario_anulacion = usuario

                remito.save(
                    update_fields=[
                        'Estado_remito',
                        'Fecha_anulacion',
                        'Motivo_anulacion',
                        'ID_Usuario_anulacion',
                    ]
                )

                despues = snapshot(remito)

                despues['Lotes_revertidos'] = '; '.join(
                    (
                        f'{lote.ID_Producto.Nombre_producto} '
                        f'lote {lote.Numero_lote}: '
                        f'{lote.Cantidad_ingresada} unidades'
                    )
                    for lote in lotes_remito
                )

                registrar_auditoria(
                    usuario,
                    'Remitos',
                    remito,
                    'ANULACION',
                    antes,
                    despues
                )

            return Response({
                'ok': True,
                'mensaje': (
                    f'El remito {remito.Numero_remito} fue anulado '
                    'y se revirtió su ingreso de stock.'
                ),
                'remito': _serializar_remito(remito)
            })

        except Remitos.DoesNotExist:
            return _error(
                'El remito seleccionado no existe.',
                status.HTTP_404_NOT_FOUND
            )

        except DatabaseError:
            return _error(
                'Ocurrió un error en la base de datos. '
                'No se pudo anular el remito.',
                status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    return _error(
        'La operación solicitada no es válida.'
    )