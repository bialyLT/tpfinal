from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.reverse import reverse
from rest_framework.test import APITestCase

from apps.servicios.models import Diseno, Reserva, ReservaEmpleado, Servicio
from apps.servicios.utils import ordenar_empleados_por_puntuacion
from apps.users.models import (
    Cliente,
    Empleado,
    Genero,
    Localidad,
    Persona,
    TipoDocumento,
)


class EmpleadoPrioridadTests(APITestCase):
    def setUp(self):
        self.genero = Genero.objects.create(genero="Masculino")
        self.tipo_documento = TipoDocumento.objects.create(tipo="DNI")
        self.localidad = Localidad.objects.create(
            cp="0000",
            nombre_localidad="Ciudad",
            nombre_provincia="Provincia",
        )

        self.admin_user = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="pass1234",
            is_staff=True,
        )

        self.cliente_user = User.objects.create_user(
            username="cliente",
            email="cliente@example.com",
            password="pass1234",
        )

        self.cliente_persona = Persona.objects.create(
            user=self.cliente_user,
            nombre="Cliente",
            apellido="Prioridad",
            email=self.cliente_user.email,
            telefono="123456789",
            calle="Calle",
            numero="123",
            nro_documento="11111111",
            genero=self.genero,
            tipo_documento=self.tipo_documento,
            localidad=self.localidad,
        )
        self.cliente = Cliente.objects.create(persona=self.cliente_persona)
        self.servicio = Servicio.objects.create(nombre="Jardinería Premium")

    def crear_empleado(self, username, email, promedio, cantidad, dias_hace=0):
        usuario = User.objects.create_user(
            username=username,
            email=email,
            password="pass1234",
        )
        persona = Persona.objects.create(
            user=usuario,
            nombre=username.capitalize(),
            apellido="Empleado",
            email=email,
            telefono="987654321",
            calle="Otra",
            numero="456",
            nro_documento=f"{usuario.id:08d}",
            genero=self.genero,
            tipo_documento=self.tipo_documento,
            localidad=self.localidad,
        )
        empleado = Empleado.objects.create(persona=persona, cargo="Operador")
        empleado.puntuacion_promedio = Decimal(promedio)
        empleado.puntuacion_cantidad = cantidad
        empleado.puntuacion_acumulada = (Decimal(promedio) * cantidad).quantize(Decimal("0.01"))
        empleado.fecha_ultima_puntuacion = timezone.now() - timedelta(days=dias_hace)
        empleado.save(
            update_fields=[
                "puntuacion_promedio",
                "puntuacion_cantidad",
                "puntuacion_acumulada",
                "fecha_ultima_puntuacion",
            ]
        )
        return empleado

    def test_empleados_disponibles_prioridad(self):
        mejor = self.crear_empleado("mejor", "mejor@example.com", "4.80", 12, dias_hace=1)
        segundo = self.crear_empleado("segundo", "segundo@example.com", "4.80", 6, dias_hace=2)
        tercero = self.crear_empleado("tercero", "tercero@example.com", "4.10", 4, dias_hace=3)

        self.client.force_authenticate(user=self.admin_user)
        fecha = timezone.now().date().isoformat()

        response = self.client.get(
            reverse("reserva-empleados-disponibles"),
            {"fecha": fecha},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        empleados = response.data.get("empleados_disponibles", [])
        self.assertEqual(len(empleados), 3)
        self.assertEqual(
            [empleado["id"] for empleado in empleados],
            [
                mejor.id_empleado,
                segundo.id_empleado,
                tercero.id_empleado,
            ],
        )
        self.assertEqual([empleado["prioridad"] for empleado in empleados], [1, 2, 3])

    def test_aceptar_diseno_asigna_mejores_empleados(self):
        mejor = self.crear_empleado("mejor2", "mejor2@example.com", "4.90", 15, dias_hace=0)
        segundo = self.crear_empleado("segundo2", "segundo2@example.com", "4.50", 10, dias_hace=1)
        tercero = self.crear_empleado("tercero2", "tercero2@example.com", "3.00", 5, dias_hace=1)

        reserva = Reserva.objects.create(
            fecha_reserva=timezone.now(),
            cliente=self.cliente,
            servicio=self.servicio,
            estado="confirmada",
        )
        diseno = Diseno.objects.create(
            titulo="Diseño Test",
            descripcion="Descripción",
            presupuesto=Decimal("100.00"),
            servicio=self.servicio,
            reserva=reserva,
            estado="presentado",
        )

        self.client.force_authenticate(user=self.cliente_user)
        response = self.client.post(
            reverse("diseno-aceptar-cliente", args=[diseno.id_diseno]),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        asignaciones = ReservaEmpleado.objects.filter(reserva=reserva)
        self.assertEqual(asignaciones.count(), 2)

        empleados_prioritarios = [
            empleado.id_empleado for empleado in ordenar_empleados_por_puntuacion([mejor, segundo, tercero])[:2]
        ]
        self.assertCountEqual(
            [asignacion.empleado_id for asignacion in asignaciones],
            empleados_prioritarios,
        )

        respuesta_empleados = response.data.get("empleados_asignados", [])
        self.assertEqual(
            [empleado.get("email") for empleado in respuesta_empleados],
            [mejor.persona.email, segundo.persona.email],
        )
        self.assertEqual([empleado.get("prioridad") for empleado in respuesta_empleados], [1, 2])
