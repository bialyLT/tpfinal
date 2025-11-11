from rest_framework import serializers
from .models import Encuesta, Pregunta, EncuestaRespuesta, Respuesta


class PreguntaSerializer(serializers.ModelSerializer):
    """Serializer para preguntas individuales"""
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = Pregunta
        fields = ['id_pregunta', 'texto', 'tipo', 'tipo_display', 'orden', 'obligatoria', 'opciones', 'encuesta']
        read_only_fields = ['id_pregunta']


class PreguntaCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para crear/actualizar preguntas sin el campo encuesta (se usa en nested)"""
    class Meta:
        model = Pregunta
        fields = ['id_pregunta', 'texto', 'tipo', 'orden', 'obligatoria', 'opciones']
        read_only_fields = ['id_pregunta']

    def validate(self, data):
        """Validar que las preguntas de tipo múltiple tengan opciones"""
        if data.get('tipo') == 'multiple':
            if not data.get('opciones'):
                raise serializers.ValidationError({
                    'opciones': 'Las preguntas de opción múltiple deben tener opciones definidas.'
                })
            # Validar que opciones sea una lista
            if not isinstance(data.get('opciones'), list):
                raise serializers.ValidationError({
                    'opciones': 'Las opciones deben ser una lista.'
                })
        return data


class EncuestaSerializer(serializers.ModelSerializer):
    """Serializer básico para listar encuestas"""
    total_preguntas = serializers.SerializerMethodField()
    total_respuestas = serializers.SerializerMethodField()

    class Meta:
        model = Encuesta
        fields = ['id_encuesta', 'titulo', 'descripcion', 'fecha_creacion', 
                  'fecha_actualizacion', 'activa', 'total_preguntas', 'total_respuestas']
        read_only_fields = ['id_encuesta', 'fecha_creacion', 'fecha_actualizacion']

    def get_total_preguntas(self, obj):
        return obj.preguntas.count()

    def get_total_respuestas(self, obj):
        return obj.respuestas_clientes.filter(estado='completada').count()


class EncuestaDetalleSerializer(serializers.ModelSerializer):
    """Serializer detallado para ver una encuesta con todas sus preguntas"""
    preguntas = PreguntaSerializer(many=True, read_only=True)
    total_respuestas = serializers.SerializerMethodField()

    class Meta:
        model = Encuesta
        fields = ['id_encuesta', 'titulo', 'descripcion', 'fecha_creacion', 
                  'fecha_actualizacion', 'activa', 'preguntas', 'total_respuestas']
        read_only_fields = ['id_encuesta', 'fecha_creacion', 'fecha_actualizacion']

    def get_total_respuestas(self, obj):
        return obj.respuestas_clientes.filter(estado='completada').count()


class EncuestaCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para crear/actualizar encuestas con preguntas anidadas"""
    preguntas = PreguntaCreateUpdateSerializer(many=True)

    class Meta:
        model = Encuesta
        fields = ['id_encuesta', 'titulo', 'descripcion', 'activa', 'preguntas']
        read_only_fields = ['id_encuesta']

    def validate_preguntas(self, value):
        """Validar que haya al menos una pregunta"""
        if not value or len(value) == 0:
            raise serializers.ValidationError('Debe agregar al menos una pregunta a la encuesta.')
        return value

    def create(self, validated_data):
        """Crear encuesta con sus preguntas"""
        preguntas_data = validated_data.pop('preguntas')
        encuesta = Encuesta.objects.create(**validated_data)
        
        # Crear las preguntas asociadas
        for pregunta_data in preguntas_data:
            Pregunta.objects.create(encuesta=encuesta, **pregunta_data)
        
        return encuesta

    def update(self, instance, validated_data):
        """Actualizar encuesta y sus preguntas"""
        preguntas_data = validated_data.pop('preguntas', None)
        
        # Actualizar campos de la encuesta
        instance.titulo = validated_data.get('titulo', instance.titulo)
        instance.descripcion = validated_data.get('descripcion', instance.descripcion)
        instance.activa = validated_data.get('activa', instance.activa)
        instance.save()
        
        # Si se proporcionan preguntas, actualizar/crear/eliminar
        if preguntas_data is not None:
            # Obtener IDs de preguntas existentes que vienen en el request
            preguntas_ids_request = [p.get('id_pregunta') for p in preguntas_data if p.get('id_pregunta')]
            
            # Eliminar preguntas que no están en el request
            instance.preguntas.exclude(id_pregunta__in=preguntas_ids_request).delete()
            
            # Crear o actualizar preguntas
            for pregunta_data in preguntas_data:
                pregunta_id = pregunta_data.get('id_pregunta')
                if pregunta_id:
                    # Actualizar pregunta existente
                    Pregunta.objects.filter(id_pregunta=pregunta_id, encuesta=instance).update(**{
                        k: v for k, v in pregunta_data.items() if k != 'id_pregunta'
                    })
                else:
                    # Crear nueva pregunta
                    Pregunta.objects.create(encuesta=instance, **pregunta_data)
        
        return instance


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
