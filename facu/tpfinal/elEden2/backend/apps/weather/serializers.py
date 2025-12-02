from django.utils import timezone
from rest_framework import serializers

from .models import WeatherAlert, WeatherForecast


class WeatherForecastSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeatherForecast
        fields = [
            'id', 'date', 'latitude', 'longitude', 'precipitation_mm',
            'precipitation_probability', 'summary', 'source', 'raw_payload',
        ]
        read_only_fields = fields


class WeatherAlertSerializer(serializers.ModelSerializer):
    reserva_detalle = serializers.SerializerMethodField()
    servicio_nombre = serializers.SerializerMethodField()

    class Meta:
        model = WeatherAlert
        fields = [
            'id', 'alert_date', 'alert_type', 'status', 'message', 'source',
            'latitude', 'longitude', 'precipitation_mm', 'precipitation_threshold',
            'probability_percentage', 'is_simulated', 'requires_reprogramming',
            'payload', 'reserva', 'servicio', 'servicio_nombre', 'reserva_detalle',
            'triggered_by', 'created_at'
        ]
        read_only_fields = fields

    def get_reserva_detalle(self, obj):
        if not obj.reserva:
            return None
        reserva = obj.reserva
        return {
            'id_reserva': reserva.id_reserva,
            'fecha_reserva': reserva.fecha_reserva,
            'estado': reserva.estado,
            'cliente': f"{reserva.cliente.persona.nombre} {reserva.cliente.persona.apellido}" if reserva.cliente_id else None,
            'servicio': reserva.servicio.nombre if reserva.servicio_id else None,
            'direccion': reserva.direccion,
            'reprogramable_por_clima': reserva.servicio.reprogramable_por_clima if reserva.servicio_id else False,
        }

    def get_servicio_nombre(self, obj):
        if obj.servicio:
            return obj.servicio.nombre
        if obj.reserva and obj.reserva.servicio:
            return obj.reserva.servicio.nombre
        return None


class WeatherSimulationSerializer(serializers.Serializer):
    alert_date = serializers.DateField(required=True)
    message = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_alert_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError('La fecha debe ser hoy o una fecha futura')
        return value


class WeatherCheckSerializer(serializers.Serializer):
    reserva_id = serializers.IntegerField(required=False)
    date = serializers.DateField(required=False)
    latitude = serializers.DecimalField(max_digits=8, decimal_places=5, required=False)
    longitude = serializers.DecimalField(max_digits=8, decimal_places=5, required=False)

    def validate(self, attrs):
        if not attrs.get('reserva_id') and not (attrs.get('date') and attrs.get('latitude') and attrs.get('longitude')):
            raise serializers.ValidationError('Debe enviar una reserva o bien fecha + coordenadas')
        return attrs
