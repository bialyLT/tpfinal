from collections import defaultdict
from decimal import ROUND_HALF_UP, Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.encuestas.models import EncuestaRespuesta
from apps.users.models import Empleado


class Command(BaseCommand):
    help = (
        "Recalcula métricas mínimas de puntuación de empleados a partir de respuestas de encuestas "
        "(preguntas escala con impacta_puntuacion=True)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simula el recalculo sin persistir cambios.",
        )
        parser.add_argument(
            "--reset-empty",
            action="store_true",
            help=(
                "Si un empleado no tiene eventos de encuesta, resetea sus campos a estado base "
                "(promedio=10.00, acumulada=0.00, cantidad=0, fecha=None). "
                "Por defecto se mantienen los valores actuales."
            ),
        )

    def handle(self, *args, **options):
        dry_run = bool(options.get("dry_run"))
        reset_empty = bool(options.get("reset_empty"))

        self.stdout.write("Iniciando recalculo mínimo de puntuaciones...")
        if dry_run:
            self.stdout.write(self.style.WARNING("Modo simulación activo (--dry-run)."))

        eventos_por_empleado = self._construir_eventos_por_empleado()

        total_empleados = Empleado.objects.count()
        empleados_con_eventos = len(eventos_por_empleado)

        self.stdout.write(
            f"Empleados totales: {total_empleados} | Empleados con eventos de encuesta válidos: {empleados_con_eventos}"
        )

        actualizados = 0
        reseteados = 0
        sin_cambios = 0

        with transaction.atomic():
            for empleado in Empleado.objects.select_related("persona").all():
                eventos = eventos_por_empleado.get(empleado.id_empleado, [])

                if eventos:
                    payload = self._recalcular_desde_eventos(eventos)
                    changed = self._aplicar_si_cambia(empleado, payload, dry_run=dry_run)
                    if changed:
                        actualizados += 1
                    else:
                        sin_cambios += 1
                    continue

                if reset_empty:
                    payload = {
                        "puntuacion_acumulada": Decimal("0.00"),
                        "puntuacion_cantidad": 0,
                        "puntuacion_promedio": Decimal("10.00"),
                        "fecha_ultima_puntuacion": None,
                        "evaluaciones_bajas_consecutivas": 0,
                    }
                    changed = self._aplicar_si_cambia(empleado, payload, dry_run=dry_run)
                    if changed:
                        reseteados += 1
                    else:
                        sin_cambios += 1
                else:
                    sin_cambios += 1

            if dry_run:
                transaction.set_rollback(True)

        self.stdout.write(self.style.SUCCESS("Recalculo mínimo finalizado."))
        self.stdout.write(f"Actualizados: {actualizados}")
        self.stdout.write(f"Reseteados sin eventos: {reseteados}")
        self.stdout.write(f"Sin cambios: {sin_cambios}")

    def _construir_eventos_por_empleado(self):
        eventos_por_empleado = defaultdict(list)

        respuestas_qs = (
            EncuestaRespuesta.objects.filter(estado="completada")
            .prefetch_related("respuestas__pregunta", "reserva__empleados")
            .order_by("fecha_realizacion", "id_encuesta_respuesta")
        )

        for encuesta_respuesta in respuestas_qs:
            if not encuesta_respuesta.reserva_id:
                continue

            valores = []
            for respuesta in encuesta_respuesta.respuestas.all():
                pregunta = respuesta.pregunta
                if not pregunta:
                    continue
                if pregunta.tipo != "escala" or not pregunta.impacta_puntuacion:
                    continue
                if respuesta.valor_numerico is None:
                    continue
                valores.append(Decimal(respuesta.valor_numerico))

            if not valores:
                continue

            total = sum(valores, Decimal("0"))
            cantidad = len(valores)
            timestamp = encuesta_respuesta.fecha_realizacion

            for empleado in encuesta_respuesta.reserva.empleados.all():
                eventos_por_empleado[empleado.id_empleado].append(
                    {
                        "total": total,
                        "cantidad": cantidad,
                        "timestamp": timestamp,
                    }
                )

        return eventos_por_empleado

    def _recalcular_desde_eventos(self, eventos):
        acumulada = Decimal("0.00")
        cantidad_total = 0
        bajas_consecutivas = 0
        fecha_ultima = None

        eventos_ordenados = sorted(
            eventos,
            key=lambda item: (item["timestamp"] is None, item["timestamp"]),
        )

        for evento in eventos_ordenados:
            total = Decimal(evento["total"])
            cantidad = int(evento["cantidad"])
            if cantidad <= 0:
                continue

            acumulada += total
            cantidad_total += cantidad

            promedio_encuesta = (total / Decimal(cantidad)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            if promedio_encuesta < Decimal("7.00"):
                bajas_consecutivas += 1
            else:
                bajas_consecutivas = 0

            if evento["timestamp"] is not None:
                fecha_ultima = evento["timestamp"]

        if cantidad_total > 0:
            promedio = (acumulada / Decimal(cantidad_total)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        else:
            promedio = Decimal("0.00")

        return {
            "puntuacion_acumulada": acumulada.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            "puntuacion_cantidad": cantidad_total,
            "puntuacion_promedio": promedio,
            "fecha_ultima_puntuacion": fecha_ultima,
            "evaluaciones_bajas_consecutivas": bajas_consecutivas,
        }

    def _aplicar_si_cambia(self, empleado, payload, dry_run=False):
        campos = list(payload.keys())
        changed = any(getattr(empleado, campo) != payload[campo] for campo in campos)
        if not changed:
            return False

        if dry_run:
            return True

        for campo, valor in payload.items():
            setattr(empleado, campo, valor)
        empleado.save(update_fields=campos)
        return True
