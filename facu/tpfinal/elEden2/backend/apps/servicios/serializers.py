from rest_framework import serializers
from .models import Servicio, Reserva, Diseno, DisenoProducto, ImagenDiseno, ImagenReserva, ReservaEmpleado
from apps.users.models import Cliente


class ServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Servicio
        fields = '__all__'


class ImagenReservaSerializer(serializers.ModelSerializer):
    """Serializer para las imágenes de una reserva"""
    imagen_url = serializers.SerializerMethodField()
    tipo_imagen_display = serializers.CharField(source='get_tipo_imagen_display', read_only=True)
    
    class Meta:
        model = ImagenReserva
        fields = ['id_imagen_reserva', 'imagen', 'imagen_url', 'tipo_imagen', 'tipo_imagen_display', 
                  'descripcion', 'fecha_subida']
        read_only_fields = ['id_imagen_reserva', 'fecha_subida']
    
    def get_imagen_url(self, obj):
        if obj.imagen:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.imagen.url)
            return obj.imagen.url
        return None


class EmpleadoAsignadoSerializer(serializers.ModelSerializer):
    """Serializer para mostrar empleados asignados a una reserva"""
    empleado_nombre = serializers.CharField(source='empleado.persona.nombre', read_only=True)
    empleado_apellido = serializers.CharField(source='empleado.persona.apellido', read_only=True)
    empleado_email = serializers.CharField(source='empleado.persona.email', read_only=True)
    rol_display = serializers.CharField(source='get_rol_display', read_only=True)
    
    class Meta:
        model = ReservaEmpleado
        fields = ['id_reserva_empleado', 'empleado', 'empleado_nombre', 'empleado_apellido', 
                  'empleado_email', 'rol', 'rol_display', 'fecha_asignacion', 'notas']


class ReservaSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.persona.nombre', read_only=True)
    cliente_apellido = serializers.CharField(source='cliente.persona.apellido', read_only=True)
    servicio_nombre = serializers.CharField(source='servicio.nombre', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    empleados_asignados = EmpleadoAsignadoSerializer(source='asignaciones', many=True, read_only=True)
    imagenes = ImagenReservaSerializer(many=True, read_only=True)
    # Incluir diseños relacionados con información básica
    disenos = serializers.SerializerMethodField()
    encuesta_cliente_completada = serializers.SerializerMethodField()
    encuesta_cliente_respuesta_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Reserva
        fields = '__all__'
        read_only_fields = ('fecha_solicitud',)
    
    def get_disenos(self, obj):
        """Retorna los diseños asociados a esta reserva con información básica"""
        disenos = obj.disenos.all()
        return [{
            'id_diseno': d.id_diseno,
            'estado': d.estado,
            'titulo': d.titulo,
            'presupuesto': str(d.presupuesto),
            'disenador_id': d.disenador.id_empleado if d.disenador else None,
            'disenador_nombre': f"{d.disenador.persona.nombre} {d.disenador.persona.apellido}" if d.disenador else None
        } for d in disenos]

    def _get_cliente_respuesta(self, obj):
        """Obtiene la respuesta de encuesta completada por el cliente autenticado, si existe."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None

        cache = self.context.setdefault('_encuesta_respuestas_cache', {})
        cache_key = obj.id_reserva
        if cache_key in cache:
            return cache[cache_key]

        cliente = Cliente.objects.filter(persona__email=request.user.email).first()
        if not cliente:
            cache[cache_key] = None
            return None

        respuesta = obj.encuestas.filter(cliente=cliente, estado='completada').order_by('-fecha_completada').first()
        cache[cache_key] = respuesta
        return respuesta

    def get_encuesta_cliente_completada(self, obj):
        respuesta = self._get_cliente_respuesta(obj)
        return bool(respuesta)

    def get_encuesta_cliente_respuesta_id(self, obj):
        respuesta = self._get_cliente_respuesta(obj)
        return respuesta.id_encuesta_respuesta if respuesta else None


class ImagenDisenoSerializer(serializers.ModelSerializer):
    """Serializer para las imágenes de un diseño"""
    imagen_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ImagenDiseno
        fields = ['id_imagen_diseno', 'imagen', 'imagen_url', 'descripcion', 'orden', 'fecha_subida']
        read_only_fields = ['id_imagen_diseno', 'fecha_subida']
    
    def get_imagen_url(self, obj):
        if obj.imagen:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.imagen.url)
            return obj.imagen.url
        return None


class DisenoProductoSerializer(serializers.ModelSerializer):
    """Serializer para productos incluidos en un diseño"""
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_codigo = serializers.CharField(source='producto.codigo', read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = DisenoProducto
        fields = [
            'id_diseno_producto', 'producto', 'producto_nombre', 'producto_codigo',
            'cantidad', 'precio_unitario', 'subtotal', 'notas'
        ]
        read_only_fields = ['id_diseno_producto', 'subtotal']


class DisenoSerializer(serializers.ModelSerializer):
    """Serializer básico para listar diseños"""
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    servicio_nombre = serializers.CharField(source='servicio.nombre', read_only=True)
    reserva_id = serializers.IntegerField(source='reserva.id_reserva', read_only=True)
    reserva_fecha_reserva = serializers.DateTimeField(source='reserva.fecha_reserva', read_only=True)
    cliente_nombre = serializers.SerializerMethodField()
    disenador_id = serializers.IntegerField(source='disenador.id_empleado', read_only=True, allow_null=True)
    disenador_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = Diseno
        fields = [
            'id_diseno', 'titulo', 'descripcion', 'presupuesto', 'estado', 'estado_display',
            'reserva', 'reserva_id', 'reserva_fecha_reserva', 'servicio', 'servicio_nombre', 
            'cliente_nombre', 'disenador', 'disenador_id', 'disenador_nombre',
            'fecha_creacion', 'fecha_presentacion', 'fecha_respuesta', 'fecha_propuesta'
        ]
        read_only_fields = ['id_diseno', 'fecha_creacion', 'fecha_presentacion', 'fecha_respuesta']
    
    def get_cliente_nombre(self, obj):
        if obj.reserva and obj.reserva.cliente and obj.reserva.cliente.persona:
            return f"{obj.reserva.cliente.persona.nombre} {obj.reserva.cliente.persona.apellido}"
        return None
    
    def get_disenador_nombre(self, obj):
        if obj.disenador and obj.disenador.persona:
            return f"{obj.disenador.persona.nombre} {obj.disenador.persona.apellido}"
        return None


class DisenoDetalleSerializer(serializers.ModelSerializer):
    """Serializer completo con productos e imágenes"""
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    servicio_nombre = serializers.CharField(source='servicio.nombre', read_only=True)
    reserva_id = serializers.IntegerField(source='reserva.id_reserva', read_only=True)
    reserva_fecha_reserva = serializers.DateTimeField(source='reserva.fecha_reserva', read_only=True)
    cliente_nombre = serializers.SerializerMethodField()
    disenador_nombre = serializers.SerializerMethodField()
    productos = DisenoProductoSerializer(many=True, read_only=True)
    imagenes = ImagenDisenoSerializer(many=True, read_only=True)
    total_productos = serializers.SerializerMethodField()
    
    class Meta:
        model = Diseno
        fields = [
            'id_diseno', 'titulo', 'descripcion', 'presupuesto', 'estado', 'estado_display',
            'reserva', 'reserva_id', 'reserva_fecha_reserva', 'servicio', 'servicio_nombre', 
            'cliente_nombre', 'disenador', 'disenador_nombre',
            'productos', 'imagenes', 'total_productos',
            'observaciones_cliente', 'notas_internas',
            'fecha_creacion', 'fecha_presentacion', 'fecha_respuesta', 'fecha_propuesta', 'fecha_actualizacion'
        ]
        read_only_fields = ['id_diseno', 'fecha_creacion', 'fecha_presentacion', 'fecha_respuesta', 'fecha_actualizacion']
    
    def get_cliente_nombre(self, obj):
        if obj.reserva and obj.reserva.cliente and obj.reserva.cliente.persona:
            return f"{obj.reserva.cliente.persona.nombre} {obj.reserva.cliente.persona.apellido}"
        return None
    
    def get_disenador_nombre(self, obj):
        if obj.disenador and obj.disenador.persona:
            return f"{obj.disenador.persona.nombre} {obj.disenador.persona.apellido}"
        return None
    
    def get_total_productos(self, obj):
        """Calcular el total de todos los productos"""
        return sum(p.subtotal for p in obj.productos.all())


class CrearDisenoSerializer(serializers.Serializer):
    """Serializer para crear un diseño completo con productos e imágenes"""
    titulo = serializers.CharField(max_length=200)
    descripcion = serializers.CharField()
    presupuesto = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    reserva_id = serializers.IntegerField(required=False, allow_null=True)
    servicio_id = serializers.IntegerField()
    disenador_id = serializers.IntegerField(required=False, allow_null=True)
    notas_internas = serializers.CharField(required=False, allow_blank=True)
    fecha_propuesta = serializers.DateTimeField(required=False, allow_null=True)
    
    # Productos como lista de diccionarios
    productos = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True
    )
    
    # Imágenes se manejarán por separado en la vista
    def validate_servicio_id(self, value):
        if not Servicio.objects.filter(id_servicio=value).exists():
            raise serializers.ValidationError("El servicio no existe")
        return value
    
    def validate_productos(self, value):
        """Validar que los productos tengan los campos requeridos"""
        for producto in value:
            if 'producto_id' not in producto:
                raise serializers.ValidationError("Cada producto debe tener 'producto_id'")
            if 'cantidad' not in producto:
                raise serializers.ValidationError("Cada producto debe tener 'cantidad'")
            if 'precio_unitario' not in producto:
                raise serializers.ValidationError("Cada producto debe tener 'precio_unitario'")
        return value
