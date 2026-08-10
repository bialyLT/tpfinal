"""
Crea tres reservas finalizadas para un mismo cliente y un mismo empleado,
dejando una encuesta pendiente por cada reserva.

Ejecutar dentro del contenedor backend:
    python manage.py seed_reservas_encuesta_pendiente
"""

from datetime import timedelta

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.encuestas.models import Encuesta, EncuestaRespuesta
from apps.servicios.models import Reserva, ReservaEmpleado, Servicio
from apps.users.models import Cliente, Empleado


class Command(BaseCommand):
    help = (
        "Crea o asegura tres reservas completadas para un cliente y un empleado concretos, "
        "dejando la encuesta iniciada/pending para completarla luego. "
        "Si el dataset ya existe, reinicia lógicamente las respuestas previas y recalcula puntuaciones."
    )

    default_client_id = 1
    default_employee_id = 16

    demo_reservas = [
        {
            "marker": "seed-encuesta-pendiente-1",
            "days_ago": 12,
            "hour": 15,
            "minute": 0,
        },
        {
            "marker": "seed-encuesta-pendiente-2",
            "days_ago": 9,
            "hour": 16,
            "minute": 0,
        },
        {
            "marker": "seed-encuesta-pendiente-3",
            "days_ago": 6,
            "hour": 17,
            "minute": 0,
        },
    ]

    def add_arguments(self, parser):
        parser.add_argument(
            "--cliente-id",
            type=int,
            default=self.default_client_id,
            help="ID del cliente a usar. Por defecto intenta con el cliente 1.",
        )
        parser.add_argument(
            "--empleado-id",
            type=int,
            default=self.default_employee_id,
            help="ID del empleado a usar. Por defecto intenta con el empleado 11.",
        )
        parser.add_argument(
            "--servicio-id",
            type=int,
            default=None,
            help="ID del servicio a usar. Si no se indica, toma el primer servicio activo.",
        )
        parser.add_argument(
            "--encuesta-id",
            type=int,
            default=None,
            help="ID de la encuesta a usar. Si no se indica, toma la encuesta activa.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        cliente = self._obtener_cliente(options["cliente_id"])
        empleado = self._obtener_empleado(options["empleado_id"])
        servicio = self._obtener_servicio(options["servicio_id"])
        encuesta = self._obtener_encuesta(options["encuesta_id"])

        creadas = 0
        reutilizadas = 0
        respuestas_creadas = 0
        respuestas_reiniciadas = 0

        for index, demo in enumerate(self.demo_reservas, start=1):
            fecha_cita = timezone.now() - timedelta(days=demo["days_ago"])
            fecha_cita = fecha_cita.replace(hour=demo["hour"], minute=demo["minute"], second=0, microsecond=0)
            observaciones = (
                f"{demo['marker']} | "
                f"cliente_id={cliente.id_cliente} | empleado_id={empleado.id_empleado}"
            )

            reserva, created = Reserva.objects.get_or_create(
                observaciones=observaciones,
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

            if created:
                creadas += 1
            else:
                reutilizadas += 1
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

            reserva.generate_encuesta_token()

            respuesta_previas, reiniciada = self._reiniciar_respuesta_anterior(cliente, encuesta, reserva)
            if reiniciada:
                respuestas_reiniciadas += 1

            asignacion, asignacion_creada = ReservaEmpleado.objects.get_or_create(
                reserva=reserva,
                empleado=empleado,
                defaults={"rol": "responsable"},
            )
            if asignacion.rol != "responsable":
                asignacion.rol = "responsable"
                asignacion.save(update_fields=["rol"])

            # Mantener la reserva asociada a un solo empleado para este dataset.
            ReservaEmpleado.objects.filter(reserva=reserva).exclude(empleado=empleado).delete()

            encuesta_respuesta, encuesta_creada = EncuestaRespuesta.objects.get_or_create(
                cliente=cliente,
                encuesta=encuesta,
                reserva=reserva,
                defaults={"estado": "iniciada"},
            )

            if encuesta_creada:
                respuestas_creadas += 1

            if not encuesta_creada and encuesta_respuesta.estado != "iniciada":
                encuesta_respuesta.estado = "iniciada"
                encuesta_respuesta.fecha_realizacion = None
                encuesta_respuesta.save(update_fields=["estado", "fecha_realizacion"])

            self.stdout.write(
                f"Reserva seed {index}: reserva_id={reserva.id_reserva} | "
                f"asignacion={'creada' if asignacion_creada else 'existente'} | "
                f"encuesta_respuesta={'creada' if encuesta_creada else 'reiniciada' if reiniciada else 'existente'}"
            )

        call_command("recalcular_puntuaciones_minimo", reset_empty=True)

        self.stdout.write(self.style.SUCCESS("Dataset de reservas de encuesta pendiente listo."))
        self.stdout.write(
            f"Cliente: {cliente.id_cliente} - {cliente.persona.nombre} {cliente.persona.apellido} | "
            f"Empleado: {empleado.id_empleado} - {empleado.persona.nombre} {empleado.persona.apellido} | "
            f"Servicio: {servicio.id_servicio} - {servicio.nombre} | "
            f"Encuesta: {encuesta.id_encuesta} - {encuesta.titulo}"
        )
        self.stdout.write(
            f"Reservas creadas: {creadas} | Reservas reutilizadas: {reutilizadas} | "
            f"Encuestas pendientes creadas: {respuestas_creadas} | Respuestas reiniciadas: {respuestas_reiniciadas}"
        )

    def _obtener_cliente(self, cliente_id):
        cliente = Cliente.objects.select_related("persona").filter(pk=cliente_id).first()
        if cliente:
            return cliente

        cliente = Cliente.objects.select_related("persona").order_by("pk").first()
        if not cliente:
            raise CommandError("No hay clientes cargados en la base de datos.")

        self.stdout.write(
            self.style.WARNING(
                f"No se encontró el cliente {cliente_id}; se usará el cliente {cliente.id_cliente}."
            )
        )
        return cliente

    def _obtener_empleado(self, empleado_id):
        empleado = Empleado.objects.select_related("persona").filter(pk=empleado_id).first()
        if empleado:
            return empleado

        empleado = Empleado.objects.select_related("persona").filter(activo=True).order_by("pk").first()
        if not empleado:
            empleado = Empleado.objects.select_related("persona").order_by("pk").first()
        if not empleado:
            raise CommandError("No hay empleados cargados en la base de datos.")

        self.stdout.write(
            self.style.WARNING(
                f"No se encontró el empleado {empleado_id}; se usará el empleado {empleado.id_empleado}."
            )
        )
        return empleado

    def _obtener_servicio(self, servicio_id):
        if servicio_id is not None:
            servicio = Servicio.objects.filter(pk=servicio_id).first()
            if servicio:
                return servicio

        servicio = Servicio.objects.filter(activo=True).order_by("pk").first()
        if not servicio:
            servicio = Servicio.objects.order_by("pk").first()
        if not servicio:
            raise CommandError("No hay servicios cargados en la base de datos.")

        return servicio

    def _obtener_encuesta(self, encuesta_id):
        if encuesta_id is not None:
            encuesta = Encuesta.objects.filter(pk=encuesta_id, activo=True).first()
            if encuesta:
                return encuesta

        encuesta = Encuesta.obtener_activa()
        if not encuesta:
            encuesta = Encuesta.objects.filter(activo=True).order_by("-id_encuesta").first()
        if not encuesta:
            raise CommandError("No hay encuestas activas en la base de datos.")

        return encuesta

    def _reiniciar_respuesta_anterior(self, cliente, encuesta, reserva):
        respuesta = EncuestaRespuesta.objects.filter(cliente=cliente, encuesta=encuesta, reserva=reserva).first()
        if not respuesta:
            return None, False

        respuesta.estado = "iniciada"
        respuesta.fecha_realizacion = None
        respuesta.save(update_fields=["estado", "fecha_realizacion"])
        respuesta.respuestas.update(valor_texto=None, valor_numerico=None, valor_boolean=None)
        return respuesta, True