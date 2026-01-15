from decimal import Decimal

from django.conf import settings
from django.db import models


class PronosticoClima(models.Model):
    """Entrada de caché de pronóstico para una fecha y coordenadas."""

    SOURCE_CHOICES = (
        ("open-meteo", "Open-Meteo"),
        ("smn", "Servicio Meteorológico Nacional"),
        ("other", "Otro"),
    )

    fecha = models.DateField(db_column="date")
    latitud = models.DecimalField(max_digits=8, decimal_places=5, db_column="latitude")
    longitud = models.DecimalField(max_digits=8, decimal_places=5, db_column="longitude")
    precipitacion_mm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        db_column="precipitation_mm",
    )
    probabilidad_precipitacion = models.PositiveIntegerField(null=True, blank=True, db_column="precipitation_probability")
    resumen = models.CharField(max_length=255, blank=True, db_column="summary")
    payload_crudo = models.JSONField(default=dict, blank=True, db_column="raw_payload")
    fuente = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="open-meteo", db_column="source")
    creado_en = models.DateTimeField(auto_now_add=True, db_column="created_at")

    class Meta:
        verbose_name = "Pronóstico meteorológico"
        verbose_name_plural = "Pronósticos meteorológicos"
        db_table = "weather_forecast"
        unique_together = ("fecha", "latitud", "longitud", "fuente")
        ordering = ["-fecha"]

    def __str__(self):
        return f"Pronóstico {self.fecha} ({self.latitud}, {self.longitud})"


class AlertaClimatica(models.Model):
    """Alerta generada cuando el pronóstico supera el umbral configurado."""

    ALERT_TYPES = (
        ("rain", "Lluvia"),
        ("storm", "Tormenta"),
    )

    STATUS_CHOICES = (
        ("pending", "Pendiente"),
        ("acknowledged", "En revisión"),
        ("resolved", "Resuelta"),
    )

    reserva = models.ForeignKey(
        "servicios.Reserva",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alertas_clima",
    )
    servicio = models.ForeignKey(
        "servicios.Servicio",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alertas_clima",
    )
    pronostico = models.ForeignKey(
        PronosticoClima,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alertas_generadas",
        db_column="forecast_id",
    )
    fecha_alerta = models.DateField(db_column="alert_date")
    tipo_alerta = models.CharField(max_length=20, choices=ALERT_TYPES, default="rain", db_column="alert_type")
    latitud = models.DecimalField(max_digits=8, decimal_places=5, db_column="latitude")
    longitud = models.DecimalField(max_digits=8, decimal_places=5, db_column="longitude")
    precipitacion_mm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        db_column="precipitation_mm",
    )
    umbral_precipitacion = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("1.00"), db_column="precipitation_threshold")
    porcentaje_probabilidad = models.PositiveIntegerField(null=True, blank=True, db_column="probability_percentage")
    es_simulada = models.BooleanField(default=False, db_column="is_simulated")
    requiere_reprogramacion = models.BooleanField(default=True, db_column="requires_reprogramming")
    mensaje = models.CharField(max_length=255, blank=True, db_column="message")
    estado = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending", db_column="status")
    payload_alerta = models.JSONField(default=dict, blank=True, db_column="payload")
    fuente = models.CharField(max_length=20, default="open-meteo", db_column="source")
    disparada_por = models.CharField(max_length=50, blank=True, db_column="triggered_by")
    resuelta_en = models.DateTimeField(null=True, blank=True, db_column="resolved_at")
    resuelta_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alertas_climaticas_resueltas",
        db_column="resolved_by_id",
    )
    creada_en = models.DateTimeField(auto_now_add=True, db_column="created_at")
    actualizada_en = models.DateTimeField(auto_now=True, db_column="updated_at")

    class Meta:
        verbose_name = "Alerta climática"
        verbose_name_plural = "Alertas climáticas"
        db_table = "weather_alert"
        ordering = ["estado", "fecha_alerta"]

    def __str__(self):
        destino = f"Reserva {self.reserva_id}" if self.reserva_id else "General"
        return f"Alerta {self.get_tipo_alerta_display()} {self.fecha_alerta} - {destino}"

    @property
    def rain_expected(self):
        if self.precipitacion_mm is None:
            return False
        return self.precipitacion_mm >= (self.umbral_precipitacion or Decimal("1.00"))
