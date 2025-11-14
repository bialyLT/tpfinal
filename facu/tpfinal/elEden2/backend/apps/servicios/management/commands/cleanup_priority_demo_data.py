"""
Elimina los registros generados por seed_priority_demo_data cuando se quiere descartar el dataset de prioridad.
Ejecutar: python manage.py cleanup_priority_demo_data
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.servicios.models import Reserva
from apps.users.models import Cliente, Empleado, Localidad


class Command(BaseCommand):
    help = "Limpia empleados, clientes, reservas y localidades creadas por la carga de prioridad."

    EMPLEADO_EMAILS = {
        "lucia.mendez@example.com",
        "marco.diaz@example.com",
        "sofia.lara@example.com",
        "javier.paz@example.com",
        "paula.suarez@example.com",
    }

    CLIENTE_EMAILS = {
        "martin.rojas@example.com",
        "carla.monzon@example.com",
        "nicolas.ferreyra@example.com",
    }

    LOCALIDAD_FILTROS = [
        {"cp": "1414", "nombre_localidad": "Palermo"},
        {"cp": "5000", "nombre_localidad": "Cordoba Capital"},
        {"cp": "2000", "nombre_localidad": "Rosario"},
    ]

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("🧹 Iniciando limpieza del dataset de prioridad...")

        reservas_qs = Reserva.objects.filter(observaciones__startswith="seed-prioridad-")
        reservas_count = reservas_qs.count()
        reservas_qs.delete()
        self.stdout.write(f"   ✅ Reservas eliminadas: {reservas_count}")

        empleados_qs = Empleado.objects.filter(persona__email__in=self.EMPLEADO_EMAILS)
        empleados_count = empleados_qs.count()
        empleados_qs.delete()
        self.stdout.write(f"   ✅ Empleados eliminados: {empleados_count}")

        clientes_qs = Cliente.objects.filter(persona__email__in=self.CLIENTE_EMAILS)
        clientes_count = clientes_qs.count()
        clientes_qs.delete()
        self.stdout.write(f"   ✅ Clientes eliminados: {clientes_count} (Pers personas en cascada)")

        localidades_deleted = 0
        for filtros in self.LOCALIDAD_FILTROS:
            queryset = Localidad.objects.filter(**filtros)
            deleted = queryset.count()
            if deleted:
                queryset.delete()
                localidades_deleted += deleted
                self.stdout.write(f"   🗺️  Localidades eliminadas: {deleted} ({filtros['nombre_localidad']} - {filtros['cp']})")
        if localidades_deleted == 0:
            self.stdout.write("   🗺️  No se encontraron localidades específicas del seed.")

