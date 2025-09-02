from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Encuesta, Pregunta, RespuestaEncuesta


class PreguntaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pregunta
        fields = '__all__'


class RespuestaEncuestaSerializer(serializers.ModelSerializer):
    pregunta_texto = serializers.CharField(source='pregunta.texto', read_only=True)

    class Meta:
        model = RespuestaEncuesta
        fields = '__all__'
        read_only_fields = ('fecha_respuesta',)


class EncuestaSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='servicio.solicitud.cliente.get_full_name', read_only=True)
    servicio_titulo = serializers.CharField(source='servicio.solicitud.titulo', read_only=True)
    respuestas = RespuestaEncuestaSerializer(many=True, read_only=True)

    class Meta:
        model = Encuesta
        fields = '__all__'
        read_only_fields = ('token_publico', 'fecha_creacion')


class EncuestaPublicaSerializer(serializers.ModelSerializer):
    """Serializer para acceso público a encuestas"""
    preguntas = PreguntaSerializer(source='servicio.tipo_servicio.preguntas', many=True, read_only=True)
    servicio_titulo = serializers.CharField(source='servicio.solicitud.titulo', read_only=True)

    class Meta:
        model = Encuesta
        fields = [
            'id', 'token_publico', 'servicio_titulo', 'fecha_envio', 
            'preguntas', 'estado', 'comentarios_adicionales'
        ]
        read_only_fields = ('token_publico', 'fecha_envio')
