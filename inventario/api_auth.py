"""
Autenticación y permisos para la API.

Este archivo está separado de api.py a propósito: Django REST Framework
carga estas clases muy temprano (desde settings.py), y si estuvieran en
api.py se produciría una importación circular.

No importar aquí nada de rest_framework.views ni rest_framework.decorators.
"""
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import Usuarios
from .permissions import puede
from .views import usuario_autenticado


class SesionUsuarioAuthentication(SessionAuthentication):
    """
    Reconoce al usuario con el mismo login propio del sistema
    (request.session['usuario_id']) y exige el token CSRF en
    POST, PUT y DELETE, igual que los formularios Django.
    """

    def authenticate(self, request):
        usuario = usuario_autenticado(request._request)

        if usuario is None:
            return None

        self.enforce_csrf(request)

        return (usuario, None)


class UsuarioLogueado(BasePermission):
    """Permite el acceso solo si hay un usuario con sesión iniciada."""

    def has_permission(self, request, view):
        return isinstance(request.user, Usuarios)


def permiso_modulo(modulo):
    """
    Devuelve un permiso que usa las mismas reglas de permissions.py.

    GET (consultar) pide el permiso de consulta del módulo.
    POST, PUT y DELETE (gestionar) piden el permiso de gestión.
    """

    class PermisoModulo(BasePermission):
        message = 'No tenés permiso para realizar esta acción.'

        def has_permission(self, request, view):
            usuario = request.user

            if not isinstance(usuario, Usuarios):
                return False

            return puede(
                usuario,
                modulo,
                gestionar=request.method not in SAFE_METHODS,
            )

    return PermisoModulo