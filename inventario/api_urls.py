from django.urls import path

from . import api


urlpatterns = [
    # Sesión
    path('sesion/', api.sesion, name='api_sesion'),
    path('login/', api.login, name='api_login'),
    path('logout/', api.logout, name='api_logout'),

    # Tipos de productos
    path(
        'tipos-productos/',
        api.tipos_productos,
        name='api_tipos_productos',
    ),
    path(
        'tipos-productos/<int:pk>/',
        api.tipo_producto_detalle,
        name='api_tipo_producto_detalle',
    ),
]