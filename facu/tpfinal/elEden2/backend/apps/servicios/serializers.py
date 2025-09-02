from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    TipoServicio, SolicitudServicio, PropuestaDiseño,
    Servicio, EmpleadoDisponibilidad, ActualizacionServicio
)


class TipoServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoServicio
        fields = '__all__'


class SolicitudServicioSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.get_full_name', read_only=True)
    tipo_servicio_nombre = serializers.CharField(source='tipo_servicio.nombre', read_only=True)

    class Meta:
        model = SolicitudServicio
        fields = '__all__'
        read_only_fields = ('cliente', 'fecha_solicitud')


class PropuestaDiseñoSerializer(serializers.ModelSerializer):
    diseñador_nombre = serializers.CharField(source='diseñador.get_full_name', read_only=True)
    solicitud_titulo = serializers.CharField(source='solicitud.titulo', read_only=True)

    class Meta:
        model = PropuestaDiseño
        fields = '__all__'
        read_only_fields = ('diseñador', 'fecha_creacion')


class ServicioSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='solicitud.cliente.get_full_name', read_only=True)
    diseñador_nombre = serializers.CharField(source='diseñador.get_full_name', read_only=True)
    solicitud_titulo = serializers.CharField(source='solicitud.titulo', read_only=True)

    class Meta:
        model = Servicio
        fields = '__all__'
        read_only_fields = ('fecha_inicio',)


class EmpleadoDisponibilidadSerializer(serializers.ModelSerializer):
    empleado_nombre = serializers.CharField(source='empleado.get_full_name', read_only=True)

    class Meta:
        model = EmpleadoDisponibilidad
        fields = '__all__'


class ActualizacionServicioSerializer(serializers.ModelSerializer):
    creado_por_nombre = serializers.CharField(source='creado_por.get_full_name', read_only=True)
    servicio_titulo = serializers.CharField(source='servicio.solicitud.titulo', read_only=True)

    class Meta:
        model = ActualizacionServicio
        fields = '__all__'
        read_only_fields = ('creado_por', 'fecha_creacion')
