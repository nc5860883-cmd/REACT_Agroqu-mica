"""
API JSON de Lotes, Movimientos de stock y Alertas para React.
Mismas reglas que views.py. Errores con la forma {"error": "mensaje"}.
"""
from datetime import timedelta

from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .api import _error, _texto
from .api_auth import permiso_modulo
from .auditoria import registrar_auditoria, snapshot
from .models import (
    Alertas, Lotes, MovimientosStock, Productos, TiposMovimientos, Usuarios,
)
from .permissions import puede, puede_accion
from .views import (
    TIPO_ANULACION_REMITO,
    TIPO_EGRESO,
    _fecha_iso,
    generar_alertas_vencimiento,
)

TIPO_ENTRADA = 'Entrada de lote'

TIPOS_VISIBLES = [
    TIPO_ENTRADA,
    'Salida por vencimiento de producto',
    TIPO_EGRESO,
    TIPO_ANULACION_REMITO,
]


def _nombre(usuario):
    if not usuario:
        return ''

    return f'{usuario.Apellido_usuario} {usuario.Nombre_usuario}'


# ============================================================
# LOTES (solo consulta)
# ============================================================

@api_view(['GET'])
@permission_classes([permiso_modulo('lotes')])
def lotes(request):
    hoy = timezone.localdate()

    consulta = Lotes.objects.select_related(
        'ID_Producto',
        'ID_Remito',
        'ID_Remito__ID_Proveedor',
    ).order_by('-Fecha_ingreso', '-ID_Lote')

    return Response({
        'hoy': hoy.isoformat(),
        'limite': (hoy + timedelta(days=30)).isoformat(),
        'lotes': [
            {
                'id': l.ID_Lote,
                'numero': l.Numero_lote,
                'producto': l.ID_Producto.Nombre_producto,
                'marca': l.ID_Producto.Marca or '',
                'remito': l.ID_Remito.Numero_remito,
                'proveedor': l.ID_Remito.ID_Proveedor.nombre_proveedor,
                'ingreso': l.Fecha_ingreso.isoformat(),
                'vencimiento': l.Fecha_vencimiento.isoformat(),
                'cantidad_ingresada': l.Cantidad_ingresada,
                'cantidad_actual': l.Cantidad_actual,
            }
            for l in consulta
        ],
    })


# ============================================================
# MOVIMIENTOS DE STOCK (solo consulta)
# ============================================================

@api_view(['GET'])
@permission_classes([permiso_modulo('movimientos')])
def movimientos(request):
    for nombre in TIPOS_VISIBLES:
        TiposMovimientos.objects.get_or_create(Nombre_tipo_movimiento=nombre)

    consulta = MovimientosStock.objects.select_related(
        'ID_Usuario',
        'ID_Tipo_movimiento',
        'ID_Lote',
        'ID_Lote__ID_Producto',
    ).filter(
        ID_Tipo_movimiento__Nombre_tipo_movimiento__in=TIPOS_VISIBLES
    ).order_by('-Fecha_hora_movimiento')

    return Response({
        'tipos': [
            {'id': t.ID_Tipo_movimiento, 'nombre': t.Nombre_tipo_movimiento}
            for t in TiposMovimientos.objects.filter(
                Nombre_tipo_movimiento__in=TIPOS_VISIBLES
            ).order_by('Nombre_tipo_movimiento')
        ],
        'puede_comprobante': puede(request.user, 'comprobantes', gestionar=True),
        'movimientos': [
            {
                'id': m.ID_Movimiento_stock,
                'fecha': timezone.localtime(m.Fecha_hora_movimiento).isoformat(),
                'producto': m.ID_Lote.ID_Producto.Nombre_producto if m.ID_Lote else '',
                'lote': m.ID_Lote.Numero_lote if m.ID_Lote else '',
                'tipo_id': m.ID_Tipo_movimiento_id,
                'tipo': m.ID_Tipo_movimiento.Nombre_tipo_movimiento,
                'cantidad': m.Cantidad_movimiento_stock,
                'usuario': _nombre(m.ID_Usuario),
                'observaciones': m.Observaciones or '',
            }
            for m in consulta
        ],
    })


# ============================================================
# HISTORIAL DE ALERTAS
# ============================================================

def _lote_id_de(mensaje):
    """Las alertas de vencimiento guardan el lote como [LOTE_ID:n]."""

    try:
        return int(mensaje.rsplit('[LOTE_ID:', 1)[1].split(']', 1)[0])
    except (IndexError, ValueError):
        return None


@api_view(['GET'])
@permission_classes([permiso_modulo('alertas')])
def alertas(request):
    """
    GET /api/alertas/?tipo=&producto=&usuario=&fecha_desde=&fecha_hasta=
    """

    generar_alertas_vencimiento()

    tipo = _texto(request.query_params.get('tipo'))
    producto = _texto(request.query_params.get('producto'))
    usuario_id = _texto(request.query_params.get('usuario'))
    desde = _fecha_iso(_texto(request.query_params.get('fecha_desde')))
    hasta = _fecha_iso(_texto(request.query_params.get('fecha_hasta')))

    consulta = Alertas.objects.select_related(
        'ID_Stock__ID_Producto', 'ID_Usuario'
    ).order_by('-Fecha_hora_historial_alerta')

    if tipo:
        consulta = consulta.filter(Tipo_alerta=tipo)

    if producto.isdigit():
        consulta = consulta.filter(ID_Stock__ID_Producto_id=producto)

    if usuario_id.isdigit():
        consulta = consulta.filter(ID_Usuario_id=usuario_id)

    if desde:
        consulta = consulta.filter(Fecha_hora_historial_alerta__date__gte=desde)

    if hasta:
        consulta = consulta.filter(Fecha_hora_historial_alerta__date__lte=hasta)

    lista = list(consulta)

    ids_lotes = {
        _lote_id_de(a.Mensaje)
        for a in lista if a.Tipo_alerta == 'Vencimiento'
    } - {None}

    lotes_por_id = {
        l.ID_Lote: l for l in Lotes.objects.filter(ID_Lote__in=ids_lotes)
    }

    filas = []

    for a in lista:
        lote = None
        mensaje = a.Mensaje

        if a.Tipo_alerta == 'Vencimiento':
            lote = lotes_por_id.get(_lote_id_de(mensaje))
            mensaje = mensaje.split(' [LOTE_ID:', 1)[0]

        filas.append({
            'id': a.ID_Historial_alerta,
            'tipo': a.Tipo_alerta,
            'producto': a.ID_Stock.ID_Producto.Nombre_producto,
            'lote': lote.Numero_lote if lote else '',
            'mensaje': mensaje,
            'fecha': timezone.localtime(a.Fecha_hora_historial_alerta).isoformat(),
            'cantidad': a.Cantidad_al_generar,
            'stock_minimo': a.Stock_minimo_al_generar,
            'atendida': a.Atendida,
            'usuario': _nombre(a.ID_Usuario),
            'fecha_atencion': (
                timezone.localtime(a.Fecha_hora_atencion).isoformat()
                if a.Fecha_hora_atencion else None
            ),
        })

    return Response({
        'alertas': filas,
        'puede_atender': puede_accion(request.user, 'atender_alertas'),
        'productos': [
            {'id': p.ID_Producto, 'nombre': p.Nombre_producto}
            for p in Productos.objects.filter(
                Estado_producto='Activo'
            ).order_by('Nombre_producto')
        ],
        'usuarios': [
            {'id': u.ID_Usuario, 'nombre': f'{u.Apellido_usuario}, {u.Nombre_usuario}'}
            for u in Usuarios.objects.filter(
                Estado_usuario=True
            ).order_by('Apellido_usuario', 'Nombre_usuario')
        ],
    })


@api_view(['POST'])
def atender_alerta(request, pk):
    """POST /api/alertas/<id>/atender/ (permiso propio, no de módulo)"""

    usuario = request.user

    if not puede_accion(usuario, 'atender_alertas'):
        return _error(
            'No tenés permiso para atender alertas.',
            status.HTTP_403_FORBIDDEN,
        )

    alerta = Alertas.objects.filter(ID_Historial_alerta=pk).first()

    if alerta is None:
        return _error('La alerta no existe.', status.HTTP_404_NOT_FOUND)

    if alerta.Atendida:
        return Response({'mensaje': 'La alerta ya estaba atendida.'})

    antes = snapshot(alerta)

    alerta.Atendida = True
    alerta.ID_Usuario = usuario
    alerta.Fecha_hora_atencion = timezone.now()
    alerta.save(update_fields=['Atendida', 'ID_Usuario', 'Fecha_hora_atencion'])

    registrar_auditoria(
        usuario, 'Historial de alertas', alerta, 'MODIFICACION',
        antes, snapshot(alerta),
    )

    return Response({'mensaje': 'La alerta fue marcada como atendida.'})