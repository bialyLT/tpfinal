from rest_framework import serializers

from .models import Encuesta, EncuestaRespuesta, Pregunta, Respuesta


class PreguntaSerializer(serializers.ModelSerializer):
    """Serializer para preguntas individuales"""

    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = Pregunta
        fields = [
            "id_pregunta",
            "texto",
            "tipo",
            "tipo_display",
            "obligatoria",
            "opciones",
            "impacta_puntuacion",
            "encuesta",
        ]
        read_only_fields = ["id_pregunta"]


class PreguntaCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para crear/actualizar preguntas sin el campo encuesta (se usa en nested)"""

    class Meta:
        model = Pregunta
        fields = [
            "id_pregunta",
            "texto",
            "tipo",
            "obligatoria",
            "opciones",
            "impacta_puntuacion",
        ]
        read_only_fields = ["id_pregunta"]

    def validate(self, data):
        """Validar que solo se permitan preguntas de escala."""
        tipo = data.get("tipo") or (self.instance.tipo if self.instance else None)
        if tipo != "escala":
            raise serializers.ValidationError({"tipo": "Solo se permiten preguntas de tipo escala (1-10)."})

        impacta = data.get("impacta_puntuacion")
        if impacta is None and self.instance:
            impacta = self.instance.impacta_puntuacion

        if impacta and tipo != "escala":
            raise serializers.ValidationError(
                {
                    "impacta_puntuacion": (
                        "Solo las preguntas de tipo escala (1-5) pueden impactar la "
                        "puntuación de empleados."
                    )
                }
            )
        return data


class EncuestaSerializer(serializers.ModelSerializer):
    """Serializer básico para listar encuestas"""

    total_preguntas = serializers.SerializerMethodField()
    total_respuestas = serializers.SerializerMethodField()

    class Meta:
        model = Encuesta
        fields = [
            "id_encuesta",
            "titulo",
            "descripcion",
            "activa",
            "total_preguntas",
            "total_respuestas",
        ]
        read_only_fields = ["id_encuesta"]

    def get_total_preguntas(self, obj):
        return obj.preguntas.count()

    def get_total_respuestas(self, obj):
        return obj.respuestas_clientes.filter(estado="completada").count()


class EncuestaDetalleSerializer(serializers.ModelSerializer):
    """Serializer detallado para ver una encuesta con todas sus preguntas"""

    preguntas = PreguntaSerializer(many=True, read_only=True)
    total_respuestas = serializers.SerializerMethodField()

    class Meta:
        model = Encuesta
        fields = [
            "id_encuesta",
            "titulo",
            "descripcion",
            "activa",
            "preguntas",
            "total_respuestas",
        ]
        read_only_fields = ["id_encuesta"]

    def get_total_respuestas(self, obj):
        return obj.respuestas_clientes.filter(estado="completada").count()


class EncuestaCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para crear/actualizar encuestas con preguntas anidadas"""

    preguntas = PreguntaCreateUpdateSerializer(many=True)

    class Meta:
        model = Encuesta
        fields = ["id_encuesta", "titulo", "descripcion", "activa", "preguntas"]
        read_only_fields = ["id_encuesta"]

    def validate_preguntas(self, value):
        """Validar que haya al menos una pregunta"""
        if not value or len(value) == 0:
            raise serializers.ValidationError("Debe agregar al menos una pregunta a la encuesta.")

        # Validar que todas sean de tipo escala
        for preg in value:
            tipo = preg.get("tipo")
            if tipo and tipo != "escala":
                raise serializers.ValidationError("Solo se permiten preguntas de tipo escala (1-10).")
        return value

    def create(self, validated_data):
        """Crear encuesta con sus preguntas"""
        preguntas_data = validated_data.pop("preguntas")
        encuesta = Encuesta.objects.create(**validated_data)

        # Crear las preguntas asociadas
        for pregunta_data in preguntas_data:
            Pregunta.objects.create(encuesta=encuesta, **pregunta_data)

        return encuesta

    def update(self, instance, validated_data):
        """Actualizar encuesta y sus preguntas"""
        preguntas_data = validated_data.pop("preguntas", None)

        # Actualizar campos de la encuesta
        instance.titulo = validated_data.get("titulo", instance.titulo)
        instance.descripcion = validated_data.get("descripcion", instance.descripcion)
        instance.activa = validated_data.get("activa", instance.activa)
        instance.save()

        # Si se proporcionan preguntas, actualizar/crear/eliminar
        if preguntas_data is not None:
            # Obtener IDs de preguntas existentes que vienen en el request
            preguntas_ids_request = [p.get("id_pregunta") for p in preguntas_data if p.get("id_pregunta")]

            # Eliminar preguntas que no están en el request
            instance.preguntas.exclude(id_pregunta__in=preguntas_ids_request).delete()

            # Crear o actualizar preguntas
            for pregunta_data in preguntas_data:
                pregunta_id = pregunta_data.get("id_pregunta")
                if pregunta_id:
                    # Actualizar pregunta existente
                    Pregunta.objects.filter(id_pregunta=pregunta_id, encuesta=instance).update(
                        **{k: v for k, v in pregunta_data.items() if k != "id_pregunta"}
                    )
                else:
                    # Crear nueva pregunta
                    Pregunta.objects.create(encuesta=instance, **pregunta_data)

        return instance


class EncuestaRespuestaSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.persona.nombre", read_only=True)
    cliente_apellido = serializers.CharField(source="cliente.persona.apellido", read_only=True)
    encuesta_titulo = serializers.CharField(source="encuesta.titulo", read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)

    class Meta:
        model = EncuestaRespuesta
        fields = "__all__"


class RespuestaSerializer(serializers.ModelSerializer):
    pregunta_texto = serializers.CharField(source="pregunta.texto", read_only=True)
    valor = serializers.SerializerMethodField()

    class Meta:
        model = Respuesta
        fields = "__all__"

    def get_valor(self, obj):
        return obj.get_valor()


class RespuestaImpactoSerializer(serializers.ModelSerializer):
    pregunta_texto = serializers.CharField(source="pregunta.texto", read_only=True)
    encuesta_titulo = serializers.CharField(source="encuesta_respuesta.encuesta.titulo", read_only=True)
    fecha_encuesta = serializers.DateTimeField(source="encuesta_respuesta.fecha_realizacion", read_only=True)
    reserva = serializers.SerializerMethodField()
    cliente = serializers.SerializerMethodField()
    valor = serializers.SerializerMethodField()
    valor_texto = serializers.CharField(read_only=True, allow_null=True, allow_blank=True)

    class Meta:
        model = Respuesta
        fields = [
            "id_respuesta",
            "pregunta_texto",
            "valor_numerico",
            "valor",
            "valor_texto",
            "encuesta_titulo",
            "fecha_encuesta",
            "reserva",
            "cliente",
        ]

    def get_reserva(self, obj):
        reserva = getattr(obj.encuesta_respuesta, "reserva", None)
        if not reserva:
            return None
        servicio = reserva.servicio.nombre if reserva.servicio else None
        return {
            "id_reserva": reserva.id_reserva,
            "servicio": servicio,
            "fecha_reserva": reserva.fecha_cita,
        }

    def get_cliente(self, obj):
        cliente = getattr(obj.encuesta_respuesta, "cliente", None)
        if not cliente or not cliente.persona:
            return None
        persona = cliente.persona
        return {
            "nombre": persona.nombre,
            "apellido": persona.apellido,
        }

    def get_valor(self, obj):
        return obj.get_valor()
