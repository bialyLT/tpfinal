from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from apps.servicios.models import Reserva, Servicio
from apps.users.models import Cliente, Genero, Localidad, Persona, TipoDocumento
from apps.weather.models import WeatherAlert
from apps.weather.services import ForecastResult


class WeatherEndpointTests(TestCase):
    """Cover the weather endpoints that orchestrate alert creation and listing."""

    @classmethod
    def setUpTestData(cls):
        cls.genero = Genero.objects.create(genero="Otro")
        cls.tipo_documento = TipoDocumento.objects.create(tipo="DNI")
        cls.localidad = Localidad.objects.create(cp="0000", nombre_localidad="Ciudad", nombre_provincia="Provincia")
        cls.persona = Persona.objects.create(
            nombre="Test",
            apellido="Cliente",
            email="testcliente@example.com",
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
        cls.cliente = Cliente.objects.create(persona=cls.persona)
        cls.reprogramable_service = Servicio.objects.create(
            nombre="Servicio reprogramable", reprogramable_por_clima=True
        )
        cls.non_reprogramable_service = Servicio.objects.create(nombre="Servicio fijo", reprogramable_por_clima=False)
        User = get_user_model()
        cls.admin_user = User.objects.create_superuser(
            username="admin", email="admin@example.com", password="adminpass123"
        )

    def setUp(self):
        self.client.force_login(self.admin_user)

    def _create_reserva(self, servicio, estado="pendiente", fecha=None):
        fecha = fecha or (timezone.now() + timedelta(days=2))
        return Reserva.objects.create(
            fecha_cita=fecha,
            cliente=self.cliente,
            servicio=servicio,
            estado=estado,
            direccion="Calle Falsa 123",
        )

    def test_weather_check_creates_alert_for_reserva(self):
        """The check endpoint should create an alert when rain is predicted."""

        reserva = self._create_reserva(servicio=self.reprogramable_service)
        with (
            patch("apps.weather.services.WeatherClient.get_daily_forecast") as mock_forecast,
            patch("apps.emails.services.EmailService.send_weather_alert_notification") as mock_send_email,
        ):
            mock_forecast.return_value = ForecastResult(
                date=reserva.fecha_cita,
                precipitation_mm=Decimal("5.00"),
                precipitation_probability=80,
                latitude=Decimal("10.12345"),
                longitude=Decimal("-65.12345"),
                raw={"source": "test"},
            )
            payload = {"reserva_id": reserva.id_reserva}
            response = self.client.post(reverse("weather-check"), payload, content_type="application/json")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["rain_expected"])
        self.assertIn("alert_id", data)
        alert = WeatherAlert.objects.get(id=data["alert_id"])
        self.assertFalse(alert.is_simulated)
        self.assertEqual(alert.reserva, reserva)
        mock_send_email.assert_called_once()

    def test_weather_simulate_endpoint_creates_simulated_alert(self):
        """Simulate should allow manual alert creation for reprogrammable services."""

        reserva = self._create_reserva(servicio=self.reprogramable_service)
        payload = {
            "reserva_id": reserva.id_reserva,
            "precipitation_mm": "8.5",
            "message": "Prueba de simulación",
        }
        with patch("apps.emails.services.EmailService.send_weather_alert_notification") as mock_send_email:
            response = self.client.post(reverse("weather-simulate"), payload, content_type="application/json")

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertTrue(body["is_simulated"])
        alert = WeatherAlert.objects.get(reserva=reserva)
        self.assertTrue(alert.is_simulated)
        self.assertEqual(str(alert.precipitation_mm), "8.50")
        self.assertEqual(body["message"], alert.message)
        mock_send_email.assert_called_once()

    def test_pending_alerts_endpoint_returns_pending_only(self):
        """Pending alerts should only return reprogrammable pendings."""

        WeatherAlert.objects.create(
            reserva=self._create_reserva(servicio=self.reprogramable_service),
            servicio=self.reprogramable_service,
            alert_date=timezone.now().date(),
            latitude=Decimal("0.00000"),
            longitude=Decimal("0.00000"),
            precipitation_mm=Decimal("5.00"),
            precipitation_threshold=Decimal("1.00"),
            probability_percentage=60,
            message="Alerta pendiente",
            payload={},
            source="test",
            status="pending",
        )
        WeatherAlert.objects.create(
            reserva=self._create_reserva(servicio=self.non_reprogramable_service),
            servicio=self.non_reprogramable_service,
            alert_date=timezone.now().date(),
            latitude=Decimal("1.00000"),
            longitude=Decimal("1.00000"),
            precipitation_mm=Decimal("2.00"),
            precipitation_threshold=Decimal("1.00"),
            probability_percentage=20,
            message="No reprogramable",
            payload={},
            source="test",
            status="pending",
        )
        WeatherAlert.objects.create(
            reserva=self._create_reserva(servicio=self.reprogramable_service),
            servicio=self.reprogramable_service,
            alert_date=timezone.now().date(),
            latitude=Decimal("2.00000"),
            longitude=Decimal("2.00000"),
            precipitation_mm=Decimal("3.00"),
            precipitation_threshold=Decimal("1.00"),
            probability_percentage=40,
            message="Ya resuelta",
            payload={},
            source="test",
            status="resolved",
        )

        response = self.client.get(reverse("weather-alerts-pending"))

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["status"], "pending")
        self.assertEqual(body[0]["servicio_nombre"], self.reprogramable_service.nombre)
        self.assertTrue(body[0]["reserva_detalle"]["reprogramable_por_clima"])

    def test_eligible_reservations_endpoint_filters_entries(self):
        """Only future, reprogrammable reservations with allowed states surface."""

        fecha_base = timezone.now()
        reserva_valida = self._create_reserva(
            servicio=self.reprogramable_service,
            estado="confirmada",
            fecha=fecha_base + timedelta(days=1),
        )
        self._create_reserva(
            servicio=self.reprogramable_service,
            estado="completada",
            fecha=fecha_base + timedelta(days=2),
        )
        self._create_reserva(
            servicio=self.non_reprogramable_service,
            estado="pendiente",
            fecha=fecha_base + timedelta(days=3),
        )

        response = self.client.get(reverse("weather-eligible-reservations"))

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body), 1)
        reserva_payload = body[0]
        self.assertEqual(reserva_payload["id_reserva"], reserva_valida.id_reserva)
        self.assertIn("cliente", reserva_payload)
        self.assertEqual(reserva_payload["servicio"], self.reprogramable_service.nombre)
