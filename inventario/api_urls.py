from django.urls import path

from . import (
    api,
    api_productos,
    api_catalogos,
    api_seguridad,
    api_stock,
    api_egresos,
    api_remitos,
)


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

    # Egresos
    path('egresos/', api_egresos.egresos, name='api_egresos'),

    # Subtipos
    path('subtipos/', api_catalogos.subtipos, name='api_subtipos'),
    path('subtipos/<int:pk>/', api_catalogos.subtipo_detalle, name='api_subtipo_detalle'),

    # Remitos
    path('remitos/', api_remitos.remitos, name='api_remitos'),
    path('remitos/<int:pk>/', api_remitos.remito_detalle, name='api_remito_detalle'),

    # Proveedores
    path('proveedores/', api_catalogos.proveedores, name='api_proveedores'),
    path('proveedores/<int:pk>/', api_catalogos.proveedor_detalle, name='api_proveedor_detalle'),
    path('proveedores/<int:pk>/estado/', api_catalogos.proveedor_estado, name='api_proveedor_estado'),

    # Usuarios
    path('usuarios/', api_seguridad.usuarios, name='api_usuarios'),
    path('usuarios/<int:pk>/', api_seguridad.usuario_editar, name='api_usuario_editar'),
    path('usuarios/<int:pk>/baja/', api_seguridad.usuario_baja, name='api_usuario_baja'),
    path('usuarios/<int:pk>/activar/', api_seguridad.usuario_activar, name='api_usuario_activar'),
    path('usuarios/<int:pk>/restablecer/', api_seguridad.usuario_restablecer, name='api_usuario_restablecer'),

    # Perfiles y permisos
    path('perfiles/', api_seguridad.perfiles, name='api_perfiles'),
    path('perfiles/<int:pk>/', api_seguridad.perfil_editar, name='api_perfil_editar'),
    path('perfiles/<int:pk>/estado/', api_seguridad.perfil_estado, name='api_perfil_estado'),
    path('permisos/', api_seguridad.catalogo_permisos, name='api_permisos'),
    path('mis-permisos/', api_seguridad.mis_permisos, name='api_mis_permisos'),

    # Stock
    path('lotes/', api_stock.lotes, name='api_lotes'),
    path('movimientos-stock/', api_stock.movimientos, name='api_movimientos'),
    path('alertas/', api_stock.alertas, name='api_alertas'),
    path('alertas/<int:pk>/atender/', api_stock.atender_alerta, name='api_atender_alerta'),
]