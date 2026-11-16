from django.core.management.base import BaseCommand
from inventario.models import Permisos
from inventario.permissions import catalogo_plano


class Command(BaseCommand):
    help = 'Sincroniza los permisos definidos en permissions.py con la base de datos.'

    def handle(self, *args, **options):
        creados = 0
        existentes = 0

        for nombre, descripcion, grupo in catalogo_plano():
            permiso, creado = Permisos.objects.get_or_create(
                Nombre_permiso=nombre,
                defaults={
                    'Descripcion_permiso': descripcion,
                }
            )

            if creado:
                creados += 1
            else:
                existentes += 1

                # Actualiza la descripción si cambió en permissions.py.
                if permiso.Descripcion_permiso != descripcion:
                    permiso.Descripcion_permiso = descripcion
                    permiso.save(update_fields=['Descripcion_permiso'])

        self.stdout.write(
            self.style.SUCCESS(
                f'Sincronización completada. '
                f'Permisos creados: {creados}. '
                f'Permisos existentes: {existentes}.'
            )
        )