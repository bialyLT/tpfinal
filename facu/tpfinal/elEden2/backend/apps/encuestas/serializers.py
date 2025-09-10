from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Encuesta, TipoEncuesta, Pregunta, RespuestaEncuesta, 
    DetallePregunta, EncuestaServicio
)


class TipoEncuestaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoEncuesta
        fields = '__all__'


class PreguntaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pregunta
        fields = '__all__'


class DetallePreguntaSerializer(serializers.ModelSerializer):
    pregunta_texto = serializers.CharField(source='pregunta.texto_pregunta', read_only=True)
    respuesta_formateada = serializers.CharField(read_only=True)

    class Meta:
        model = DetallePregunta
        fields = '__all__'


class RespuestaEncuestaSerializer(serializers.ModelSerializer):
    detalles = DetallePreguntaSerializer(many=True, read_only=True)
    cliente_nombre = serializers.SerializerMethodField()
    satisfaccion_texto = serializers.CharField(read_only=True)

    class Meta:
        model = RespuestaEncuesta
        fields = '__all__'
        read_only_fields = ('fecha_respuesta',)

    def get_cliente_nombre(self, obj):
        if obj.cliente.first_name and obj.cliente.last_name:
            return f"{obj.cliente.first_name} {obj.cliente.last_name}"
        return obj.cliente.username


class EncuestaSerializer(serializers.ModelSerializer):
    # Información del cliente
    cliente_nombre = serializers.SerializerMethodField()
    cliente_username = serializers.CharField(source='cliente.username', read_only=True)
    
    # Información del tipo de encuesta
    tipo_encuesta_nombre = serializers.CharField(source='tipo_encuesta.nombre', read_only=True)
    
    # Información de respuestas (si existe)
    respuesta = serializers.SerializerMethodField()
    puntuacion_general = serializers.SerializerMethodField()
    comentarios = serializers.SerializerMethodField()
    
    # Información del servicio relacionado (si existe)
    servicio_info = serializers.SerializerMethodField()
    
    # Propiedades calculadas
    esta_vigente = serializers.BooleanField(read_only=True)
    dias_para_expiracion = serializers.IntegerField(read_only=True)

    class Meta:
        model = Encuesta
        fields = [
            'id', 'titulo', 'descripcion', 'estado', 'fecha_envio', 
            'fecha_respuesta', 'fecha_expiracion', 'permite_respuesta_anonima',
            'email_enviado', 'fecha_actualizacion',
            # Campos relacionados
            'cliente', 'cliente_nombre', 'cliente_username',
            'tipo_encuesta', 'tipo_encuesta_nombre',
            # Información de respuesta
            'respuesta', 'puntuacion_general', 'comentarios',
            # Servicio relacionado
            'servicio_info',
            # Propiedades
            'esta_vigente', 'dias_para_expiracion'
        ]
        read_only_fields = ('token_acceso', 'fecha_envio', 'fecha_actualizacion')

    def get_cliente_nombre(self, obj):
        if obj.cliente.first_name and obj.cliente.last_name:
            return f"{obj.cliente.first_name} {obj.cliente.last_name}"
        return obj.cliente.username

    def get_respuesta(self, obj):
        try:
            respuesta = obj.respuestas.first()
            if respuesta:
                return RespuestaEncuestaSerializer(respuesta).data
            return None
        except:
            return None

    def get_puntuacion_general(self, obj):
        try:
            respuesta = obj.respuestas.first()
            return respuesta.calificacion_general if respuesta else None
        except:
            return None

    def get_comentarios(self, obj):
        try:
            respuesta = obj.respuestas.first()
            return respuesta.comentario_general if respuesta else None
        except:
            return None

    def get_servicio_info(self, obj):
        try:
            servicio_rel = obj.servicio_relacionado
            return {
                'servicio_id': servicio_rel.servicio_id,
                'fecha_creacion': servicio_rel.fecha_creacion
            }
        except:
            return None


class EncuestaPublicaSerializer(serializers.ModelSerializer):
    """Serializer para acceso público a encuestas"""
    preguntas = PreguntaSerializer(many=True, read_only=True)
    tipo_encuesta_nombre = serializers.CharField(source='tipo_encuesta.nombre', read_only=True)

    class Meta:
        model = Encuesta
        fields = [
            'id', 'token_acceso', 'titulo', 'descripcion', 'fecha_envio', 
            'fecha_expiracion', 'preguntas', 'estado', 'tipo_encuesta_nombre',
            'permite_respuesta_anonima'
        ]
        read_only_fields = ('token_acceso', 'fecha_envio')
