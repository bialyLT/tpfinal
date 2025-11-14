from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models


class WeatherForecast(models.Model):
    """Forecast cache entry for a specific day and coordinates."""

    SOURCE_CHOICES = (
        ('open-meteo', 'Open-Meteo'),
        ('smn', 'Servicio Meteorológico Nacional'),
        ('other', 'Otro'),
    )

    date = models.DateField()
    latitude = models.DecimalField(max_digits=8, decimal_places=5)
    longitude = models.DecimalField(max_digits=8, decimal_places=5)
    precipitation_mm = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    precipitation_probability = models.PositiveIntegerField(null=True, blank=True)
    summary = models.CharField(max_length=255, blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='open-meteo')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Pronóstico meteorológico'
        verbose_name_plural = 'Pronósticos meteorológicos'
        db_table = 'weather_forecast'
        unique_together = ('date', 'latitude', 'longitude', 'source')
        ordering = ['-date']

    def __str__(self):
        return f"Pronóstico {self.date} ({self.latitude}, {self.longitude})"


class WeatherAlert(models.Model):
    """Alert raised when rain probability exceeds threshold for a reservation/service."""

    ALERT_TYPES = (
        ('rain', 'Lluvia'),
        ('storm', 'Tormenta'),
    )

    STATUS_CHOICES = (
        ('pending', 'Pendiente'),
        ('acknowledged', 'En revisión'),
        ('resolved', 'Resuelta'),
    )

    reserva = models.ForeignKey(
        'servicios.Reserva',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertas_clima'
    )
    servicio = models.ForeignKey(
        'servicios.Servicio',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertas_clima'
    )
    forecast = models.ForeignKey(
        WeatherForecast,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertas_generadas'
    )
    alert_date = models.DateField()
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES, default='rain')
    latitude = models.DecimalField(max_digits=8, decimal_places=5)
    longitude = models.DecimalField(max_digits=8, decimal_places=5)
    precipitation_mm = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    precipitation_threshold = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('1.00'))
    probability_percentage = models.PositiveIntegerField(null=True, blank=True)
    is_simulated = models.BooleanField(default=False)
    requires_reprogramming = models.BooleanField(default=True)
    message = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payload = models.JSONField(default=dict, blank=True)
    source = models.CharField(max_length=20, default='open-meteo')
    triggered_by = models.CharField(max_length=50, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='weather_alerts_resueltas'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Alerta climática'
        verbose_name_plural = 'Alertas climáticas'
        db_table = 'weather_alert'
        ordering = ['status', 'alert_date']

    def __str__(self):
        destino = f"Reserva {self.reserva_id}" if self.reserva_id else 'General'
        return f"Alerta {self.get_alert_type_display()} {self.alert_date} - {destino}"

    @property
    def rain_expected(self):
        if self.precipitation_mm is None:
            return False
        return self.precipitation_mm >= (self.precipitation_threshold or Decimal('1.00'))
