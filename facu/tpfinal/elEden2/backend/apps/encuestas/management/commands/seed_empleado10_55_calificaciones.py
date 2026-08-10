"""
Genera 55 calificaciones para el empleado 10, dejando su promedio en 6.xx.

Ejecutar dentro del contenedor backend:
    python manage.py seed_empleado10_55_calificaciones
"""

from datetime import timedelta

from django.core.management import BaseCommand, CommandError, call_command
from django.db import connection, transaction
from django.db import transaction
from django.utils import timezone

from apps.encuestas.models import Encuesta, EncuestaRespuesta, Pregunta, Respuesta
from apps.servicios.models import Reserva, ReservaEmpleado, Servicio
from apps.users.models import Cliente, Empleado


class Command(BaseCommand):
    help = "Crea 55 calificaciones para el empleado 10 y recalcula su promedio a 6.xx."

    total_calificaciones = 55
    default_cliente_id = 1
    default_empleado_id = 16
    reservation_marker_prefix = "seed-emp16-55-"

    def add_arguments(self, parser):
        parser.add_argument(
            "--cliente-id",
            type=int,
            default=self.default_cliente_id,
            help="Cliente a usar como autor de las calificaciones.",
        )
        parser.add_argument(
            "--empleado-id",
            type=int,
            default=self.default_empleado_id,
            help="Empleado al que se le crearán las calificaciones.",
        )
        parser.add_argument(
            "--servicio-id",
            type=int,
            default=None,
            help="Servicio a usar. Si no se indica, toma el primero activo.",
        )
        parser.add_argument(
            "--encuesta-id",
            type=int,
            default=None,
            help="Encuesta a usar. Si no se indica, toma la encuesta activa.",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Elimina primero las calificaciones generadas por este seed y luego las recrea.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        cliente = self._obtener_cliente(options["cliente_id"])
        empleado = self._obtener_empleado(options["empleado_id"])
        servicio = self._obtener_servicio(options["servicio_id"])
        encuesta = self._obtener_encuesta(options["encuesta_id"])
        preguntas = self._obtener_preguntas_impacto(encuesta)

        if options.get("reset"):
            self._reiniciar_dataset_generado()

        respuestas_creadas = 0
        respuestas_actualizadas = 0

        for index in range(self.total_calificaciones):
            reserva = self._obtener_reserva(cliente, empleado, servicio, index)
            reserva.generate_encuesta_token()

            ReservaEmpleado.objects.get_or_create(
                reserva=reserva,
                empleado=empleado,
                defaults={"rol": "responsable"},
            )
            ReservaEmpleado.objects.filter(reserva=reserva).exclude(empleado=empleado).delete()

            encuesta_respuesta, _ = EncuestaRespuesta.objects.get_or_create(
                cliente=cliente,
                encuesta=encuesta,
                reserva=reserva,
                defaults={"estado": "iniciada"},
            )
            encuesta_respuesta.estado = "completada"
            encuesta_respuesta.fecha_realizacion = timezone.now() - timedelta(days=self.total_calificaciones - index)
            encuesta_respuesta.save(update_fields=["estado", "fecha_realizacion"])

            puntuacion = 7 if index == 0 else 6
            for pregunta in preguntas:
                respuesta, created = Respuesta.objects.update_or_create(
                    encuesta_respuesta=encuesta_respuesta,
                    pregunta=pregunta,
                    defaults={
                        "valor_texto": None if puntuacion == 10 else f"Calificación automática {puntuacion}",
                        "valor_numerico": puntuacion,
                        "valor_boolean": None,
                    },
                )
                if created:
                    respuestas_creadas += 1
                else:
                    respuestas_actualizadas += 1

            self.stdout.write(
                f"Reserva #{reserva.id_reserva} -> encuesta #{encuesta_respuesta.id_encuesta_respuesta} con nota {puntuacion}"
            )

        call_command("recalcular_puntuaciones_minimo", reset_empty=True)

        empleado.refresh_from_db()
        self.stdout.write(self.style.SUCCESS("Calificaciones generadas correctamente."))
        self.stdout.write(
            f"Empleado {empleado.id_empleado}: acumulada={empleado.puntuacion_acumulada} | "
            f"cantidad={empleado.puntuacion_cantidad} | promedio={empleado.puntuacion_promedio} | activo={empleado.activo}"
        )
        self.stdout.write(
            f"Respuestas creadas: {respuestas_creadas} | Respuestas actualizadas: {respuestas_actualizadas}"
        )

    def _obtener_cliente(self, cliente_id):
        cliente = Cliente.objects.select_related("persona").filter(pk=cliente_id).first()
        if cliente:
            return cliente
        raise CommandError(f"No se encontró el cliente {cliente_id}.")

    def _obtener_empleado(self, empleado_id):
        empleado = Empleado.objects.select_related("persona").filter(pk=empleado_id).first()
        if empleado:
            return empleado
        raise CommandError(f"No se encontró el empleado {empleado_id}.")

    def _obtener_servicio(self, servicio_id):
        if servicio_id is not None:
            servicio = Servicio.objects.filter(pk=servicio_id).first()
            if servicio:
                return servicio

        servicio = Servicio.objects.filter(activo=True).order_by("pk").first()
        if not servicio:
            raise CommandError("No hay servicios activos en la base de datos.")
        return servicio

    def _obtener_encuesta(self, encuesta_id):
        if encuesta_id is not None:
            encuesta = Encuesta.objects.filter(pk=encuesta_id, activo=True).first()
            if encuesta:
                return encuesta

        encuesta = Encuesta.obtener_activa()
        if not encuesta:
            raise CommandError("No hay encuesta activa en la base de datos.")
        return encuesta

    def _obtener_preguntas_impacto(self, encuesta):
        preguntas = list(
            Pregunta.objects.filter(encuesta=encuesta, impacta_puntuacion=True, tipo="escala").order_by("id_pregunta")
        )
        if not preguntas:
            raise CommandError("La encuesta activa no tiene preguntas de escala que impacten puntuación.")
        return preguntas

    def _obtener_reserva(self, cliente, empleado, servicio, index):
        marker = f"{self.reservation_marker_prefix}{index + 1:02d}"
        fecha_cita = timezone.now() - timedelta(days=self.total_calificaciones - index)
        fecha_cita = fecha_cita.replace(hour=15, minute=0, second=0, microsecond=0)

        reserva, created = Reserva.objects.get_or_create(
            observaciones=marker,
            defaults={
                "fecha_cita": fecha_cita,
                "fecha_inicio": fecha_cita - timedelta(hours=2),
                "fecha_finalizacion": fecha_cita + timedelta(hours=2),
                "estado": "completada",
                "direccion": cliente.persona.calle,
                "servicio": servicio,
                "cliente": cliente,
            },
        )

        cambios = []
        if reserva.cliente_id != cliente.id_cliente:
            reserva.cliente = cliente
            cambios.append("cliente")
        if reserva.servicio_id != servicio.id_servicio:
            reserva.servicio = servicio
            cambios.append("servicio")
        if reserva.estado != "completada":
            reserva.estado = "completada"
            cambios.append("estado")
        if reserva.fecha_cita != fecha_cita:
            reserva.fecha_cita = fecha_cita
            cambios.append("fecha_cita")
        if reserva.fecha_inicio is None:
            reserva.fecha_inicio = fecha_cita - timedelta(hours=2)
            cambios.append("fecha_inicio")
        if reserva.fecha_finalizacion is None:
            reserva.fecha_finalizacion = fecha_cita + timedelta(hours=2)
            cambios.append("fecha_finalizacion")

        if cambios:
            reserva.save(update_fields=cambios)

        return reserva

    def _reiniciar_dataset_generado(self):
        reserva_ids = list(
            Reserva.objects.filter(observaciones__startswith=self.reservation_marker_prefix).values_list("id_reserva", flat=True)
        )
        if not reserva_ids:
            self.stdout.write(self.style.WARNING("No se encontraron calificaciones previas para resetear."))
            return

        self._drop_delete_guards()
        try:
            Respuesta.objects.filter(encuesta_respuesta__reserva_id__in=reserva_ids).delete()
            EncuestaRespuesta.objects.filter(reserva_id__in=reserva_ids).delete()
            ReservaEmpleado.objects.filter(reserva_id__in=reserva_ids).delete()
            Reserva.objects.filter(id_reserva__in=reserva_ids).delete()
            self.stdout.write(self.style.WARNING(f"Dataset previo eliminado: {len(reserva_ids)} reservas."))
        finally:
            self._attach_delete_guards()

    def _drop_delete_guards(self):
        with connection.cursor() as cursor:
            for table_name in self.DELETE_GUARDED_TABLES:
                cursor.execute(f'DROP TRIGGER IF EXISTS prevent_physical_delete ON "{table_name}";')

    def _attach_delete_guards(self):
        with connection.cursor() as cursor:
            for table_name in self.DELETE_GUARDED_TABLES:
                cursor.execute(
                    f'CREATE TRIGGER prevent_physical_delete BEFORE DELETE ON "{table_name}" '
                    'FOR EACH ROW EXECUTE FUNCTION prevent_physical_delete_guard();'
                )