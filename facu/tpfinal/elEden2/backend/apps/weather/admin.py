from django.contrib import admin

from .models import AlertaClimatica, PronosticoClima


@admin.register(PronosticoClima)
class PronosticoClimaAdmin(admin.ModelAdmin):
    list_display = (
        "fecha",
        "latitud",
        "longitud",
        "precipitacion_mm",
        "probabilidad_precipitacion",
        "fuente",
        "creado_en",
    )
    list_filter = ("fuente", "fecha")
    search_fields = ("fecha", "latitud", "longitud")
    ordering = ("-fecha",)


@admin.register(AlertaClimatica)
class AlertaClimaticaAdmin(admin.ModelAdmin):
    list_display = (
        "fecha_alerta",
        "tipo_alerta",
        "estado",
        "precipitacion_mm",
        "umbral_precipitacion",
        "es_simulada",
        "reserva",
        "servicio",
    )
    list_filter = ("estado", "tipo_alerta", "es_simulada", "fuente")
    search_fields = ("mensaje", "reserva__id_reserva", "servicio__nombre")
    readonly_fields = ("creada_en", "actualizada_en", "payload_alerta")
    ordering = ("estado", "fecha_alerta")
