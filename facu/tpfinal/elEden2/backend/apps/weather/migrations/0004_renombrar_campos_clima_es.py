from decimal import Decimal

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("weather", "0003_alter_related_name_alerta_resuelta"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                # PronosticoClima
                migrations.RenameField(
                    model_name="pronosticoclima",
                    old_name="date",
                    new_name="fecha",
                ),
                migrations.AlterField(
                    model_name="pronosticoclima",
                    name="fecha",
                    field=models.DateField(db_column="date"),
                ),
                migrations.RenameField(
                    model_name="pronosticoclima",
                    old_name="latitude",
                    new_name="latitud",
                ),
                migrations.AlterField(
                    model_name="pronosticoclima",
                    name="latitud",
                    field=models.DecimalField(db_column="latitude", decimal_places=5, max_digits=8),
                ),
                migrations.RenameField(
                    model_name="pronosticoclima",
                    old_name="longitude",
                    new_name="longitud",
                ),
                migrations.AlterField(
                    model_name="pronosticoclima",
                    name="longitud",
                    field=models.DecimalField(db_column="longitude", decimal_places=5, max_digits=8),
                ),
                migrations.RenameField(
                    model_name="pronosticoclima",
                    old_name="precipitation_mm",
                    new_name="precipitacion_mm",
                ),
                migrations.AlterField(
                    model_name="pronosticoclima",
                    name="precipitacion_mm",
                    field=models.DecimalField(
                        blank=True,
                        null=True,
                        db_column="precipitation_mm",
                        decimal_places=2,
                        max_digits=6,
                    ),
                ),
                migrations.RenameField(
                    model_name="pronosticoclima",
                    old_name="precipitation_probability",
                    new_name="probabilidad_precipitacion",
                ),
                migrations.AlterField(
                    model_name="pronosticoclima",
                    name="probabilidad_precipitacion",
                    field=models.PositiveIntegerField(blank=True, null=True, db_column="precipitation_probability"),
                ),
                migrations.RenameField(
                    model_name="pronosticoclima",
                    old_name="summary",
                    new_name="resumen",
                ),
                migrations.AlterField(
                    model_name="pronosticoclima",
                    name="resumen",
                    field=models.CharField(blank=True, db_column="summary", max_length=255),
                ),
                migrations.RenameField(
                    model_name="pronosticoclima",
                    old_name="raw_payload",
                    new_name="payload_crudo",
                ),
                migrations.AlterField(
                    model_name="pronosticoclima",
                    name="payload_crudo",
                    field=models.JSONField(blank=True, db_column="raw_payload", default=dict),
                ),
                migrations.RenameField(
                    model_name="pronosticoclima",
                    old_name="source",
                    new_name="fuente",
                ),
                migrations.AlterField(
                    model_name="pronosticoclima",
                    name="fuente",
                    field=models.CharField(
                        choices=[
                            ("open-meteo", "Open-Meteo"),
                            ("smn", "Servicio Meteorológico Nacional"),
                            ("other", "Otro"),
                        ],
                        db_column="source",
                        default="open-meteo",
                        max_length=20,
                    ),
                ),
                migrations.RenameField(
                    model_name="pronosticoclima",
                    old_name="created_at",
                    new_name="creado_en",
                ),
                migrations.AlterField(
                    model_name="pronosticoclima",
                    name="creado_en",
                    field=models.DateTimeField(auto_now_add=True, db_column="created_at"),
                ),
                migrations.AlterUniqueTogether(
                    name="pronosticoclima",
                    unique_together={("fecha", "latitud", "longitud", "fuente")},
                ),
                migrations.AlterModelOptions(
                    name="pronosticoclima",
                    options={
                        "ordering": ["-fecha"],
                        "verbose_name": "Pronóstico meteorológico",
                        "verbose_name_plural": "Pronósticos meteorológicos",
                    },
                ),
                # AlertaClimatica
                migrations.RenameField(
                    model_name="alertaclimatica",
                    old_name="forecast",
                    new_name="pronostico",
                ),
                migrations.AlterField(
                    model_name="alertaclimatica",
                    name="pronostico",
                    field=models.ForeignKey(
                        blank=True,
                        null=True,
                        db_column="forecast_id",
                        on_delete=models.SET_NULL,
                        related_name="alertas_generadas",
                        to="weather.pronosticoclima",
                    ),
                ),
                migrations.RenameField(
                    model_name="alertaclimatica",
                    old_name="alert_date",
                    new_name="fecha_alerta",
                ),
                migrations.AlterField(
                    model_name="alertaclimatica",
                    name="fecha_alerta",
                    field=models.DateField(db_column="alert_date"),
                ),
                migrations.RenameField(
                    model_name="alertaclimatica",
                    old_name="alert_type",
                    new_name="tipo_alerta",
                ),
                migrations.AlterField(
                    model_name="alertaclimatica",
                    name="tipo_alerta",
                    field=models.CharField(
                        choices=[("rain", "Lluvia"), ("storm", "Tormenta")],
                        db_column="alert_type",
                        default="rain",
                        max_length=20,
                    ),
                ),
                migrations.RenameField(
                    model_name="alertaclimatica",
                    old_name="latitude",
                    new_name="latitud",
                ),
                migrations.AlterField(
                    model_name="alertaclimatica",
                    name="latitud",
                    field=models.DecimalField(db_column="latitude", decimal_places=5, max_digits=8),
                ),
                migrations.RenameField(
                    model_name="alertaclimatica",
                    old_name="longitude",
                    new_name="longitud",
                ),
                migrations.AlterField(
                    model_name="alertaclimatica",
                    name="longitud",
                    field=models.DecimalField(db_column="longitude", decimal_places=5, max_digits=8),
                ),
                migrations.RenameField(
                    model_name="alertaclimatica",
                    old_name="precipitation_mm",
                    new_name="precipitacion_mm",
                ),
                migrations.AlterField(
                    model_name="alertaclimatica",
                    name="precipitacion_mm",
                    field=models.DecimalField(
                        blank=True,
                        null=True,
                        db_column="precipitation_mm",
                        decimal_places=2,
                        max_digits=6,
                    ),
                ),
                migrations.RenameField(
                    model_name="alertaclimatica",
                    old_name="precipitation_threshold",
                    new_name="umbral_precipitacion",
                ),
                migrations.AlterField(
                    model_name="alertaclimatica",
                    name="umbral_precipitacion",
                    field=models.DecimalField(
                        db_column="precipitation_threshold",
                        decimal_places=2,
                        default=Decimal("1.00"),
                        max_digits=6,
                    ),
                ),
                migrations.RenameField(
                    model_name="alertaclimatica",
                    old_name="probability_percentage",
                    new_name="porcentaje_probabilidad",
                ),
                migrations.AlterField(
                    model_name="alertaclimatica",
                    name="porcentaje_probabilidad",
                    field=models.PositiveIntegerField(blank=True, null=True, db_column="probability_percentage"),
                ),
                migrations.RenameField(
                    model_name="alertaclimatica",
                    old_name="is_simulated",
                    new_name="es_simulada",
                ),
                migrations.AlterField(
                    model_name="alertaclimatica",
                    name="es_simulada",
                    field=models.BooleanField(db_column="is_simulated", default=False),
                ),
                migrations.RenameField(
                    model_name="alertaclimatica",
                    old_name="requires_reprogramming",
                    new_name="requiere_reprogramacion",
                ),
                migrations.AlterField(
                    model_name="alertaclimatica",
                    name="requiere_reprogramacion",
                    field=models.BooleanField(db_column="requires_reprogramming", default=True),
                ),
                migrations.RenameField(
                    model_name="alertaclimatica",
                    old_name="message",
                    new_name="mensaje",
                ),
                migrations.AlterField(
                    model_name="alertaclimatica",
                    name="mensaje",
                    field=models.CharField(blank=True, db_column="message", max_length=255),
                ),
                migrations.RenameField(
                    model_name="alertaclimatica",
                    old_name="status",
                    new_name="estado",
                ),
                migrations.AlterField(
                    model_name="alertaclimatica",
                    name="estado",
                    field=models.CharField(
                        choices=[
                            ("pending", "Pendiente"),
                            ("acknowledged", "En revisión"),
                            ("resolved", "Resuelta"),
                        ],
                        db_column="status",
                        default="pending",
                        max_length=20,
                    ),
                ),
                migrations.RenameField(
                    model_name="alertaclimatica",
                    old_name="payload",
                    new_name="payload_alerta",
                ),
                migrations.AlterField(
                    model_name="alertaclimatica",
                    name="payload_alerta",
                    field=models.JSONField(blank=True, db_column="payload", default=dict),
                ),
                migrations.RenameField(
                    model_name="alertaclimatica",
                    old_name="source",
                    new_name="fuente",
                ),
                migrations.AlterField(
                    model_name="alertaclimatica",
                    name="fuente",
                    field=models.CharField(db_column="source", default="open-meteo", max_length=20),
                ),
                migrations.RenameField(
                    model_name="alertaclimatica",
                    old_name="triggered_by",
                    new_name="disparada_por",
                ),
                migrations.AlterField(
                    model_name="alertaclimatica",
                    name="disparada_por",
                    field=models.CharField(blank=True, db_column="triggered_by", max_length=50),
                ),
                migrations.RenameField(
                    model_name="alertaclimatica",
                    old_name="resolved_at",
                    new_name="resuelta_en",
                ),
                migrations.AlterField(
                    model_name="alertaclimatica",
                    name="resuelta_en",
                    field=models.DateTimeField(blank=True, null=True, db_column="resolved_at"),
                ),
                migrations.RenameField(
                    model_name="alertaclimatica",
                    old_name="resolved_by",
                    new_name="resuelta_por",
                ),
                migrations.AlterField(
                    model_name="alertaclimatica",
                    name="resuelta_por",
                    field=models.ForeignKey(
                        blank=True,
                        null=True,
                        db_column="resolved_by_id",
                        on_delete=models.SET_NULL,
                        related_name="alertas_climaticas_resueltas",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                migrations.RenameField(
                    model_name="alertaclimatica",
                    old_name="created_at",
                    new_name="creada_en",
                ),
                migrations.AlterField(
                    model_name="alertaclimatica",
                    name="creada_en",
                    field=models.DateTimeField(auto_now_add=True, db_column="created_at"),
                ),
                migrations.RenameField(
                    model_name="alertaclimatica",
                    old_name="updated_at",
                    new_name="actualizada_en",
                ),
                migrations.AlterField(
                    model_name="alertaclimatica",
                    name="actualizada_en",
                    field=models.DateTimeField(auto_now=True, db_column="updated_at"),
                ),
                migrations.AlterModelOptions(
                    name="alertaclimatica",
                    options={
                        "ordering": ["estado", "fecha_alerta"],
                        "verbose_name": "Alerta climática",
                        "verbose_name_plural": "Alertas climáticas",
                    },
                ),
            ],
        ),
    ]
