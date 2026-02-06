from django.utils import timezone
from rest_framework import serializers

from .models import AlertaClimatica, PronosticoClima


class PronosticoClimaSerializer(serializers.ModelSerializer):
    date = serializers.DateField(source="fecha", read_only=True)
    latitude = serializers.DecimalField(max_digits=8, decimal_places=5, source="latitud", read_only=True)
    longitude = serializers.DecimalField(max_digits=8, decimal_places=5, source="longitud", read_only=True)
    precipitation_mm = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        source="precipitacion_mm",
        read_only=True,
        allow_null=True,
    )
    precipitation_probability = serializers.IntegerField(source="probabilidad_precipitacion", read_only=True)
    summary = serializers.CharField(source="resumen", read_only=True)
    source = serializers.CharField(source="fuente", read_only=True)
    raw_payload = serializers.JSONField(source="payload_crudo", read_only=True)

    class Meta:
        model = PronosticoClima
        fields = [
            "id",
            "date",
            "latitude",
            "longitude",
            "precipitation_mm",
            "precipitation_probability",
            "summary",
            "source",
            "raw_payload",
        ]
        read_only_fields = fields


class AlertaClimaticaSerializer(serializers.ModelSerializer):
    alert_date = serializers.DateField(source="fecha_alerta", read_only=True)
    alert_type = serializers.CharField(source="tipo_alerta", read_only=True)
    status = serializers.CharField(source="estado", read_only=True)
    message = serializers.CharField(source="mensaje", read_only=True)
    source = serializers.CharField(source="fuente", read_only=True)
    latitude = serializers.DecimalField(max_digits=8, decimal_places=5, source="latitud", read_only=True)
    longitude = serializers.DecimalField(max_digits=8, decimal_places=5, source="longitud", read_only=True)
    precipitation_mm = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        source="precipitacion_mm",
        read_only=True,
        allow_null=True,
    )
    precipitation_threshold = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        source="umbral_precipitacion",
        read_only=True,
    )
    probability_percentage = serializers.IntegerField(source="porcentaje_probabilidad", read_only=True)
    is_simulated = serializers.BooleanField(source="es_simulada", read_only=True)
    requires_reprogramming = serializers.BooleanField(source="requiere_reprogramacion", read_only=True)
    payload = serializers.JSONField(source="payload_alerta", read_only=True)
    triggered_by = serializers.CharField(source="disparada_por", read_only=True)
    resolved_at = serializers.DateTimeField(source="resuelta_en", read_only=True, allow_null=True)
    resolved_by = serializers.PrimaryKeyRelatedField(source="resuelta_por", read_only=True)
    created_at = serializers.DateTimeField(source="creada_en", read_only=True)

    reserva_detalle = serializers.SerializerMethodField()
    servicio_nombre = serializers.SerializerMethodField()

    class Meta:
        model = AlertaClimatica
        fields = [
            "id",
            "alert_date",
            "alert_type",
            "status",
            "message",
            "source",
            "latitude",
            "longitude",
            "precipitation_mm",
            "precipitation_threshold",
            "probability_percentage",
            "is_simulated",
            "requires_reprogramming",
            "payload",
            "reserva",
            "servicio",
            "servicio_nombre",
            "reserva_detalle",
            "triggered_by",
            "resolved_at",
            "resolved_by",
            "created_at",
        ]
        read_only_fields = fields

    def get_reserva_detalle(self, obj):
        if not obj.reserva:
            return None
        reserva = obj.reserva
        return {
            "id_reserva": reserva.id_reserva,
            # Mantener la clave `fecha_reserva` por compatibilidad, pero usar el nuevo campo.
            "fecha_reserva": getattr(reserva, "fecha_cita", None),
            "fecha_reprogramada_sugerida": reserva.fecha_reprogramada_sugerida,
            "fecha_reprogramada_confirmada": reserva.fecha_reprogramada_confirmada,
            "estado": reserva.estado,
            "cliente": (
                f"{reserva.cliente.persona.nombre} {reserva.cliente.persona.apellido}" if reserva.cliente_id else None
            ),
            "servicio": reserva.servicio.nombre if reserva.servicio_id else None,
            "direccion": reserva.direccion,
            "reprogramable_por_clima": (reserva.servicio.reprogramable_por_clima if reserva.servicio_id else False),
        }

    def get_servicio_nombre(self, obj):
        if obj.servicio:
            return obj.servicio.nombre
        if obj.reserva and obj.reserva.servicio:
            return obj.reserva.servicio.nombre
        return None


class SimulacionClimaSerializer(serializers.Serializer):
    alert_date = serializers.DateField(required=True)
    message = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_alert_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError("La fecha debe ser hoy o una fecha futura")
        return value


class ChequeoClimaSerializer(serializers.Serializer):
    reserva_id = serializers.IntegerField(required=False)
    date = serializers.DateField(required=False)
    latitude = serializers.DecimalField(max_digits=8, decimal_places=5, required=False)
    longitude = serializers.DecimalField(max_digits=8, decimal_places=5, required=False)

    def validate(self, attrs):
        if not attrs.get("reserva_id") and not (attrs.get("date") and attrs.get("latitude") and attrs.get("longitude")):
            raise serializers.ValidationError("Debe enviar una reserva o bien fecha + coordenadas")
        return attrs
