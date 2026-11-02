"""
Endpoint que consume TiposProductos.jsx.
Pegalo en inventario/api.py (o en un archivo nuevo) y ajustá los nombres marcados con  # AJUSTAR.

Rutas (agregar en urls.py):
    from rest_framework.routers import DefaultRouter
    router = DefaultRouter()
    router.register("tipos-productos", TipoProductoViewSet, basename="tipos-productos")
    urlpatterns += [path("api/", include(router.urls))]
"""
from django.db.models import Count
from rest_framework import serializers, viewsets, status
from rest_framework.response import Response

from .models import TipoProducto  # AJUSTAR: nombre real del modelo


def puede(request, permiso):
    # AJUSTAR: usá la misma lógica con la que hoy armás `perm` en la vista de Django
    # (la que hace que en la plantilla funcione {% if perm.tipos_gestionar %}).
    from .views import obtener_permisos  # ejemplo
    return bool(obtener_permisos(request).get(permiso))


class TipoProductoSerializer(serializers.ModelSerializer):
    cantidad_productos = serializers.IntegerField(read_only=True)
    cantidad_subtipos = serializers.IntegerField(read_only=True)

    class Meta:
        model = TipoProducto
        fields = [
            "ID_Tipo_producto",
            "Nombre_tipo_producto",
            "Estado_tipo_producto",
            "cantidad_productos",
            "cantidad_subtipos",
        ]


class TipoProductoViewSet(viewsets.ModelViewSet):
    serializer_class = TipoProductoSerializer

    def get_queryset(self):
        return TipoProducto.objects.annotate(
            # AJUSTAR: nombre de la relación inversa (ver _meta.get_fields() como antes)
            cantidad_productos=Count("productos", distinct=True),
            cantidad_subtipos=Count("subtipos", distinct=True),
        ).order_by("Nombre_tipo_producto")

    def list(self, request, *args, **kwargs):
        datos = self.get_serializer(self.get_queryset(), many=True).data
        return Response({
            "resultados": datos,
            "puede_gestionar": puede(request, "tipos_gestionar"),
        })

    def _exigir_permiso(self, request):
        if not puede(request, "tipos_gestionar"):
            return Response({"detail": "No tenés permiso para gestionar tipos."},
                            status=status.HTTP_403_FORBIDDEN)

    def create(self, request, *args, **kwargs):
        return self._exigir_permiso(request) or super().create(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        return self._exigir_permiso(request) or super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        error = self._exigir_permiso(request)
        if error:
            return error
        tipo = self.get_object()
        if tipo.cantidad_productos or tipo.cantidad_subtipos:
            return Response({"detail": "El tipo tiene productos o subtipos asociados."},
                            status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)