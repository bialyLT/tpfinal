from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from .models import Empleado, Genero, Localidad, Persona, TipoDocumento


class EmpleadoScoringAlertsTests(TestCase):
    def setUp(self):
        self.genero = Genero.objects.create(genero="Masculino")
        self.tipo_documento = TipoDocumento.objects.create(tipo="DNI")
        self.localidad = Localidad.objects.create(cp="1000", nombre_localidad="Ciudad", nombre_provincia="Provincia")

        self.persona = Persona.objects.create(
            nombre="Juan",
            apellido="Pérez",
            email="juan.perez@example.com",
            telefono="+5491100000000",
            calle="Calle Falsa",
            numero="123",
            piso="",
            dpto="",
            nro_documento="12345678",
            genero=self.genero,
            tipo_documento=self.tipo_documento,
            localidad=self.localidad,
        )

        self.user = User.objects.create_user(
            username="juanperez",
            email=self.persona.email,
            password="pass123456",
            first_name="Juan",
            last_name="Pérez",
        )
        self.persona.user = self.user
        self.persona.save(update_fields=["user"])

        self.empleado = Empleado.objects.create(
            persona=self.persona,
            activo=True,
            puntuacion_acumulada=Decimal("70.00"),
            puntuacion_cantidad=10,
            puntuacion_promedio=Decimal("7.00"),
            fecha_ultima_puntuacion=timezone.now(),
        )

    def _registrar_encuesta(self, puntuacion_total, cantidad_items):
        self.empleado.refresh_from_db()
        self.empleado.registrar_resultado_encuesta(
            puntuacion_total=Decimal(puntuacion_total),
            cantidad_items=cantidad_items,
            timestamp=timezone.now(),
        )
        self.empleado.refresh_from_db()

    @patch("apps.users.models.EmailService.send_employee_deactivation_alert")
    def test_promedio_bajo_con_menos_de_50_no_desactiva(self, mock_alert):
        """Con menos de 50 calificaciones, un promedio bajo solo deja al empleado activo."""
        self.empleado.puntuacion_acumulada = Decimal("280.00")
        self.empleado.puntuacion_cantidad = 48
        self.empleado.puntuacion_promedio = Decimal("5.83")
        self.empleado.save(
            update_fields=["puntuacion_acumulada", "puntuacion_cantidad", "puntuacion_promedio"]
        )

        self._registrar_encuesta(puntuacion_total="4", cantidad_items=1)

        self.empleado.refresh_from_db()
        self.user.refresh_from_db()
        self.assertTrue(self.empleado.activo)
        self.assertIsNone(self.empleado.fecha_baja_automatica)
        self.assertEqual(self.empleado.puntuacion_cantidad, 49)
        self.assertLess(self.empleado.puntuacion_promedio, Decimal("6.00"))
        self.assertFalse(mock_alert.called)
        self.assertTrue(self.user.is_active)

    @patch("apps.users.models.EmailService.send_employee_deactivation_alert")
    def test_mas_de_50_calificaciones_y_promedio_bajo_generan_baja(self, mock_alert):
        """Más de 50 calificaciones con promedio menor a 6 disparan la baja automática."""
        self.empleado.puntuacion_acumulada = Decimal("280.00")
        self.empleado.puntuacion_cantidad = 48
        self.empleado.puntuacion_promedio = Decimal("5.83")
        self.empleado.save(
            update_fields=[
                "puntuacion_acumulada",
                "puntuacion_cantidad",
                "puntuacion_promedio",
            ]
        )

        self._registrar_encuesta(puntuacion_total="12", cantidad_items=3)

        self.empleado.refresh_from_db()
        self.user.refresh_from_db()
        self.assertFalse(self.empleado.activo)
        self.assertEqual(self.empleado.puntuacion_cantidad, 51)
        self.assertLess(self.empleado.puntuacion_promedio, Decimal("6.00"))
        self.assertIn("más de 50", self.empleado.motivo_baja_automatica)
        self.assertFalse(self.user.is_active)
        mock_alert.assert_called_once()

    @patch("apps.users.models.EmailService.send_employee_deactivation_alert")
    def test_calificacion_alta_resetea_contador_de_bajas(self, mock_alert):
        """Cuando recibe una calificación alta se reinicia el contador de bajas consecutivas."""
        self.empleado.puntuacion_acumulada = Decimal("300.00")
        self.empleado.puntuacion_cantidad = 30
        self.empleado.puntuacion_promedio = Decimal("10.00")
        self.empleado.evaluaciones_bajas_consecutivas = 0
        self.empleado.activo = True
        self.empleado.save(
            update_fields=[
                "puntuacion_acumulada",
                "puntuacion_cantidad",
                "puntuacion_promedio",
                "evaluaciones_bajas_consecutivas",
                "activo",
            ]
        )

        self._registrar_encuesta(puntuacion_total="15", cantidad_items=3)  # promedio 5 -> contador 1
        self.empleado.refresh_from_db()
        self.assertEqual(self.empleado.evaluaciones_bajas_consecutivas, 1)
        self.assertTrue(self.empleado.activo)

        self._registrar_encuesta(puntuacion_total="40", cantidad_items=5)  # promedio 8 -> resetea
        self.empleado.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(self.empleado.evaluaciones_bajas_consecutivas, 0)
        self.assertTrue(self.empleado.activo)
        mock_alert.assert_not_called()
        self.assertTrue(self.user.is_active)
