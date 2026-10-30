"""
API JSON para el frontend en React.

No reemplaza a views.py: las pantallas Django actuales siguen
funcionando. La API reutiliza la misma sesión, los mismos
permisos (permissions.py) y la misma auditoría (auditoria.py).

Todas las respuestas de error tienen la forma {"error": "mensaje"}.
"""
from django.contrib.auth.hashers import check_password
from django.db import transaction
from django.db.models import Count, ProtectedError
from django.views.decorators.csrf import ensure_csrf_cookie

from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.exceptions import NotAuthenticated
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import exception_handler

from .api_auth import SesionUsuarioAuthentication, permiso_modulo
from .auditoria import snapshot, registrar_auditoria
from .models import Productos, Subtipos, TiposProductos, Usuarios
from .permissions import MODULOS, PERFILES_ADMIN, permisos_asignados, puede


# ============================================================
# UTILIDADES
# ============================================================

def manejar_errores(exc, context):
    """Unifica los errores de DRF al formato {"error": "..."}."""

    if isinstance(exc, NotAuthenticated):
        return Response(
            {'error': 'Tu sesión expiró. Volvé a iniciar sesión.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    response = exception_handler(exc, context)

    if (
        response is not None
        and isinstance(response.data, dict)
        and 'detail' in response.data
    ):
        response.data = {'error': str(response.data['detail'])}

    return response


def _error(mensaje, codigo=status.HTTP_400_BAD_REQUEST):
    return Response({'error': mensaje}, status=codigo)


def _texto(valor):
    return str(valor or '').strip()


def _booleano(valor):
    """Acepta true/false o los textos 'True'/'False' de los formularios."""

    if valor in (True, 'True', 'true'):
        return True

    if valor in (False, 'False', 'false'):
        return False

    return None


def _es_administrador(usuario):
    return usuario.ID_Perfil.Nombre_perfil in PERFILES_ADMIN


# ============================================================
# SESIÓN
# ============================================================

def _datos_usuario(usuario):
    """Datos del usuario logueado y qué puede hacer en cada módulo."""

    asignados = permisos_asignados(usuario)

    return {
        'id': usuario.ID_Usuario,
        'usuario': usuario.Usuario,
        'nombre': usuario.Nombre_usuario,
        'apellido': usuario.Apellido_usuario,
        'perfil': usuario.ID_Perfil.Nombre_perfil,
        'es_administrador': _es_administrador(usuario),
        'cambiar_contrasena': usuario.Cambiar_contrasena,
        'permisos': {
            modulo: {
                'consultar': puede(usuario, modulo, asignados=asignados),
                'gestionar': puede(
                    usuario, modulo, gestionar=True, asignados=asignados
                ),
            }
            for modulo in MODULOS
        },
    }


@ensure_csrf_cookie
@api_view(['GET'])
@permission_classes([AllowAny])
def sesion(request):
    """
    React lo llama al arrancar. Devuelve el usuario logueado (o null)
    y además deja la cookie csrftoken necesaria para el login.
    """

    usuario = request.user

    if not isinstance(usuario, Usuarios):
        return Response({'usuario': None})

    return Response({'usuario': _datos_usuario(usuario)})


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def login(request):
    # El login no tiene sesión todavía, así que el CSRF se exige a mano.
    SesionUsuarioAuthentication().enforce_csrf(request)

    usuario_input = _texto(request.data.get('usuario'))
    password_input = str(request.data.get('password') or '')

    usuario = Usuarios.objects.select_related('ID_Perfil').filter(
        Usuario=usuario_input
    ).first()

    if usuario is None or not check_password(
        password_input, usuario.Contrasena
    ):
        return _error('Usuario o contraseña incorrectos.')

    if not usuario.Estado_usuario:
        return _error('El usuario se encuentra inactivo.')

    if not usuario.ID_Perfil:
        return _error('El usuario no tiene un perfil asignado.')

    if not usuario.ID_Perfil.Estado_perfil:
        return _error('El perfil del usuario se encuentra inactivo.')

    # Nueva clave de sesión al iniciar sesión (evita robo de sesión).
    request.session.cycle_key()

    # Las mismas claves que usa login_view, así la sesión sirve
    # también para las pantallas Django.
    request.session['usuario_id'] = usuario.ID_Usuario
    request.session['usuario_nombre'] = usuario.Usuario
    request.session['perfil_id'] = usuario.ID_Perfil.ID_Perfil
    request.session['perfil_nombre'] = usuario.ID_Perfil.Nombre_perfil

    registrar_auditoria(
        usuario=usuario,
        entidad='USUARIOS',
        objeto=usuario,
        accion='INICIO_SESION',
        antes={},
        despues={'accion': 'Inicio de sesión'},
    )

    return Response({'usuario': _datos_usuario(usuario)})


@api_view(['POST'])
@permission_classes([AllowAny])
def logout(request):
    usuario = request.user

    if isinstance(usuario, Usuarios):
        registrar_auditoria(
            usuario=usuario,
            entidad='USUARIOS',
            objeto=usuario,
            accion='CIERRE_SESION',
            antes={},
            despues={'accion': 'Cierre de sesión'},
        )

    request.session.flush()

    return Response({'mensaje': 'Sesión cerrada.'})


# ============================================================
# TIPOS DE PRODUCTOS
# ============================================================

def _tipos_con_cantidades():
    return TiposProductos.objects.annotate(
        cantidad_productos=Count('productos', distinct=True),
        cantidad_subtipos=Count('subtipos', distinct=True),
    )


def _serializar_tipo(tipo):
    return {
        'ID_Tipo_producto': tipo.ID_Tipo_producto,
        'Nombre_tipo_producto': tipo.Nombre_tipo_producto,
        'Estado_tipo_producto': tipo.Estado_tipo_producto,
        'cantidad_productos': getattr(tipo, 'cantidad_productos', 0),
        'cantidad_subtipos': getattr(tipo, 'cantidad_subtipos', 0),
    }


def _validar_nombre_tipo(nombre, excluir_pk=None):
    """Devuelve un mensaje de error, o None si el nombre es válido."""

    if not nombre:
        return 'Debe ingresar el nombre del tipo de producto.'

    if len(nombre) > 50:
        return 'El nombre no puede superar los 50 caracteres.'

    consulta = TiposProductos.objects.filter(
        Nombre_tipo_producto__iexact=nombre
    )

    if excluir_pk is not None:
        consulta = consulta.exclude(ID_Tipo_producto=excluir_pk)

    if consulta.exists():
        return 'Ya existe un tipo de producto con ese nombre.'

    return None


@ensure_csrf_cookie
@api_view(['GET', 'POST'])
@permission_classes([permiso_modulo('tipos')])
def tipos_productos(request):
    """
    GET  /api/tipos-productos/        lista (acepta ?q=texto)
    POST /api/tipos-productos/        crea un tipo (siempre activo)
    """

    if request.method == 'GET':
        tipos = _tipos_con_cantidades().order_by('Nombre_tipo_producto')

        busqueda = _texto(request.query_params.get('q'))

        if busqueda:
            tipos = tipos.filter(Nombre_tipo_producto__icontains=busqueda)

        return Response([_serializar_tipo(t) for t in tipos])

    nombre = _texto(request.data.get('Nombre_tipo_producto'))

    error = _validar_nombre_tipo(nombre)

    if error:
        return _error(error)

    tipo = TiposProductos.objects.create(
        Nombre_tipo_producto=nombre,
        Estado_tipo_producto=True,
    )

    return Response(_serializar_tipo(tipo), status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
@permission_classes([permiso_modulo('tipos')])
def tipo_producto_detalle(request, pk):
    """
    PUT    /api/tipos-productos/<id>/   edita nombre y estado
    DELETE /api/tipos-productos/<id>/   elimina (solo administradores)
    """

    if request.method == 'PUT':
        return _editar_tipo(request, pk)

    return _eliminar_tipo(request, pk)


def _editar_tipo(request, pk):
    tipo = TiposProductos.objects.filter(ID_Tipo_producto=pk).first()

    if tipo is None:
        return _error(
            'El tipo de producto no existe.', status.HTTP_404_NOT_FOUND
        )

    nombre = _texto(request.data.get('Nombre_tipo_producto'))
    estado = _booleano(request.data.get('Estado_tipo_producto'))

    error = _validar_nombre_tipo(nombre, excluir_pk=pk)

    if error:
        return _error(error)

    if estado is None:
        return _error('El estado seleccionado no es válido.')

    antes = snapshot(tipo)

    tipo.Nombre_tipo_producto = nombre
    tipo.Estado_tipo_producto = estado
    tipo.save(update_fields=['Nombre_tipo_producto', 'Estado_tipo_producto'])

    registrar_auditoria(
        request.user,
        'Tipos de productos',
        tipo,
        'MODIFICACION',
        antes,
        snapshot(tipo),
    )

    tipo = _tipos_con_cantidades().get(ID_Tipo_producto=pk)

    return Response(_serializar_tipo(tipo))


def _eliminar_tipo(request, pk):
    if not _es_administrador(request.user):
        return _error(
            'No tenés permiso para eliminar tipos de productos.',
            status.HTTP_403_FORBIDDEN,
        )

    nombre = ''

    try:
        with transaction.atomic():
            tipo = TiposProductos.objects.select_for_update().filter(
                ID_Tipo_producto=pk
            ).first()

            if tipo is None:
                return _error(
                    'El tipo de producto no existe.',
                    status.HTTP_404_NOT_FOUND,
                )

            nombre = tipo.Nombre_tipo_producto

            cantidad_productos = Productos.objects.filter(
                ID_Tipo_producto=tipo
            ).count()

            if cantidad_productos > 0:
                return _error(
                    f'No se puede eliminar el tipo "{nombre}" porque '
                    f'tiene {cantidad_productos} producto(s) asociado(s).'
                )

            cantidad_subtipos = Subtipos.objects.filter(
                ID_Tipo_producto=tipo
            ).count()

            if cantidad_subtipos > 0:
                return _error(
                    f'No se puede eliminar el tipo "{nombre}" porque '
                    f'tiene {cantidad_subtipos} subtipo(s) asociado(s).'
                )

            tipo.delete()

    except ProtectedError:
        return _error(
            f'No se puede eliminar el tipo "{nombre}" porque '
            'tiene otros registros relacionados.'
        )

    return Response(
        {'mensaje': f'El tipo "{nombre}" fue eliminado correctamente.'}
    )