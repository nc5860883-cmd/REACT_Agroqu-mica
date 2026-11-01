from django.urls import path

from . import api, api_productos


urlpatterns = [
    # Sesión
    path('sesion/', api.sesion, name='api_sesion'),
    path('login/', api.login, name='api_login'),
    path('logout/', api.logout, name='api_logout'),

    # Tipos de productos
    path('tipos-productos/', api.tipos_productos, name='api_tipos_productos'),
    path('tipos-productos/<int:pk>/', api.tipo_producto_detalle, name='api_tipo_producto_detalle'),

    # Productos
    path('productos/', api_productos.productos, name='api_productos'),
    path('productos/<int:pk>/', api_productos.producto_detalle, name='api_producto_detalle'),

    # Egreso de stock
    path('egresos/', api_productos.egresos, name='api_egresos'),
]