from rest_framework import serializers
from .models import Servicio, Reserva


class ServicioSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    
    class Meta:
        model = Servicio
        fields = '__all__'


class ReservaSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.persona.nombre', read_only=True)
    cliente_apellido = serializers.CharField(source='cliente.persona.apellido', read_only=True)
    servicio_nombre = serializers.CharField(source='servicio.nombre', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    
    class Meta:
        model = Reserva
        fields = '__all__'
        read_only_fields = ('fecha_solicitud',)
