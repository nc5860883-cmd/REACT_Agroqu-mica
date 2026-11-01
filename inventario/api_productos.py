"""
API JSON de Productos y Egresos para el frontend en React.

Reutiliza las validaciones de views.py (_leer_datos_producto,
_producto_duplicado, _datos_egreso, _alerta_stock_bajo), así las
reglas son las mismas en las pantallas Django y en React.

Errores con la misma forma que api.py: {"error": "mensaje"}.
"""
from django.db import DatabaseError, transaction
from django.db.models import Prefetch, ProtectedError
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .api import _error
from .api_auth import permiso_modulo
from .auditoria import snapshot, registrar_auditoria
from .models import (
    Lotes,
    MovimientosStock,
    Productos,
    Proveedores,
    Stock,
    Subtipos,
    TiposMovimientos,
    TiposProductos,
)
from .permissions import puede
from .views import (
    TIPO_EGRESO,
    _alerta_stock_bajo,
    _datos_egreso,
    _leer_datos_producto,
    _producto_duplicado,
)


# ============================================================
# ADAPTADOR: request.data (JSON) -> request.POST
# _leer_datos_producto() de views.py lee request.POST.get(...) y
# request.POST.getlist(...). Esto le da la misma "forma" al JSON.
# ============================================================

class _Campos:
    def __init__(self, datos):
        self._datos = datos or {}

    def get(self, clave, defecto=''):
        valor = self._datos.get(clave, defecto)
        return defecto if valor is None else str(valor)

    def getlist(self, clave):
        valor = self._datos.get(clave) or []

        if not isinstance(valor, (list, tuple)):
            valor = [valor]

        return [str(v) for v in valor]


class _ComoFormulario:
    def __init__(self, request):
        self.POST = _Campos(request.data)


def _sin_permiso_gestion(usuario, modulo):
    return not puede(usuario, modulo, gestionar=True)


# ============================================================
# SERIALIZACIÓN
# ============================================================

def _serializar_lote(lote):
    remito = lote.ID_Remito
    proveedor = remito.ID_Proveedor if remito else None

    return {
        'id': lote.ID_Lote,
        'numero': lote.Numero_lote,
        'remito': remito.Numero_remito if remito else '',
        'proveedor': proveedor.nombre_proveedor if proveedor else '',
        'vencimiento': (
            lote.Fecha_vencimiento.isoformat()
            if lote.Fecha_vencimiento else None
        ),
        'cantidad_ingresada': lote.Cantidad_ingresada,
        'cantidad_actual': lote.Cantidad_actual,
        'estado': getattr(lote, 'estado_actual', ''),
    }


def _serializar_producto(p):
    stock = getattr(p, 'stock', None)
    subtipo = p.ID_Subtipo

    return {
        'id': p.ID_Producto,
        'nombre': p.Nombre_producto,
        'marca': p.Marca or '',
        'descripcion': p.Descripcion_producto or '',
        'precio': float(p.Precio),
        'cantidad_presentacion': (
            float(p.Cantidad_presentacion)
            if p.Cantidad_presentacion is not None else None
        ),
        'unidad_medida': p.Unidad_medida_producto or '',
        'unidades_por_presentacion': p.Unidades_por_presentacion,
        'estado': p.Estado_producto,
        'tipo_id': p.ID_Tipo_producto.ID_Tipo_producto,
        'tipo_nombre': p.ID_Tipo_producto.Nombre_tipo_producto,
        'subtipo_id': subtipo.ID_Subtipo if subtipo else None,
        'subtipo_nombre': subtipo.Nombre_subtipo if subtipo else None,
        'proveedores_ids': [prov.ID_Proveedor for prov in p.proveedores.all()],
        'stock': {
            'cantidad': stock.Cantidad_stock,
            'minimo': stock.Stock_minimo,
        } if stock else None,
        'lotes': [
            _serializar_lote(l)
            for l in getattr(p, 'lotes_ordenados', [])
        ],
    }


def _consulta_productos():
    """La misma consulta que gestion_productos() en views.py."""

    return Productos.objects.select_related(
        'ID_Tipo_producto',
        'ID_Subtipo',
        'stock',
    ).prefetch_related(
        'proveedores',
        Prefetch(
            'lotes',
            queryset=Lotes.objects.select_related(
                'ID_Remito',
                'ID_Remito__ID_Proveedor',
            ).order_by('Fecha_vencimiento', 'Numero_lote'),
            to_attr='lotes_ordenados',
        ),
    ).order_by('Nombre_producto')


# ============================================================
# PRODUCTOS
# ============================================================

@ensure_csrf_cookie
@api_view(['GET', 'POST'])
@permission_classes([permiso_modulo('productos')])
def productos(request):
    """
    GET  /api/productos/   todo lo que necesita la pantalla
    POST /api/productos/   crea un producto (stock inicial 0)
    """

    if request.method == 'GET':
        return _listar_productos(request)

    return _crear_producto(request)


@api_view(['PUT', 'DELETE'])
@permission_classes([permiso_modulo('productos')])
def producto_detalle(request, pk):
    """
    PUT    /api/productos/<id>/   edita el producto
    DELETE /api/productos/<id>/   elimina (solo si no tiene lotes)
    """

    if request.method == 'PUT':
        return _editar_producto(request, pk)

    return _eliminar_producto(request, pk)


def _listar_productos(request):
    usuario = request.user
    puede_egresar = puede(usuario, 'egresos', gestionar=True)

    return Response({
        'productos': [
            _serializar_producto(p) for p in _consulta_productos()
        ],
        'tipos': [
            {
                'id': t.ID_Tipo_producto,
                'nombre': t.Nombre_tipo_producto,
                'activo': t.Estado_tipo_producto,
            }
            for t in TiposProductos.objects.order_by('Nombre_tipo_producto')
        ],
        'subtipos': [
            {
                'id': s.ID_Subtipo,
                'nombre': s.Nombre_subtipo,
                'tipo_id': s.ID_Tipo_producto_id,
            }
            for s in Subtipos.objects.order_by('Nombre_subtipo')
        ],
        'proveedores': [
            {'id': prov.ID_Proveedor, 'nombre': prov.nombre_proveedor}
            for prov in Proveedores.objects.filter(
                estado_proveedor=True
            ).order_by('nombre_proveedor')
        ],
        'puede_gestionar': puede(usuario, 'productos', gestionar=True),
        'puede_egresar': puede_egresar,
        'datos_egreso': _datos_egreso() if puede_egresar else [],
        'usuario': {
            'nombre': usuario.Nombre_usuario,
            'apellido': usuario.Apellido_usuario,
            'perfil': usuario.ID_Perfil.Nombre_perfil,
        },
    })


def _crear_producto(request):
    usuario = request.user

    if _sin_permiso_gestion(usuario, 'productos'):
        return _error(
            'No tenés permiso para gestionar productos.',
            status.HTTP_403_FORBIDDEN,
        )

    datos, error = _leer_datos_producto(_ComoFormulario(request), 'Activo')

    if error:
        return _error(error)

    if _producto_duplicado(
        datos['nombre'],
        datos['marca'],
        datos['cantidad_presentacion'],
        datos['unidades_por_presentacion'],
    ):
        return _error('Ya existe un producto con esos datos.')

    with transaction.atomic():
        producto = Productos.objects.create(
            ID_Tipo_producto=datos['tipo'],
            ID_Subtipo=datos['subtipo'],
            Marca=datos['marca'],
            Nombre_producto=datos['nombre'],
            Descripcion_producto=datos['descripcion'],
            Precio=datos['precio'],
            Cantidad_presentacion=datos['cantidad_presentacion'],
            Unidades_por_presentacion=datos['unidades_por_presentacion'],
            Unidad_medida_producto=datos['unidad_medida'],
            Estado_producto=datos['estado_producto'],
        )

        producto.proveedores.set(datos['proveedores'])

        # El stock inicial es cero; las entradas se hacen con lotes.
        stock, _ = Stock.objects.get_or_create(
            ID_Producto=producto,
            defaults={
                'Cantidad_stock': 0,
                'Stock_minimo': datos['stock_minimo'] or 0,
            },
        )

        despues = snapshot(producto)
        despues['Stock_minimo'] = stock.Stock_minimo

        registrar_auditoria(
            usuario=usuario,
            entidad='Productos',
            objeto=producto,
            accion='CREACION',
            antes={},
            despues=despues,
        )

    return Response(
        {
            'mensaje': 'Producto registrado correctamente.',
            'id': producto.ID_Producto,
        },
        status=status.HTTP_201_CREATED,
    )


def _editar_producto(request, pk):
    usuario = request.user

    if _sin_permiso_gestion(usuario, 'productos'):
        return _error(
            'No tenés permiso para gestionar productos.',
            status.HTTP_403_FORBIDDEN,
        )

    producto = Productos.objects.filter(ID_Producto=pk).first()

    if producto is None:
        return _error('El producto no existe.', status.HTTP_404_NOT_FOUND)

    # Auditoría: foto antes del cambio (incluye stock mínimo).
    stock_previo = Stock.objects.filter(ID_Producto=producto).first()
    antes = snapshot(producto)

    if stock_previo:
        antes['Stock_minimo'] = stock_previo.Stock_minimo

    datos, error = _leer_datos_producto(
        _ComoFormulario(request),
        producto.Estado_producto,
    )

    if error:
        return _error(error)

    if _producto_duplicado(
        datos['nombre'],
        datos['marca'],
        datos['cantidad_presentacion'],
        datos['unidades_por_presentacion'],
        excluir_pk=pk,
    ):
        return _error('Ya existe otro producto con esos datos.')

    with transaction.atomic():
        producto.ID_Tipo_producto = datos['tipo']
        producto.ID_Subtipo = datos['subtipo']
        producto.Marca = datos['marca']
        producto.Nombre_producto = datos['nombre']
        producto.Descripcion_producto = datos['descripcion']
        producto.Precio = datos['precio']
        producto.Cantidad_presentacion = datos['cantidad_presentacion']
        producto.Unidades_por_presentacion = datos['unidades_por_presentacion']
        producto.Unidad_medida_producto = datos['unidad_medida']
        producto.Estado_producto = datos['estado_producto']
        producto.save()

        producto.proveedores.set(datos['proveedores'])

        # Actualiza el stock mínimo sin tocar el stock actual.
        if datos['stock_minimo'] is not None:
            stock, creado = Stock.objects.get_or_create(
                ID_Producto=producto,
                defaults={
                    'Cantidad_stock': 0,
                    'Stock_minimo': datos['stock_minimo'],
                },
            )

            if not creado:
                stock.Stock_minimo = datos['stock_minimo']
                stock.save(update_fields=['Stock_minimo'])

        producto.refresh_from_db()
        despues = snapshot(producto)

        stock_actual = Stock.objects.filter(ID_Producto=producto).first()

        if stock_actual:
            despues['Stock_minimo'] = stock_actual.Stock_minimo

        registrar_auditoria(
            usuario,
            'Productos',
            producto,
            'MODIFICACION',
            antes,
            despues,
        )

    return Response({'mensaje': 'Producto actualizado correctamente.'})


def _eliminar_producto(request, pk):
    usuario = request.user

    if _sin_permiso_gestion(usuario, 'productos'):
        return _error(
            'No tenés permiso para gestionar productos.',
            status.HTTP_403_FORBIDDEN,
        )

    producto = Productos.objects.filter(ID_Producto=pk).first()

    if producto is None:
        return _error('El producto no existe.', status.HTTP_404_NOT_FOUND)

    nombre = producto.Nombre_producto

    if producto.lotes.exists():
        return _error(
            f'No se puede eliminar el producto "{nombre}" '
            'porque tiene lotes asociados.'
        )

    try:
        with transaction.atomic():
            antes = snapshot(producto)

            stock = Stock.objects.filter(ID_Producto=producto).first()

            if stock:
                antes['Stock_minimo'] = stock.Stock_minimo

            registrar_auditoria(
                usuario=usuario,
                entidad='Productos',
                objeto=producto,
                accion='ELIMINACION',
                antes=antes,
                despues={},
            )

            producto.delete()

    except ProtectedError:
        return _error(
            f'No se puede eliminar el producto "{nombre}" '
            'porque tiene otros registros asociados.'
        )

    return Response(
        {'mensaje': f'El producto "{nombre}" fue eliminado correctamente.'}
    )


# ============================================================
# EGRESO POR VENTA
# ============================================================

@api_view(['POST'])
@permission_classes([permiso_modulo('egresos')])
def egresos(request):
    """POST /api/egresos/   descuenta de un lote y del stock."""

    usuario = request.user

    if _sin_permiso_gestion(usuario, 'egresos'):
        return _error(
            'No tenés permiso para registrar egresos de stock.',
            status.HTTP_403_FORBIDDEN,
        )

    lote_id = str(request.data.get('lote') or '').strip()

    if not lote_id.isdigit():
        return _error('Seleccioná un lote válido.')

    try:
        cantidad = int(str(request.data.get('cantidad') or '').strip())
    except (ValueError, TypeError):
        return _error('La cantidad ingresada no es válida.')

    if cantidad <= 0:
        return _error('La cantidad debe ser mayor a cero.')

    descripcion = str(request.data.get('descripcion') or '').strip()[:200]

    lote_base = Lotes.objects.filter(ID_Lote=lote_id).first()

    if not lote_base:
        return _error('El lote seleccionado no existe.')

    tipo_egreso, _ = TiposMovimientos.objects.get_or_create(
        Nombre_tipo_movimiento=TIPO_EGRESO
    )

    hoy = timezone.localdate()

    try:
        with transaction.atomic():
            # Se bloquean stock y lote para evitar egresos simultáneos.
            stock = Stock.objects.select_for_update().filter(
                ID_Producto_id=lote_base.ID_Producto_id
            ).first()

            lote = Lotes.objects.select_for_update().get(ID_Lote=lote_id)
            producto = lote.ID_Producto

            if producto.Estado_producto != 'Activo':
                return _error('El producto está inactivo.')

            if not stock:
                return _error('El producto no tiene stock registrado.')

            if lote.Fecha_vencimiento < hoy:
                return _error('No se puede egresar de un lote vencido.')

            if cantidad > lote.Cantidad_actual:
                return _error(
                    f'El lote {lote.Numero_lote} solo tiene '
                    f'{lote.Cantidad_actual} unidades disponibles.'
                )

            if cantidad > stock.Cantidad_stock:
                return _error('La cantidad supera el stock del producto.')

            lote.Cantidad_actual -= cantidad
            lote.save(update_fields=['Cantidad_actual'])

            stock.Cantidad_stock -= cantidad
            stock.save(update_fields=['Cantidad_stock'])

            detalle = TIPO_EGRESO

            if descripcion:
                detalle = f'{TIPO_EGRESO}. {descripcion}'

            MovimientosStock.objects.create(
                ID_Usuario=usuario,
                ID_Tipo_movimiento=tipo_egreso,
                ID_Lote=lote,
                Cantidad_movimiento_stock=cantidad,
                Observaciones=detalle[:255],
            )

            stock_bajo = _alerta_stock_bajo(stock, producto)

    except DatabaseError:
        return _error(
            'Ocurrió un error en la base de datos. No se registró el egreso.',
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    advertencia = None

    if stock_bajo:
        advertencia = (
            f'Atención: "{producto.Nombre_producto}" está en o por '
            f'debajo del stock mínimo ({stock.Stock_minimo}).'
        )

    return Response({
        'mensaje': (
            f'Egreso registrado: {cantidad} unidad(es) de '
            f'"{producto.Nombre_producto}" (lote {lote.Numero_lote}). '
            f'Stock actual: {stock.Cantidad_stock}.'
        ),
        'advertencia': advertencia,
    })