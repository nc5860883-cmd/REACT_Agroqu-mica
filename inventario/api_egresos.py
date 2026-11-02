
"""
API JSON para registrar egresos de stock.
"""

from django.db import DatabaseError, transaction
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .api import _error
from .api_auth import permiso_modulo
from .auditoria import registrar_auditoria
from .models import (
    Lotes,
    MovimientosStock,
    Stock,
    TiposMovimientos,
)
from .permissions import puede
from .views import TIPO_EGRESO, _alerta_stock_bajo


@api_view(['POST'])
@permission_classes([permiso_modulo('egresos')])
def egresos(request):
    """POST /api/egresos/ descuenta de un lote y del stock."""

    usuario = request.user

    if not puede(usuario, 'egresos', gestionar=True):
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

    descripcion = str(
        request.data.get('descripcion') or ''
    ).strip()[:200]

    lote_base = Lotes.objects.filter(
        ID_Lote=lote_id
    ).first()

    if not lote_base:
        return _error('El lote seleccionado no existe.')

    tipo_egreso, _ = TiposMovimientos.objects.get_or_create(
        Nombre_tipo_movimiento=TIPO_EGRESO
    )

    hoy = timezone.localdate()

    try:
        with transaction.atomic():

            stock = Stock.objects.select_for_update().filter(
                ID_Producto_id=lote_base.ID_Producto_id
            ).first()

            lote = Lotes.objects.select_for_update().get(
                ID_Lote=lote_id
            )

            producto = lote.ID_Producto

            if producto.Estado_producto != 'Activo':
                return _error('El producto está inactivo.')

            if not stock:
                return _error(
                    'El producto no tiene stock registrado.'
                )

            if lote.Fecha_vencimiento < hoy:
                return _error(
                    'No se puede egresar de un lote vencido.'
                )

            if cantidad > lote.Cantidad_actual:
                return _error(
                    f'El lote {lote.Numero_lote} solo tiene '
                    f'{lote.Cantidad_actual} unidades disponibles.'
                )

            if cantidad > stock.Cantidad_stock:
                return _error(
                    'La cantidad supera el stock del producto.'
                )

            lote_antes = lote.Cantidad_actual
            stock_antes = stock.Cantidad_stock

            lote.Cantidad_actual -= cantidad
            lote.save(update_fields=['Cantidad_actual'])

            stock.Cantidad_stock -= cantidad
            stock.save(update_fields=['Cantidad_stock'])

            detalle = TIPO_EGRESO

            if descripcion:
                detalle = f'{TIPO_EGRESO}. {descripcion}'

            movimiento = MovimientosStock.objects.create(
                ID_Usuario=usuario,
                ID_Tipo_movimiento=tipo_egreso,
                ID_Lote=lote,
                Cantidad_movimiento_stock=cantidad,
                Observaciones=detalle[:255],
            )

            registrar_auditoria(
                usuario,
                'Movimientos de Stock',
                movimiento,
                'EGRESO_STOCK',
                {},
                {
                    'ID_Producto': producto.pk,
                    'Lote': lote.Numero_lote,
                    'Cantidad': cantidad,
                    'Lote_antes': lote_antes,
                    'Lote_despues': lote.Cantidad_actual,
                    'Stock_antes': stock_antes,
                    'Stock_despues': stock.Cantidad_stock,
                    'Observaciones': detalle[:255],
                },
            )

            stock_bajo = _alerta_stock_bajo(stock, producto)

    except DatabaseError:
        return _error(
            'Ocurrió un error en la base de datos. '
            'No se registró el egreso.',
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
            f'"{producto.Nombre_producto}" '
            f'(lote {lote.Numero_lote}). '
            f'Stock actual: {stock.Cantidad_stock}.'
        ),
        'advertencia': advertencia,
    })
