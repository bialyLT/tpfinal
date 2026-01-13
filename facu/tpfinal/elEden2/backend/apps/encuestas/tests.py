from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from apps.encuestas.models import Encuesta, Pregunta
from apps.servicios.models import Reserva, ReservaEmpleado, Servicio
from apps.users.models import Cliente, Empleado, Genero, Localidad, Persona, TipoDocumento


class EncuestaEmailNotificationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.genero = Genero.objects.create(genero="Otro")
        cls.tipo_documento = TipoDocumento.objects.create(tipo="DNI")
        cls.localidad = Localidad.objects.create(cp="0000", nombre_localidad="Ciudad", nombre_provincia="Provincia")

        # Cliente + user autenticado
        cls.persona_cliente = Persona.objects.create(
            nombre="Test",
            apellido="Cliente",
            email="cliente@example.com",
            telefono="+541122223334",
            calle="Principal",
            numero="123",
            piso="1",
            dpto="A",
            nro_documento="12345678",
            genero=cls.genero,
            tipo_documento=cls.tipo_documento,
            localidad=cls.localidad,
        )
        cls.cliente = Cliente.objects.create(persona=cls.persona_cliente)
        User = get_user_model()
        cls.user_cliente = User.objects.create_user(
            username="cliente",
            email=cls.persona_cliente.email,
            password="cliente-pass-123",
        )

        # Empleado asignado
        cls.persona_empleado = Persona.objects.create(
            nombre="Test",
            apellido="Empleado",
            email="empleado@example.com",
            telefono="+541199999999",
            calle="Secundaria",
            numero="456",
            piso="2",
            dpto="B",
            nro_documento="87654321",
            genero=cls.genero,
            tipo_documento=cls.tipo_documento,
            localidad=cls.localidad,
        )
        cls.empleado = Empleado.objects.create(persona=cls.persona_empleado)

        cls.servicio = Servicio.objects.create(nombre="Corte")

        # Encuesta activa + pregunta que impacta puntuación
        cls.encuesta = Encuesta.objects.create(titulo="Satisfacción", activa=True)
        cls.pregunta = Pregunta.objects.create(
            encuesta=cls.encuesta,
            texto="¿Cómo calificarías el servicio?",
            tipo="escala",
            obligatoria=True,
            impacta_puntuacion=True,
        )

    def setUp(self):
        self.client.force_login(self.user_cliente)

    def test_responder_encuesta_notifica_a_empleados_asignados(self):
        reserva = Reserva.objects.create(
            fecha_cita=timezone.now() + timedelta(days=1),
            cliente=self.cliente,
            servicio=self.servicio,
            estado="completada",
            direccion="Calle Falsa 123",
        )
        ReservaEmpleado.objects.create(reserva=reserva, empleado=self.empleado, rol="operador")

        payload = {
            "reserva_id": reserva.id_reserva,
            "respuestas": [
                {
                    "pregunta_id": self.pregunta.id_pregunta,
                    "valor_numerico": 8,
                    "valor_texto": "bien",
                }
            ],
        }

        with patch("apps.emails.services.EmailService.send_survey_score_notification_to_employees") as mock_notify:
            response = self.client.post(reverse("encuesta-responder"), payload, content_type="application/json")

        self.assertEqual(response.status_code, 201)
        mock_notify.assert_called_once()
        call_kwargs = mock_notify.call_args.kwargs
        self.assertEqual(call_kwargs["reserva"].id_reserva, reserva.id_reserva)

        # Asegurar que no se manda el nombre del cliente como argumento
        self.assertNotIn("cliente_nombre", call_kwargs)
        self.assertNotIn("cliente", call_kwargs)
