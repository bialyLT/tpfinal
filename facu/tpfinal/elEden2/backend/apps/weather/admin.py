from django.contrib import admin

from .models import WeatherAlert, WeatherForecast


@admin.register(WeatherForecast)
class WeatherForecastAdmin(admin.ModelAdmin):
    list_display = ('date', 'latitude', 'longitude', 'precipitation_mm', 'precipitation_probability', 'source', 'created_at')
    list_filter = ('source', 'date')
    search_fields = ('date', 'latitude', 'longitude')
    ordering = ('-date',)


@admin.register(WeatherAlert)
class WeatherAlertAdmin(admin.ModelAdmin):
    list_display = (
        'alert_date', 'alert_type', 'status', 'precipitation_mm',
        'precipitation_threshold', 'is_simulated', 'reserva', 'servicio',
    )
    list_filter = ('status', 'alert_type', 'is_simulated', 'source')
    search_fields = ('message', 'reserva__id_reserva', 'servicio__nombre')
    readonly_fields = ('created_at', 'updated_at', 'payload')
    ordering = ('status', 'alert_date')
