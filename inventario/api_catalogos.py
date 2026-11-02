"""
API JSON de Subtipos y Proveedores para el frontend en React.

Mismas reglas que views.py (permisos, validaciones y auditoría).
Errores con la forma {"error": "mensaje"}.
"""
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.db.models import ProtectedError, Q
from django.views.decorators.csrf import ensure_csrf_cookie

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .api import _booleano, _error, _texto
from .api_auth import permiso_modulo
from .auditoria import registrar_auditoria, snapshot
from .models import Productos, Proveedores, Subtipos, TiposProductos


# ============================================================
# SUBTIPOS
# ============================================================

def _serializar_subtipo(s):
    return {
        'id': s.ID_Subtipo,
        'nombre': s.Nombre_subtipo,
        'descripcion': s.Descripcion_subtipo or '',
        'tipo_id': s.ID_Tipo_producto_id,
        'tipo_nombre': s.ID_Tipo_producto.Nombre_tipo_producto,
    }


def _leer_subtipo(request, excluir_pk=None):
    """Valida los datos. Devuelve (datos, error)."""

    nombre = _texto(request.data.get('Nombre_subtipo'))
    descripcion = _texto(request.data.get('Descripcion_subtipo'))
    tipo_id = _texto(request.data.get('ID_Tipo_producto'))

    if not nombre:
        return None, 'Debe ingresar el nombre del subtipo.'

    if len(nombre) > 50:
        return None, 'El nombre no puede superar los 50 caracteres.'

    if len(descripcion) > 200:
        return None, 'La descripción no puede superar los 200 caracteres.'

    if not tipo_id:
        return None, 'Debe seleccionar un tipo de producto.'

    tipo = (
        TiposProductos.objects.filter(pk=tipo_id).first()
        if tipo_id.isdigit() else None
    )

    if tipo is None:
        return None, 'El tipo de producto seleccionado no existe.'

    if not tipo.Estado_tipo_producto:
        return None, (
            'No se pueden asociar subtipos a un tipo de producto inactivo.'
        )

    repetido = Subtipos.objects.filter(
        ID_Tipo_producto=tipo,
        Nombre_subtipo__iexact=nombre,
    )

    if excluir_pk is not None:
        repetido = repetido.exclude(ID_Subtipo=excluir_pk)

    if repetido.exists():
        return None, (
            'Ya existe un subtipo con ese nombre para el tipo seleccionado.'
        )

    return {
        'tipo': tipo,
        'nombre': nombre,
        'descripcion': descripcion or None,
    }, None


@ensure_csrf_cookie
@api_view(['GET', 'POST'])
@permission_classes([permiso_modulo('subtipos')])
def subtipos(request):
    """
    GET  /api/subtipos/   lista de subtipos + tipos para el formulario
    POST /api/subtipos/   crea un subtipo
    """

    if request.method == 'GET':
        lista = Subtipos.objects.select_related(
            'ID_Tipo_producto'
        ).order_by('Nombre_subtipo')

        return Response({
            'subtipos': [_serializar_subtipo(s) for s in lista],
            'tipos': [
                {
                    'id': t.ID_Tipo_producto,
                    'nombre': t.Nombre_tipo_producto,
                    'activo': t.Estado_tipo_producto,
                }
                for t in TiposProductos.objects.order_by(
                    'Nombre_tipo_producto'
                )
            ],
        })

    datos, error = _leer_subtipo(request)

    if error:
        return _error(error)

    subtipo = Subtipos.objects.create(
        ID_Tipo_producto=datos['tipo'],
        Nombre_subtipo=datos['nombre'],
        Descripcion_subtipo=datos['descripcion'],
    )
    registrar_auditoria(request.user, 'Subtipos', subtipo, 'CREACION', {}, snapshot(subtipo))


    return Response(
        {'mensaje': 'Subtipo creado correctamente.', 'id': subtipo.ID_Subtipo},
        status=status.HTTP_201_CREATED,
    )


@api_view(['PUT', 'DELETE'])
@permission_classes([permiso_modulo('subtipos')])
def subtipo_detalle(request, pk):
    """
    PUT    /api/subtipos/<id>/   edita
    DELETE /api/subtipos/<id>/   elimina (solo si no tiene productos)
    """

    subtipo = Subtipos.objects.filter(ID_Subtipo=pk).first()

    if subtipo is None:
        return _error('El subtipo no existe.', status.HTTP_404_NOT_FOUND)

    if request.method == 'PUT':
        return _editar_subtipo(request, subtipo)

    return _eliminar_subtipo(subtipo)


def _editar_subtipo(request, subtipo):
    antes = snapshot(subtipo)

    datos, error = _leer_subtipo(request, excluir_pk=subtipo.pk)

    if error:
        return _error(error)

    if (
        datos['tipo'].pk != subtipo.ID_Tipo_producto_id
        and Productos.objects.filter(ID_Subtipo=subtipo).exists()
    ):
        return _error(
            'No se puede cambiar el tipo de un subtipo que tiene '
            'productos asociados.'
        )

    subtipo.ID_Tipo_producto = datos['tipo']
    subtipo.Nombre_subtipo = datos['nombre']
    subtipo.Descripcion_subtipo = datos['descripcion']
    subtipo.save()

    registrar_auditoria(
        request.user,
        'Subtipos',
        subtipo,
        'MODIFICACION',
        antes,
        snapshot(subtipo),
    )

    return Response({'mensaje': 'Subtipo modificado correctamente.'})


def _eliminar_subtipo(subtipo):
    nombre = subtipo.Nombre_subtipo

    if Productos.objects.filter(ID_Subtipo=subtipo).exists():
        return _error(
            f'No se puede eliminar el subtipo "{nombre}": '
            'tiene productos asociados.'
        )

    try:
        with transaction.atomic():
            registrar_auditoria(request.user, 'Subtipos', subtipo, 'ELIMINACION', snapshot(subtipo), {})
            subtipo.delete()
    except ProtectedError:
        return _error(
            f'No se puede eliminar el subtipo "{nombre}": '
            'tiene registros asociados.'
        )

    return Response({'mensaje': f'El subtipo "{nombre}" fue eliminado.'})


# ============================================================
# PROVEEDORES
# ============================================================

def _serializar_proveedor(p):
    return {
        'id': p.ID_Proveedor,
        'nombre': p.nombre_proveedor,
        'telefono': p.telefono_proveedor or '',
        'email': p.email_proveedor or '',
        'direccion': p.direccion_proveedor or '',
        'activo': p.estado_proveedor,
    }


def _leer_proveedor(request):
    """Valida los datos. Devuelve (datos, error)."""

    nombre = _texto(request.data.get('nombre_proveedor'))
    telefono = _texto(request.data.get('telefono_proveedor'))
    email = _texto(request.data.get('email_proveedor'))
    direccion = _texto(request.data.get('direccion_proveedor'))

    if not nombre:
        return None, 'Debe ingresar el nombre del proveedor.'

    if len(nombre) > 150:
        return None, 'El nombre no puede superar los 150 caracteres.'

    if len(telefono) > 50:
        return None, 'El teléfono no puede superar los 50 caracteres.'

    if len(direccion) > 255:
        return None, 'La dirección no puede superar los 255 caracteres.'

    if email:
        try:
            validate_email(email)
        except ValidationError:
            return None, 'El email ingresado no es válido.'

    return {
        'nombre': nombre,
        'telefono': telefono or None,
        'email': email or None,
        'direccion': direccion or None,
    }, None


def _proveedor_duplicado(datos, excluir_pk=None):
    """Otro proveedor con el mismo nombre, teléfono, email o dirección."""

    filtros = Q(nombre_proveedor__iexact=datos['nombre'])

    if datos['telefono']:
        filtros |= Q(telefono_proveedor=datos['telefono'])

    if datos['email']:
        filtros |= Q(email_proveedor__iexact=datos['email'])

    if datos['direccion']:
        filtros |= Q(direccion_proveedor__iexact=datos['direccion'])

    consulta = Proveedores.objects.filter(filtros)

    if excluir_pk is not None:
        consulta = consulta.exclude(ID_Proveedor=excluir_pk)

    return consulta.first()


def _respuesta_duplicado(existente, otro=False):
    palabra = 'otro proveedor' if otro else 'un proveedor'

    return Response(
        {
            'error': (
                f'Ya existe {palabra} con alguno de los datos ingresados.'
            ),
            'conflicto': _serializar_proveedor(existente),
        },
        status=status.HTTP_409_CONFLICT,
    )


@ensure_csrf_cookie
@api_view(['GET', 'POST'])
@permission_classes([permiso_modulo('proveedores')])
def proveedores(request):
    """
    GET  /api/proveedores/   lista
    POST /api/proveedores/   crea (siempre activo)
    """

    if request.method == 'GET':
        return Response({
            'proveedores': [
                _serializar_proveedor(p)
                for p in Proveedores.objects.order_by('nombre_proveedor')
            ],
        })

    datos, error = _leer_proveedor(request)

    if error:
        return _error(error)

    existente = _proveedor_duplicado(datos)

    if existente:
        return _respuesta_duplicado(existente)

    proveedor = Proveedores.objects.create(
        nombre_proveedor=datos['nombre'],
        telefono_proveedor=datos['telefono'],
        email_proveedor=datos['email'],
        direccion_proveedor=datos['direccion'],
        estado_proveedor=True,
    )
    registrar_auditoria(request.user, 'Proveedores', proveedor, 'CREACION', {}, snapshot(proveedor))

    return Response(
        {
            'mensaje': 'Proveedor registrado correctamente.',
            'id': proveedor.ID_Proveedor,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['PUT', 'DELETE'])
@permission_classes([permiso_modulo('proveedores')])
def proveedor_detalle(request, pk):
    """
    PUT    /api/proveedores/<id>/   edita datos (no cambia el estado)
    DELETE /api/proveedores/<id>/   elimina (solo si no tiene remitos)
    """

    proveedor = Proveedores.objects.filter(ID_Proveedor=pk).first()

    if proveedor is None:
        return _error('El proveedor no existe.', status.HTTP_404_NOT_FOUND)

    if request.method == 'PUT':
        return _editar_proveedor(request, proveedor)

    return _eliminar_proveedor(proveedor)


def _editar_proveedor(request, proveedor):
    datos, error = _leer_proveedor(request)

    if error:
        return _error(error)

    existente = _proveedor_duplicado(datos, excluir_pk=proveedor.pk)

    if existente:
        return _respuesta_duplicado(existente, otro=True)

    antes = snapshot(proveedor)

    proveedor.nombre_proveedor = datos['nombre']
    proveedor.telefono_proveedor = datos['telefono']
    proveedor.email_proveedor = datos['email']
    proveedor.direccion_proveedor = datos['direccion']
    proveedor.save()

    registrar_auditoria(
        request.user,
        'Proveedores',
        proveedor,
        'MODIFICACION',
        antes,
        snapshot(proveedor),
    )

    return Response({'mensaje': 'Proveedor actualizado correctamente.'})


def _eliminar_proveedor(proveedor):
    nombre = proveedor.nombre_proveedor

    try:
        with transaction.atomic():
            registrar_auditoria(request.user, 'Proveedores', proveedor, 'ELIMINACION', snapshot(proveedor), {})
            proveedor.delete()
    except ProtectedError:
        return _error(
            f'No se puede eliminar el proveedor "{nombre}": '
            'tiene remitos registrados.'
        )

    return Response({'mensaje': f'El proveedor "{nombre}" fue eliminado.'})


@api_view(['POST'])
@permission_classes([permiso_modulo('proveedores')])
def proveedor_estado(request, pk):
    """POST /api/proveedores/<id>/estado/   body: {"activo": true|false}"""

    proveedor = Proveedores.objects.filter(ID_Proveedor=pk).first()

    if proveedor is None:
        return _error('El proveedor no existe.', status.HTTP_404_NOT_FOUND)

    activo = _booleano(request.data.get('activo'))

    if activo is None:
        return _error('El estado solicitado no es válido.')

    antes = snapshot(proveedor)

    proveedor.estado_proveedor = activo
    proveedor.save(update_fields=['estado_proveedor'])

    registrar_auditoria(
        request.user,
        'Proveedores',
        proveedor,
        'MODIFICACION',
        antes,
        snapshot(proveedor),
    )

    accion = 'activado' if activo else 'dado de baja'

    return Response({
        'mensaje': (
            f'El proveedor "{proveedor.nombre_proveedor}" '
            f'fue {accion} correctamente.'
        ),
    })