from rest_framework import serializers
from .models import Encuesta, Pregunta, EncuestaRespuesta, Respuesta


class EncuestaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Encuesta
        fields = '__all__'


class PreguntaSerializer(serializers.ModelSerializer):
    encuesta_titulo = serializers.CharField(source='encuesta.titulo', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = Pregunta
        fields = '__all__'


class EncuestaRespuestaSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.persona.nombre', read_only=True)
    cliente_apellido = serializers.CharField(source='cliente.persona.apellido', read_only=True)
    encuesta_titulo = serializers.CharField(source='encuesta.titulo', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = EncuestaRespuesta
        fields = '__all__'


class RespuestaSerializer(serializers.ModelSerializer):
    pregunta_texto = serializers.CharField(source='pregunta.texto', read_only=True)
    valor = serializers.SerializerMethodField()

    class Meta:
        model = Respuesta
        fields = '__all__'

    def get_valor(self, obj):
        return obj.get_valor()
