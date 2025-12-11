"""
Genera datos de prueba para priorización de empleados.
Ejecutar: python manage.py seed_priority_demo_data
"""

from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.servicios.models import Reserva, ReservaEmpleado, Servicio
from apps.users.models import (
    Cliente,
    Empleado,
    Genero,
    Localidad,
    Persona,
    TipoDocumento,
)


class Command(BaseCommand):
    help = "Crea empleados, clientes y reservas completadas listos para probar la prioridad de asignacion"

    def handle(self, *args, **_options):
        try:
            with transaction.atomic():
                generos = self._ensure_generos()
                tipo_documento = self._ensure_tipo_documento()
                localidades = self._ensure_localidades()
                servicios = self._ensure_servicios()

                empleados = self._ensure_empleados(generos, tipo_documento, localidades)
                clientes = self._ensure_clientes(generos, tipo_documento, localidades)

                created_reservas = self._ensure_reservas(servicios, empleados, clientes)
        except CommandError:
            raise
        except Exception as exc:  # pragma: no cover - logging unexpected errors
            raise CommandError(f"No se pudieron generar los datos: {exc}") from exc

        self.stdout.write(self.style.SUCCESS("Datos de prioridad listos."))
        self.stdout.write(f" - Empleados cargados: {len(empleados)}")
        self.stdout.write(f" - Clientes cargados: {len(clientes)}")
        self.stdout.write(f" - Reservas completadas: {created_reservas}")

    def _ensure_generos(self):
        generos = {}
        for genero in ("Femenino", "Masculino", "No binario"):
            generos[genero], _ = Genero.objects.get_or_create(genero=genero)
        return generos

    def _ensure_tipo_documento(self):
        tipo_documento, _ = TipoDocumento.objects.get_or_create(tipo="DNI")
        return tipo_documento

    def _ensure_localidades(self):
        localidades = {}
        dataset = [
            ("1414", "Palermo", "Buenos Aires"),
            ("5000", "Cordoba Capital", "Cordoba"),
            ("2000", "Rosario", "Santa Fe"),
        ]
        for cp, nombre, provincia in dataset:
            localidades[nombre], _ = Localidad.objects.get_or_create(
                cp=cp,
                nombre_localidad=nombre,
                nombre_provincia=provincia,
            )
        return localidades

    def _ensure_servicios(self):
        servicios = {}
        dataset = [
            (
                "Mantenimiento Integral de Jardines",
                "Plan completo de mantenimiento, poda y abonado",
            ),
            (
                "Diseño Paisajistico Premium",
                "Proyecto personalizado con renders y ejecución",
            ),
            (
                "Restauracion de Espacios Verdes",
                "Recuperacion de parques, control de plagas y riego",
            ),
        ]
        for nombre, descripcion in dataset:
            servicio, _ = Servicio.objects.get_or_create(
                nombre=nombre,
                defaults={"descripcion": descripcion, "activo": True},
            )
            servicios[nombre] = servicio
        return servicios

    def _ensure_empleados(self, generos, tipo_documento, localidades):
        base_fecha = timezone.now()
        payload = [
            {
                "nombre": "Lucia",
                "apellido": "Mendez",
                "email": "lucia.mendez@example.com",
                "telefono": "+5491145567788",
                "calle": "Av. Libertador",
                "numero": "1234",
                "piso": "8",
                "dpto": "A",
                "nro_documento": "40111222",
                "genero": "Femenino",
                "localidad": "Palermo",
                "cargo": "Coordinadora de Servicios",
                "puntuacion_promedio": Decimal("4.85"),
                "puntuacion_cantidad": 26,
                "fecha_ultima_puntuacion": base_fecha - timedelta(days=2),
            },
            {
                "nombre": "Marco",
                "apellido": "Diaz",
                "email": "marco.diaz@example.com",
                "telefono": "+5491156678899",
                "calle": "Gurruchaga",
                "numero": "987",
                "piso": None,
                "dpto": None,
                "nro_documento": "40222333",
                "genero": "Masculino",
                "localidad": "Palermo",
                "cargo": "Supervisor de Campo",
                "puntuacion_promedio": Decimal("4.60"),
                "puntuacion_cantidad": 18,
                "fecha_ultima_puntuacion": base_fecha - timedelta(days=4),
            },
            {
                "nombre": "Sofia",
                "apellido": "Lara",
                "email": "sofia.lara@example.com",
                "telefono": "+5493517788990",
                "calle": "Bv. San Juan",
                "numero": "750",
                "piso": "5",
                "dpto": "B",
                "nro_documento": "40333444",
                "genero": "Femenino",
                "localidad": "Cordoba Capital",
                "cargo": "Paisajista Senior",
                "puntuacion_promedio": Decimal("4.85"),
                "puntuacion_cantidad": 14,
                "fecha_ultima_puntuacion": base_fecha - timedelta(days=1),
            },
            {
                "nombre": "Javier",
                "apellido": "Paz",
                "email": "javier.paz@example.com",
                "telefono": "+5493418899001",
                "calle": "Av. Pellegrini",
                "numero": "2045",
                "piso": None,
                "dpto": None,
                "nro_documento": "40444555",
                "genero": "Masculino",
                "localidad": "Rosario",
                "cargo": "Especialista en Riego",
                "puntuacion_promedio": Decimal("4.30"),
                "puntuacion_cantidad": 22,
                "fecha_ultima_puntuacion": base_fecha - timedelta(days=6),
            },
            {
                "nombre": "Paula",
                "apellido": "Suarez",
                "email": "paula.suarez@example.com",
                "telefono": "+5491147789900",
                "calle": "Republica Arabe Siria",
                "numero": "456",
                "piso": "2",
                "dpto": "C",
                "nro_documento": "40555666",
                "genero": "No binario",
                "localidad": "Palermo",
                "cargo": "Coordinadora de Calidad",
                "puntuacion_promedio": Decimal("4.50"),
                "puntuacion_cantidad": 30,
                "fecha_ultima_puntuacion": base_fecha - timedelta(days=3),
            },
        ]

        empleados = {}
        for item in payload:
            persona = self._ensure_persona(
                item,
                generos[item["genero"]],
                tipo_documento,
                localidades[item["localidad"]],
            )

            empleado, created = Empleado.objects.get_or_create(
                persona=persona,
                defaults={
                    "cargo": item["cargo"],
                    "observaciones": "Generado para pruebas de prioridad",
                },
            )

            if not created:
                empleado.cargo = item["cargo"]
                empleado.observaciones = empleado.observaciones or "Generado para pruebas de prioridad"

            empleado.puntuacion_promedio = item["puntuacion_promedio"]
            empleado.puntuacion_cantidad = item["puntuacion_cantidad"]
            empleado.puntuacion_acumulada = (
                item["puntuacion_promedio"] * Decimal(item["puntuacion_cantidad"])
            ).quantize(Decimal("0.01"))
            empleado.fecha_ultima_puntuacion = item["fecha_ultima_puntuacion"]
            empleado.activo = True
            empleado.save()

            empleados[item["email"]] = empleado

        return empleados

    def _ensure_clientes(self, generos, tipo_documento, localidades):
        payload = [
            {
                "nombre": "Martin",
                "apellido": "Rojas",
                "email": "martin.rojas@example.com",
                "telefono": "+5491167789901",
                "calle": "Av. Cabildo",
                "numero": "2200",
                "piso": "9",
                "dpto": "A",
                "nro_documento": "30111222",
                "genero": "Masculino",
                "localidad": "Palermo",
            },
            {
                "nombre": "Carla",
                "apellido": "Monzon",
                "email": "carla.monzon@example.com",
                "telefono": "+5493516678902",
                "calle": "Hipolito Yrigoyen",
                "numero": "845",
                "piso": None,
                "dpto": None,
                "nro_documento": "30222333",
                "genero": "Femenino",
                "localidad": "Cordoba Capital",
            },
            {
                "nombre": "Nicolas",
                "apellido": "Ferreyra",
                "email": "nicolas.ferreyra@example.com",
                "telefono": "+5493417789903",
                "calle": "Catamarca",
                "numero": "1235",
                "piso": "3",
                "dpto": "B",
                "nro_documento": "30333444",
                "genero": "Masculino",
                "localidad": "Rosario",
            },
        ]

        clientes = {}
        for item in payload:
            persona = self._ensure_persona(
                item,
                generos[item["genero"]],
                tipo_documento,
                localidades[item["localidad"]],
            )
            cliente, _ = Cliente.objects.get_or_create(
                persona=persona,
                defaults={"observaciones": "Cliente generado para datos de prioridad"},
            )
            cliente.activo = True
            cliente.save()
            clientes[item["email"]] = cliente
        return clientes

    def _ensure_persona(self, data, genero, tipo_documento, localidad):
        persona, created = Persona.objects.update_or_create(
            email=data["email"],
            defaults={
                "nombre": data["nombre"],
                "apellido": data["apellido"],
                "telefono": data["telefono"],
                "calle": data["calle"],
                "numero": data["numero"],
                "piso": data.get("piso"),
                "dpto": data.get("dpto"),
                "nro_documento": data["nro_documento"],
                "genero": genero,
                "tipo_documento": tipo_documento,
                "localidad": localidad,
            },
        )
        if not created and persona.nro_documento != data["nro_documento"]:
            persona.nro_documento = data["nro_documento"]
            persona.save(update_fields=["nro_documento"])
        return persona

    def _ensure_reservas(self, servicios, empleados, clientes):
        now = timezone.now()
        dataset = [
            {
                "identificador": "seed-prioridad-001",
                "cliente": "martin.rojas@example.com",
                "servicio": "Mantenimiento Integral de Jardines",
                "days_ago": 45,
                "monto_total": Decimal("350000.00"),
                "monto_sena": Decimal("70000.00"),
                "empleados": [
                    {"email": "lucia.mendez@example.com", "rol": "responsable"},
                    {"email": "marco.diaz@example.com", "rol": "operador"},
                ],
            },
            {
                "identificador": "seed-prioridad-002",
                "cliente": "martin.rojas@example.com",
                "servicio": "Diseño Paisajistico Premium",
                "days_ago": 32,
                "monto_total": Decimal("480000.00"),
                "monto_sena": Decimal("96000.00"),
                "empleados": [
                    {"email": "sofia.lara@example.com", "rol": "diseñador"},
                    {"email": "paula.suarez@example.com", "rol": "asistente"},
                ],
            },
            {
                "identificador": "seed-prioridad-003",
                "cliente": "carla.monzon@example.com",
                "servicio": "Restauracion de Espacios Verdes",
                "days_ago": 27,
                "monto_total": Decimal("410000.00"),
                "monto_sena": Decimal("82000.00"),
                "empleados": [
                    {"email": "lucia.mendez@example.com", "rol": "responsable"},
                    {"email": "javier.paz@example.com", "rol": "operador"},
                    {"email": "paula.suarez@example.com", "rol": "asistente"},
                ],
            },
            {
                "identificador": "seed-prioridad-004",
                "cliente": "nicolas.ferreyra@example.com",
                "servicio": "Mantenimiento Integral de Jardines",
                "days_ago": 18,
                "monto_total": Decimal("275000.00"),
                "monto_sena": Decimal("55000.00"),
                "empleados": [
                    {"email": "sofia.lara@example.com", "rol": "responsable"},
                    {"email": "marco.diaz@example.com", "rol": "operador"},
                ],
            },
            {
                "identificador": "seed-prioridad-005",
                "cliente": "carla.monzon@example.com",
                "servicio": "Diseño Paisajistico Premium",
                "days_ago": 10,
                "monto_total": Decimal("520000.00"),
                "monto_sena": Decimal("104000.00"),
                "empleados": [
                    {"email": "lucia.mendez@example.com", "rol": "responsable"},
                    {"email": "sofia.lara@example.com", "rol": "diseñador"},
                ],
            },
        ]

        count = 0
        for item in dataset:
            cliente = clientes.get(item["cliente"])
            servicio = servicios.get(item["servicio"])
            if not cliente or not servicio:
                raise CommandError(f"Cliente o servicio no encontrado para {item['identificador']}")

            fecha_reserva = now - timedelta(days=item["days_ago"])

            reserva, _ = Reserva.objects.update_or_create(
                cliente=cliente,
                servicio=servicio,
                observaciones=item["identificador"],
                defaults={
                    "fecha_reserva": fecha_reserva,
                    "estado": "completada",
                    "monto_total": item["monto_total"],
                    "monto_sena": item["monto_sena"],
                    "monto_final": (item["monto_total"] - item["monto_sena"]).quantize(Decimal("0.01")),
                    "estado_pago": "pagado",
                    "estado_pago_sena": "pagado",
                    "estado_pago_final": "pagado",
                    "fecha_pago_sena": fecha_reserva - timedelta(days=5),
                    "fecha_pago_final": fecha_reserva - timedelta(days=1),
                    "direccion": (
                        f"{cliente.persona.calle} {cliente.persona.numero}, "
                        f"{cliente.persona.localidad.nombre_localidad}"
                    ),
                },
            )

            self._sync_asignaciones(reserva, item["empleados"], empleados)
            reserva.generate_encuesta_token(force=True)
            count += 1

        return count

    def _sync_asignaciones(self, reserva, asignaciones_payload, empleados):
        target_emails = {entry["email"] for entry in asignaciones_payload}

        for asignacion in list(reserva.asignaciones.all()):
            if asignacion.empleado.persona.email not in target_emails:
                asignacion.delete()

        for entry in asignaciones_payload:
            empleado = empleados.get(entry["email"])
            if not empleado:
                raise CommandError(f"Empleado {entry['email']} no existe para la reserva {reserva.observaciones}")
            ReservaEmpleado.objects.update_or_create(
                reserva=reserva,
                empleado=empleado,
                defaults={"rol": entry["rol"], "notas": "Asignacion generada por seed"},
            )
