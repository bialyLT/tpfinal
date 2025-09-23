from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    TipoServicio, 
    Servicio, 
    Diseño,
    ImagenServicio,
    EmpleadoDisponibilidad, 
    AsignacionEmpleado,
    ServicioProducto,
    ActualizacionServicio
)


class TipoServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoServicio
        fields = '__all__'


class ImagenServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagenServicio
        fields = '__all__'


class DiseñoSerializer(serializers.ModelSerializer):
    diseñador_nombre = serializers.CharField(source='diseñador_asignado.get_full_name', read_only=True)
    servicio_numero = serializers.CharField(source='servicio.numero_servicio', read_only=True)

    class Meta:
        model = Diseño
        fields = '__all__'
        read_only_fields = ('fecha_creacion', 'fecha_actualizacion')


class ServicioSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.get_full_name', read_only=True)
    tipo_servicio_nombre = serializers.CharField(source='tipo_servicio.nombre', read_only=True)
    tipo_servicio_requiere_diseño = serializers.BooleanField(source='tipo_servicio.requiere_diseño', read_only=True)
    imagenes = ImagenServicioSerializer(many=True, read_only=True)
    diseño = DiseñoSerializer(read_only=True)
    empleados_asignados = serializers.SerializerMethodField()
    
    class Meta:
        model = Servicio
        fields = '__all__'
        read_only_fields = ('numero_servicio', 'fecha_inicio', 'fecha_finalizacion', 'fecha_solicitud', 'fecha_actualizacion')
    
    def get_empleados_asignados(self, obj):
        return [{'empleado': asig.empleado.get_full_name(), 'fecha_asignacion': asig.fecha_asignacion} for asig in obj.asignaciones.all()]


class AsignacionEmpleadoSerializer(serializers.ModelSerializer):
    empleado_nombre = serializers.CharField(source='empleado.get_full_name', read_only=True)
    servicio_numero = serializers.CharField(source='servicio.numero_servicio', read_only=True)

    class Meta:
        model = AsignacionEmpleado
        fields = '__all__'
        read_only_fields = ('fecha_asignacion',)


class ServicioProductoSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    servicio_numero = serializers.CharField(source='servicio.numero_servicio', read_only=True)

    class Meta:
        model = ServicioProducto
        fields = '__all__'
        read_only_fields = ('costo_total',)


class EmpleadoDisponibilidadSerializer(serializers.ModelSerializer):
    empleado_nombre = serializers.CharField(source='empleado.get_full_name', read_only=True)

    class Meta:
        model = EmpleadoDisponibilidad
        fields = '__all__'


class ActualizacionServicioSerializer(serializers.ModelSerializer):
    empleado_nombre = serializers.CharField(source='empleado.get_full_name', read_only=True)
    servicio_numero = serializers.CharField(source='servicio.numero_servicio', read_only=True)

    class Meta:
        model = ActualizacionServicio
        fields = '__all__'
        read_only_fields = ('fecha_actualizacion',)


# Serializer para crear un nuevo servicio desde el frontend
class CrearServicioSerializer(serializers.ModelSerializer):
    descripcion = serializers.CharField(
        write_only=True, 
        help_text="Descripción del servicio deseado por el cliente"
    )
    imagenes_jardin = serializers.ListField(
        child=serializers.ImageField(), 
        write_only=True, 
        required=False,
        help_text="Imágenes del jardín actual (opcional)"
    )
    imagenes_ideas = serializers.ListField(
        child=serializers.ImageField(), 
        write_only=True, 
        required=False,
        help_text="Imágenes de ideas o referencias (opcional)"
    )
    
    class Meta:
        model = Servicio
        fields = [
            'tipo_servicio',
            'descripcion',
            'notas_adicionales', 
            'direccion_servicio', 
            'fecha_preferida',
            'imagenes_jardin',
            'imagenes_ideas'
        ]
    
    def create(self, validated_data):
        from django.db import IntegrityError
        
        imagenes_jardin = validated_data.pop('imagenes_jardin', [])
        imagenes_ideas = validated_data.pop('imagenes_ideas', [])
        descripcion = validated_data.pop('descripcion', '')
        
        # Asignar cliente del usuario autenticado
        validated_data['cliente'] = self.context['request'].user
        
        try:
            # Crear el servicio
            servicio = Servicio.objects.create(**validated_data)
            
            # Si el tipo de servicio requiere diseño, crear el objeto Diseño
            if servicio.tipo_servicio.requiere_diseño:
                from .models import Diseño
                # Verificar si ya existe un diseño para este servicio
                diseño_existente = Diseño.objects.filter(servicio=servicio).first()
                if not diseño_existente:
                    Diseño.objects.create(
                        servicio=servicio,
                        descripcion_deseada=descripcion
                    )
            
            # Crear imágenes del jardín
            for imagen in imagenes_jardin:
                ImagenServicio.objects.create(
                    servicio=servicio,
                    imagen=imagen,
                    tipo_imagen='jardin',
                    subida_por=self.context['request'].user
                )
            
            # Crear imágenes de ideas
            for imagen in imagenes_ideas:
                ImagenServicio.objects.create(
                    servicio=servicio,
                    imagen=imagen,
                    tipo_imagen='ideas',
                    subida_por=self.context['request'].user
                )
            
            return servicio
            
        except IntegrityError as e:
            raise serializers.ValidationError(f"Error de integridad: {str(e)}")
        except Exception as e:
            raise serializers.ValidationError(f"Error al crear el servicio: {str(e)}")
