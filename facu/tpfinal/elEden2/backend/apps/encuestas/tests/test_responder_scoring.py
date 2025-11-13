from decimal import Decimal
from django.contrib.auth.models import Group, User
from django.utils import timezone
from rest_framework import status
from rest_framework.reverse import reverse
from rest_framework.test import APITestCase

from apps.encuestas.models import Encuesta, Pregunta
from apps.servicios.models import Reserva, Servicio
from apps.users.models import (
    Cliente,
    Empleado,
    Genero,
    Localidad,
    Persona,
    TipoDocumento,
)


class EncuestaScoringTests(APITestCase):
    def setUp(self):
        self.genero = Genero.objects.create(genero="Masculino")
        self.tipo_documento = TipoDocumento.objects.create(tipo="DNI")
        self.localidad = Localidad.objects.create(
            cp="1234",
            nombre_localidad="Ciudad",
            nombre_provincia="Provincia",
        )

        self.cliente_user = User.objects.create_user(
            username="cliente",
            email="cliente@example.com",
            password="pass1234",
        )
        self.persona_cliente = Persona.objects.create(
            user=self.cliente_user,
            nombre="Cliente",
            apellido="Ejemplo",
            email=self.cliente_user.email,
            telefono="123456789",
            calle="Calle",
            numero="123",
            piso="",
            dpto="",
            nro_documento="12345678",
            genero=self.genero,
            tipo_documento=self.tipo_documento,
            localidad=self.localidad,
        )
        self.cliente = Cliente.objects.create(persona=self.persona_cliente)

        self.empleado_user = User.objects.create_user(
            username="empleado",
            email="empleado@example.com",
            password="pass1234",
        )
        empleados_group, _ = Group.objects.get_or_create(name="Empleados")
        self.empleado_user.groups.add(empleados_group)
        self.persona_empleado = Persona.objects.create(
            user=self.empleado_user,
            nombre="Empleado",
            apellido="Ejemplo",
            email=self.empleado_user.email,
            telefono="987654321",
            calle="Otra Calle",
            numero="321",
            piso="",
            dpto="",
            nro_documento="87654321",
            genero=self.genero,
            tipo_documento=self.tipo_documento,
            localidad=self.localidad,
        )
        self.empleado = Empleado.objects.create(persona=self.persona_empleado, cargo="Operador")

        self.servicio = Servicio.objects.create(nombre="Servicio Test")
        self.reserva = Reserva.objects.create(
            fecha_reserva=timezone.now(),
            cliente=self.cliente,
            servicio=self.servicio,
        )
        self.reserva.empleados.add(self.empleado)

        self.encuesta = Encuesta.objects.create(titulo="Encuesta", activa=True)
        self.pregunta = Pregunta.objects.create(
            encuesta=self.encuesta,
            texto="Califica el servicio",
            tipo="escala",
            orden=1,
            obligatoria=True,
            impacta_puntuacion=True,
        )

        self.client.force_authenticate(user=self.cliente_user)

    def test_responder_encuesta_actualiza_puntuacion_empleado(self):
        url = reverse("encuesta-responder")
        response = self.client.post(
            url,
            {
                "reserva_id": self.reserva.id_reserva,
                "respuestas": [
                    {
                        "pregunta_id": self.pregunta.id_pregunta,
                        "valor_numerico": 5,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.empleado.refresh_from_db()
        self.assertEqual(self.empleado.puntuacion_cantidad, 1)
        self.assertEqual(self.empleado.puntuacion_acumulada, Decimal("5.00"))
        self.assertEqual(self.empleado.puntuacion_promedio, Decimal("5.00"))
        self.assertIsNotNone(self.empleado.fecha_ultima_puntuacion)

    def test_pregunta_sin_impacto_no_actualiza_puntuacion(self):
        self.pregunta.impacta_puntuacion = False
        self.pregunta.save(update_fields=["impacta_puntuacion"])

        url = reverse("encuesta-responder")
        response = self.client.post(
            url,
            {
                "reserva_id": self.reserva.id_reserva,
                "respuestas": [
                    {
                        "pregunta_id": self.pregunta.id_pregunta,
                        "valor_numerico": 3,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.empleado.refresh_from_db()
        self.assertEqual(self.empleado.puntuacion_cantidad, 0)
        self.assertEqual(self.empleado.puntuacion_acumulada, Decimal("0.00"))
        self.assertEqual(self.empleado.puntuacion_promedio, Decimal("0.00"))
        self.assertIsNone(self.empleado.fecha_ultima_puntuacion)
