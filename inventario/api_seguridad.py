"""
API JSON de Usuarios, Perfiles, Permisos y Mis permisos para React.

Mismas reglas que views.py (permisos, validaciones y auditoría).
Errores con la forma {"error": "mensaje"}.
"""
import unicodedata

from django.contrib.auth.hashers import make_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .api import _booleano, _error, _texto
from .api_auth import permiso_modulo
from .auditoria import (
    registrar_asignacion_perfil,
    registrar_asignacion_permisos,
    registrar_auditoria,
    snapshot,
)
from .models import Perfiles, PerfilesXPermisos, Permisos, Usuarios
from .permissions import PERFILES_ADMIN, catalogo_plano
from .views import _permisos_de


# ============================================================
# USUARIOS
# ============================================================

def _sin_tildes(texto):
    return ''.join(
        c for c in unicodedata.normalize('NFD', texto)
        if unicodedata.category(c) != 'Mn'
    )


def _serializar_usuario(u):
    return {
        'id': u.ID_Usuario,
        'usuario': u.Usuario,
        'nombre': u.Nombre_usuario,
        'apellido': u.Apellido_usuario,
        'dni': u.DNI,
        'email': u.Email_usuario,
        'perfil_id': u.ID_Perfil_id,
        'perfil_nombre': u.ID_Perfil.Nombre_perfil,
        'activo': u.Estado_usuario,
        'ultima_modificacion': u.Fecha_ultima_modificacion.isoformat(),
        'fecha_baja': u.Fecha_Baja.isoformat() if u.Fecha_Baja else None,
    }


def _buscar_usuario(pk):
    return Usuarios.objects.select_related('ID_Perfil').filter(
        ID_Usuario=pk
    ).first()


def _error_email(email, excluir_pk=None):
    """Mensaje de error, o None si el correo es válido."""

    if not email:
        return 'Debe ingresar el correo electrónico.'

    try:
        validate_email(email)
    except ValidationError:
        return 'El correo electrónico no es válido.'

    repetido = Usuarios.objects.filter(Email_usuario__iexact=email)

    if excluir_pk is not None:
        repetido = repetido.exclude(ID_Usuario=excluir_pk)

    if repetido.exists():
        return 'Ya existe un usuario con ese correo electrónico.'

    return None


@api_view(['GET', 'POST'])
@permission_classes([permiso_modulo('usuarios')])
def usuarios(request):
    """
    GET  /api/usuarios/   lista de usuarios + perfiles para el formulario
    POST /api/usuarios/   crea un usuario (debe cambiar la contraseña)
    """

    if request.method == 'GET':
        lista = Usuarios.objects.select_related('ID_Perfil').order_by(
            'Apellido_usuario', 'Nombre_usuario'
        )

        return Response({
            'usuarios': [_serializar_usuario(u) for u in lista],
            'perfiles': [
                {
                    'id': p.ID_Perfil,
                    'nombre': p.Nombre_perfil,
                    'activo': p.Estado_perfil,
                }
                for p in Perfiles.objects.order_by('Nombre_perfil')
            ],
        })

    return _crear_usuario(request)


def _crear_usuario(request):
    perfil_id = _texto(request.data.get('ID_Perfil'))

    if not perfil_id:
        return _error('Debe seleccionar un perfil.')

    perfil = (
        Perfiles.objects.filter(pk=perfil_id).first()
        if perfil_id.isdigit() else None
    )

    if perfil is None:
        return _error('El perfil seleccionado no existe.')

    if not perfil.Estado_perfil:
        return _error(
            'No se pueden registrar usuarios con un perfil inactivo.'
        )

    dni = _texto(request.data.get('DNI'))
    apellido = _texto(request.data.get('Apellido_usuario'))
    nombre = _texto(request.data.get('Nombre_usuario'))
    email = _texto(request.data.get('Email_usuario'))
    contrasena = _texto(request.data.get('Contrasena'))

    if not dni.isdigit():
        return _error('Debe ingresar un DNI válido.')

    if not nombre:
        return _error('Debe ingresar el nombre del usuario.')

    if not apellido:
        return _error('Debe ingresar el apellido del usuario.')

    if len(contrasena) < 8:
        return _error('La contraseña debe tener al menos 8 caracteres.')

    error = _error_email(email)

    if error:
        return _error(error)

    if Usuarios.objects.filter(DNI=int(dni)).exists():
        return _error('Ya existe un usuario con ese DNI.')

    usuario_generado = (
        _sin_tildes(apellido) + _sin_tildes(nombre)[0]
    ).lower()

    if Usuarios.objects.filter(Usuario=usuario_generado).exists():
        return _error(f'El usuario {usuario_generado} ya existe.')

    nuevo = Usuarios.objects.create(
        ID_Perfil=perfil,
        DNI=int(dni),
        Apellido_usuario=apellido,
        Nombre_usuario=nombre,
        Usuario=usuario_generado,
        Contrasena=make_password(contrasena),
        Email_usuario=email,
        Estado_usuario=True,
        Cambiar_contrasena=True,
    )
    registrar_auditoria(request.user, 'Usuarios', nuevo, 'CREACION', {}, snapshot(nuevo))
    registrar_asignacion_perfil(request.user, nuevo, None, perfil)

    return Response(
        {
            'mensaje': (
                f'El usuario {nuevo.Usuario} ha sido registrado '
                'correctamente. Deberá cambiar su contraseña en el '
                'próximo inicio de sesión.'
            ),
            'id': nuevo.ID_Usuario,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['PUT'])
@permission_classes([permiso_modulo('usuarios')])
def usuario_editar(request, pk):
    """PUT /api/usuarios/<id>/   solo se puede modificar el email."""

    usuario = _buscar_usuario(pk)

    if usuario is None:
        return _error('El usuario no existe.', status.HTTP_404_NOT_FOUND)

    email = _texto(request.data.get('Email_usuario'))
    error = _error_email(email, excluir_pk=pk)

    if error:
        return _error(error)

    antes = snapshot(usuario)

    usuario.Email_usuario = email
    usuario.save()

    registrar_auditoria(
        request.user, 'Usuarios', usuario, 'MODIFICACION',
        antes, snapshot(usuario),
    )

    return Response({
        'mensaje': (
            f'El usuario {usuario.Usuario} ha sido modificado correctamente.'
        ),
    })


@api_view(['POST'])
@permission_classes([permiso_modulo('usuarios')])
def usuario_baja(request, pk):
    """POST /api/usuarios/<id>/baja/"""

    usuario = _buscar_usuario(pk)

    if usuario is None:
        return _error('El usuario no existe.', status.HTTP_404_NOT_FOUND)

    if usuario.ID_Usuario == request.user.ID_Usuario:
        return _error('No puede darse de baja a sí mismo.')

    antes = snapshot(usuario)

    usuario.Estado_usuario = False
    usuario.Fecha_Baja = timezone.localdate()
    usuario.save()

    registrar_auditoria(
        request.user, 'Usuarios', usuario, 'MODIFICACION',
        antes, snapshot(usuario),
    )

    return Response({'mensaje': 'Usuario dado de baja correctamente.'})


@api_view(['POST'])
@permission_classes([permiso_modulo('usuarios')])
def usuario_activar(request, pk):
    """POST /api/usuarios/<id>/activar/"""

    usuario = _buscar_usuario(pk)

    if usuario is None:
        return _error('El usuario no existe.', status.HTTP_404_NOT_FOUND)

    if not usuario.ID_Perfil.Estado_perfil:
        return _error(
            'No se puede activar el usuario porque su perfil está inactivo.'
        )

    antes = snapshot(usuario)

    usuario.Estado_usuario = True
    usuario.Fecha_Baja = None
    usuario.save()

    registrar_auditoria(
        request.user, 'Usuarios', usuario, 'MODIFICACION',
        antes, snapshot(usuario),
    )

    return Response({
        'mensaje': (
            f'El usuario {usuario.Usuario} fue activado correctamente.'
        ),
    })


@api_view(['POST'])
@permission_classes([permiso_modulo('usuarios')])
def usuario_restablecer(request, pk):
    """POST /api/usuarios/<id>/restablecer/"""

    usuario = _buscar_usuario(pk)

    if usuario is None:
        return _error('El usuario no existe.', status.HTTP_404_NOT_FOUND)

    nueva = str(request.data.get('nueva_contrasena') or '')
    confirmar = str(request.data.get('confirmar_contrasena') or '')

    if nueva != confirmar:
        return _error('Las contraseñas no coinciden.')

    if len(nueva) < 8:
        return _error('La contraseña debe tener al menos 8 caracteres.')

    antes = snapshot(usuario)
    antes['Contrasena'] = 'anterior'

    usuario.Contrasena = make_password(nueva)
    usuario.Cambiar_contrasena = True
    usuario.save()

    despues = snapshot(usuario)
    despues['Contrasena'] = 'restablecida'

    registrar_auditoria(
        request.user, 'Usuarios', usuario, 'MODIFICACION', antes, despues
    )

    return Response({
        'mensaje': (
            f'La contraseña del usuario {usuario.Usuario} fue restablecida '
            'correctamente. Deberá cambiarla en el próximo inicio de sesión.'
        ),
    })


# ============================================================
# PERFILES
# ============================================================

def _consulta_perfiles():
    return Perfiles.objects.prefetch_related('permisos').annotate(
        usuarios_activos=Count(
            'usuarios',
            filter=Q(usuarios__Estado_usuario=True),
            distinct=True,
        )
    ).order_by('ID_Perfil')


def _serializar_perfil(p):
    return {
        'id': p.ID_Perfil,
        'nombre': p.Nombre_perfil,
        'activo': p.Estado_perfil,
        'es_sistema': p.Nombre_perfil in PERFILES_ADMIN,
        'usuarios_activos': p.usuarios_activos,
        'permisos': [
            {
                'id': x.ID_Permiso,
                'nombre': x.Nombre_permiso,
                'descripcion': x.Descripcion_permiso or '',
            }
            for x in p.permisos.all()
        ],
    }


def _leer_perfil(request, excluir_pk=None):
    """Valida nombre y permisos. Devuelve (nombre, permisos, error)."""

    nombre = _texto(request.data.get('Nombre_perfil'))

    if not nombre:
        return None, None, 'Debe ingresar el nombre del perfil.'

    if len(nombre) > 50:
        return None, None, 'El nombre no puede superar los 50 caracteres.'

    repetido = Perfiles.objects.filter(Nombre_perfil__iexact=nombre)

    if excluir_pk is not None:
        repetido = repetido.exclude(ID_Perfil=excluir_pk)

    if repetido.exists():
        return None, None, 'Ya existe un perfil con ese nombre.'

    ids = request.data.get('permisos') or []

    if not isinstance(ids, (list, tuple)):
        ids = [ids]

    ids = {str(i) for i in ids}

    if not all(i.isdigit() for i in ids):
        return None, None, 'Los permisos seleccionados no son válidos.'

    permisos = list(Permisos.objects.filter(ID_Permiso__in=ids))

    if len(permisos) != len(ids):
        return None, None, 'Alguno de los permisos seleccionados no existe.'

    return nombre, permisos, None


@api_view(['GET', 'POST'])
@permission_classes([permiso_modulo('perfiles')])
def perfiles(request):
    """
    GET  /api/perfiles/   perfiles + catálogo de permisos para asignar
    POST /api/perfiles/   crea un perfil con sus permisos
    """

    if request.method == 'GET':
        return Response({
            'perfiles': [
                _serializar_perfil(p) for p in _consulta_perfiles()
            ],
            'permisos': [
                {
                    'id': p.ID_Permiso,
                    'nombre': p.Nombre_permiso,
                    'descripcion': p.Descripcion_permiso or '',
                }
                for p in Permisos.objects.order_by('ID_Permiso')
            ],
        })

    nombre, permisos, error = _leer_perfil(request)

    if error:
        return _error(error)

    with transaction.atomic():
        perfil = Perfiles.objects.create(Nombre_perfil=nombre)

        PerfilesXPermisos.objects.bulk_create([
            PerfilesXPermisos(ID_Perfil=perfil, ID_Permiso=p)
            for p in permisos
        ])
        registrar_auditoria(request.user, 'Perfiles', perfil, 'CREACION', {}, snapshot(perfil))
        registrar_asignacion_permisos(request.user, perfil, set(), _permisos_de(perfil))


    return Response(
        {'mensaje': 'Perfil creado correctamente.', 'id': perfil.ID_Perfil},
        status=status.HTTP_201_CREATED,
    )


@api_view(['PUT'])
@permission_classes([permiso_modulo('perfiles')])
def perfil_editar(request, pk):
    """PUT /api/perfiles/<id>/   edita nombre y permisos"""

    perfil = Perfiles.objects.filter(ID_Perfil=pk).first()

    if perfil is None:
        return _error('El perfil no existe.', status.HTTP_404_NOT_FOUND)

    nombre, permisos, error = _leer_perfil(request, excluir_pk=pk)

    if error:
        return _error(error)

    antes = snapshot(perfil)
    permisos_antes = _permisos_de(perfil)

    with transaction.atomic():
        perfil.Nombre_perfil = nombre
        perfil.save()

        PerfilesXPermisos.objects.filter(ID_Perfil=perfil).delete()

        PerfilesXPermisos.objects.bulk_create([
            PerfilesXPermisos(ID_Perfil=perfil, ID_Permiso=p)
            for p in permisos
        ])

        registrar_auditoria(request.user, 'Perfiles', perfil, 'MODIFICACION', antes, snapshot(perfil))
        registrar_asignacion_permisos(request.user, perfil, permisos_antes, _permisos_de(perfil))

    return Response({'mensaje': 'Perfil actualizado correctamente.'})


@api_view(['POST'])
@permission_classes([permiso_modulo('perfiles')])
def perfil_estado(request, pk):
    """POST /api/perfiles/<id>/estado/   body: {"activo": true|false}"""

    perfil = Perfiles.objects.filter(ID_Perfil=pk).first()

    if perfil is None:
        return _error('El perfil no existe.', status.HTTP_404_NOT_FOUND)

    activo = _booleano(request.data.get('activo'))

    if activo is None:
        return _error('El estado solicitado no es válido.')

    if not activo:
        if perfil.Nombre_perfil in PERFILES_ADMIN:
            return _error('No se puede dar de baja un perfil de sistema.')

        if perfil.ID_Perfil == request.user.ID_Perfil_id:
            return _error(
                'No puede dar de baja el perfil con el que inició sesión.'
            )

        if Usuarios.objects.filter(ID_Perfil=perfil).exists():
            return _error(
                'No se puede dar de baja el perfil porque tiene usuarios '
                'asociados. Primero debe asignarles otro perfil.'
            )

    antes = snapshot(perfil)

    perfil.Estado_perfil = activo
    perfil.save(update_fields=['Estado_perfil'])

    registrar_auditoria(
        request.user, 'Perfiles', perfil, 'MODIFICACION',
        antes, snapshot(perfil),
    )

    accion = 'activado' if activo else 'dado de baja'

    return Response({
        'mensaje': (
            f'El perfil "{perfil.Nombre_perfil}" fue {accion} correctamente.'
        ),
    })


# ============================================================
# PERMISOS DEL SISTEMA (solo consulta: el catálogo vive en permissions.py)
# ============================================================

@api_view(['GET'])
@permission_classes([permiso_modulo('permisos')])
def catalogo_permisos(request):
    """GET /api/permisos/   catálogo agrupado y qué perfiles lo tienen"""

    en_bd = {
        p.Nombre_permiso.strip().lower(): p
        for p in Permisos.objects.prefetch_related('perfiles')
    }

    grupos = {}

    for nombre, descripcion, grupo in catalogo_plano():
        permiso = en_bd.get(nombre.lower())

        grupos.setdefault(grupo, []).append({
            'nombre': nombre,
            'descripcion': descripcion,
            'sincronizado': permiso is not None,
            'perfiles': (
                [p.Nombre_perfil for p in permiso.perfiles.all()]
                if permiso else []
            ),
        })

    return Response({
        'grupos': [
            {'titulo': titulo, 'permisos': lista}
            for titulo, lista in grupos.items()
        ],
    })


# ============================================================
# MIS PERMISOS (cualquier usuario con sesión)
# ============================================================

@api_view(['GET'])
def mis_permisos(request):
    """GET /api/mis-permisos/"""

    usuario = request.user

    return Response({
        'perfil': usuario.ID_Perfil.Nombre_perfil,
        'permisos': [
            {
                'nombre': p.Nombre_permiso,
                'descripcion': p.Descripcion_permiso or '',
            }
            for p in usuario.ID_Perfil.permisos.all()
        ],
    })