from django.core.management.base import BaseCommand
from apps.users.utils import crear_roles_por_defecto


class Command(BaseCommand):
    help = 'Crear roles por defecto del sistema'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Creando roles por defecto...'))
        crear_roles_por_defecto()
        self.stdout.write(self.style.SUCCESS('Roles creados exitosamente!'))
