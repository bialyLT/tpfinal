"""
Elimina el dataset de prueba creado por seed_reservas_encuesta_pendiente.

Ejecutar dentro del contenedor backend:
    python manage.py cleanup_reservas_encuesta_pendiente
"""

from django.core.management import BaseCommand, call_command
from django.db import connection, transaction

from apps.encuestas.models import EncuestaRespuesta, Respuesta
from apps.servicios.models import Reserva, ReservaEmpleado


class Command(BaseCommand):
    help = "Elimina las reservas de prueba seed-encuesta-pendiente y sus respuestas asociadas."

    TABLES_WITH_DELETE_GUARD = [
        "respuesta",
        "encuesta_respuesta",
        "reserva_empleado",
        "reserva",
    ]

    @transaction.atomic
    def handle(self, *args, **_options):
        reservas_qs = Reserva.objects.filter(observaciones__startswith="seed-encuesta-pendiente-")
        reserva_ids = list(reservas_qs.values_list("id_reserva", flat=True))

        if not reserva_ids:
            self.stdout.write(self.style.WARNING("No se encontraron reservas seed-encuesta-pendiente para eliminar."))
            return

        self.stdout.write(f"Reservas a eliminar: {', '.join(str(reserva_id) for reserva_id in reserva_ids)}")

        self._drop_delete_guards()
        try:
            respuestas_deleted, _ = Respuesta.objects.filter(
                encuesta_respuesta__reserva_id__in=reserva_ids
            ).delete()
            encuestas_deleted, _ = EncuestaRespuesta.objects.filter(reserva_id__in=reserva_ids).delete()
            asignaciones_deleted, _ = ReservaEmpleado.objects.filter(reserva_id__in=reserva_ids).delete()
            reservas_deleted, _ = Reserva.objects.filter(id_reserva__in=reserva_ids).delete()

            self.stdout.write(
                self.style.SUCCESS(
                    "Dataset de prueba eliminado. "
                    f"Respuestas: {respuestas_deleted} | "
                    f"Encuestas: {encuestas_deleted} | "
                    f"Asignaciones: {asignaciones_deleted} | "
                    f"Reservas: {reservas_deleted}"
                )
            )

            # Recalcular puntuaciones con lo que quede en la base.
            call_command("recalcular_puntuaciones_minimo", reset_empty=True)
        finally:
            self._attach_delete_guards()

    def _drop_delete_guards(self):
        with connection.cursor() as cursor:
            for table_name in self.TABLES_WITH_DELETE_GUARD:
                cursor.execute(f'DROP TRIGGER IF EXISTS prevent_physical_delete ON "{table_name}";')

    def _attach_delete_guards(self):
        with connection.cursor() as cursor:
            for table_name in self.TABLES_WITH_DELETE_GUARD:
                cursor.execute(
                    f'CREATE TRIGGER prevent_physical_delete BEFORE DELETE ON "{table_name}" '
                    'FOR EACH ROW EXECUTE FUNCTION prevent_physical_delete_guard();'
                )