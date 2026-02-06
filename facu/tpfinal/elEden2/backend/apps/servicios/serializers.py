from django.utils import timezone
from rest_framework import serializers

from apps.users.models import Cliente
from apps.productos.models import Tarea
from apps.productos.serializers import TareaSerializer

from .models import (
    Diseno,
    DisenoProducto,
    DisenoTarea,
    FormaTerreno,
    ImagenDiseno,
    ImagenReserva,
    ImagenZona,
    Jardin,
    Reserva,
    ReservaEmpleado,
    Servicio,
    ZonaJardin,
)
from .utils import ordenar_empleados_por_puntuacion


class ServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Servicio
        fields = "__all__"


class ImagenReservaSerializer(serializers.ModelSerializer):
    """Serializer para las imágenes de una reserva"""

    imagen_url = serializers.SerializerMethodField()
    tipo_imagen_display = serializers.CharField(source="get_tipo_imagen_display", read_only=True)

    class Meta:
        model = ImagenReserva
        fields = [
            "id_imagen_reserva",
            "imagen",
            "imagen_url",
            "tipo_imagen",
            "tipo_imagen_display",
            "descripcion",
            "fecha_subida",
        ]
        read_only_fields = ["id_imagen_reserva", "fecha_subida"]

    def get_imagen_url(self, obj):
        if obj.imagen:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.imagen.url)
            return obj.imagen.url
        return None


class EmpleadoAsignadoSerializer(serializers.ModelSerializer):
    """Serializer para mostrar empleados asignados a una reserva"""

    empleado_nombre = serializers.CharField(source="empleado.persona.nombre", read_only=True)
    empleado_apellido = serializers.CharField(source="empleado.persona.apellido", read_only=True)
    empleado_email = serializers.CharField(source="empleado.persona.email", read_only=True)
    rol_display = serializers.CharField(source="get_rol_display", read_only=True)
    puntuacion_promedio = serializers.SerializerMethodField()
    puntuacion_cantidad = serializers.SerializerMethodField()
    puntuacion_acumulada = serializers.SerializerMethodField()

    class Meta:
        model = ReservaEmpleado
        fields = [
            "id_reserva_empleado",
            "empleado",
            "empleado_nombre",
            "empleado_apellido",
            "empleado_email",
            "rol",
            "rol_display",
            "fecha_asignacion",
            "notas",
            "puntuacion_promedio",
            "puntuacion_cantidad",
            "puntuacion_acumulada",
        ]

    def get_puntuacion_promedio(self, obj):
        if obj.empleado.puntuacion_promedio is None:
            return None
        return float(obj.empleado.puntuacion_promedio)

    def get_puntuacion_cantidad(self, obj):
        return obj.empleado.puntuacion_cantidad

    def get_puntuacion_acumulada(self, obj):
        if obj.empleado.puntuacion_acumulada is None:
            return None
        return float(obj.empleado.puntuacion_acumulada)


class ZonaJardinSerializer(serializers.ModelSerializer):
    forma_nombre = serializers.CharField(source="forma.nombre", read_only=True)
    imagenes = serializers.SerializerMethodField()

    class Meta:
        model = ZonaJardin
        fields = [
            "id_zona",
            "jardin",
            "nombre",
            "ancho",
            "largo",
            "forma",
            "forma_nombre",
            "notas",
            "imagenes",
        ]
        read_only_fields = ["id_zona", "jardin"]

    def get_imagenes(self, obj):
        request = self.context.get("request")
        serializer = ImagenZonaSerializer(
            obj.imagenes.order_by("id_imagen_zona"),
            many=True,
            context={"request": request},
        )
        return serializer.data


class JardinSerializer(serializers.ModelSerializer):
    zonas = ZonaJardinSerializer(many=True, required=False)
    reserva_id = serializers.IntegerField(source="reserva.id_reserva", read_only=True)

    class Meta:
        model = Jardin
        fields = ["id_jardin", "reserva", "reserva_id", "descripcion", "zonas"]
        read_only_fields = ["id_jardin", "reserva_id"]

    def create(self, validated_data):
        zonas_data = validated_data.pop("zonas", [])
        if not zonas_data or len(zonas_data) == 0:
            raise serializers.ValidationError({"zonas": "El jardín debe contener al menos una zona"})
        jardin = Jardin.objects.create(**validated_data)
        for z in zonas_data:
            ZonaJardin.objects.create(jardin=jardin, **z)
        return jardin

    def update(self, instance, validated_data):
        zonas_data = validated_data.pop("zonas", None)
        if zonas_data is not None and len(zonas_data) == 0:
            raise serializers.ValidationError({"zonas": "El jardín debe contener al menos una zona"})
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if zonas_data is not None:
            # Simplistic sync: remove existing zones and recreate
            instance.zonas.all().delete()
            for z in zonas_data:
                ZonaJardin.objects.create(jardin=instance, **z)
        return instance

    def validate(self, attrs):
        # Validate that at least one zone is provided in the initial data
        zonas = attrs.get("zonas") if "zonas" in attrs else self.initial_data.get("zonas")
        if not zonas or len(zonas) == 0:
            raise serializers.ValidationError({"zonas": "El jardín debe contener al menos una zona"})
        return attrs


class ReservaSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.persona.nombre", read_only=True)
    cliente_apellido = serializers.CharField(source="cliente.persona.apellido", read_only=True)
    servicio_nombre = serializers.CharField(source="servicio.nombre", read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    empleados_asignados = serializers.SerializerMethodField()
    imagenes = ImagenReservaSerializer(many=True, read_only=True)
    jardin = JardinSerializer(read_only=True)
    # Incluir diseños relacionados con información básica
    disenos = serializers.SerializerMethodField()
    encuesta_cliente_completada = serializers.SerializerMethodField()
    encuesta_cliente_respuesta_id = serializers.SerializerMethodField()
    localidad_servicio_info = serializers.SerializerMethodField()
    puede_editar_empleados_admin = serializers.SerializerMethodField()

    # Aliases de fechas para compatibilidad con frontend legacy
    # - `fecha_reserva` fue renombrada a `fecha_cita`
    # - `fecha_realizacion` ahora representa la fecha planificada propuesta por el diseñador
    fecha_reserva = serializers.DateTimeField(source="fecha_cita", read_only=True)
    fecha_realizacion = serializers.DateTimeField(read_only=True)

    # Campos de pago (ahora están en `Pago`, se exponen aplanados por compatibilidad)
    monto_sena = serializers.DecimalField(
        source="pago.monto_sena",
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    estado_pago_sena = serializers.SerializerMethodField()
    payment_id_sena = serializers.CharField(source="pago.payment_id_sena", read_only=True)
    fecha_pago_sena = serializers.DateTimeField(source="pago.fecha_pago_sena", read_only=True)

    monto_total = serializers.DecimalField(
        source="pago.monto_total",
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    monto_final = serializers.DecimalField(
        source="pago.monto_final",
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    estado_pago_final = serializers.SerializerMethodField()
    payment_id_final = serializers.CharField(source="pago.payment_id_final", read_only=True)
    fecha_pago_final = serializers.DateTimeField(source="pago.fecha_pago_final", read_only=True)
    estado_pago = serializers.SerializerMethodField()

    class Meta:
        model = Reserva
        fields = "__all__"
        read_only_fields = ("fecha_solicitud",)

    def get_disenos(self, obj):
        """Retorna los diseños asociados a esta reserva con información básica"""
        disenos = obj.disenos.all()
        return [
            {
                "id_diseno": d.id_diseno,
                "estado": d.estado,
                "titulo": d.titulo,
                "presupuesto": str(d.presupuesto),
                "disenador_id": d.disenador.id_empleado if d.disenador else None,
                "disenador_nombre": (
                    f"{d.disenador.persona.nombre} {d.disenador.persona.apellido}" if d.disenador else None
                ),
            }
            for d in disenos
        ]

    def _get_pago(self, obj):
        return getattr(obj, "pago", None)

    def get_estado_pago_sena(self, obj):
        pago = self._get_pago(obj)
        if not pago:
            return None

        # Si ya hay un payment_id registrado, consideramos la seña como pagada
        if pago.payment_id_sena:
            return "sena_pagada"

        return pago.estado_pago_sena

    def get_estado_pago_final(self, obj):
        pago = self._get_pago(obj)
        if not pago:
            return None

        # Si ya hay un payment_id del final, consideramos el final como pagado
        if pago.payment_id_final:
            return "pagado"

        return pago.estado_pago_final

    def get_estado_pago(self, obj):
        pago = self._get_pago(obj)
        if not pago:
            return None

        # Estado general coherente (evita casos donde quedó 'pendiente' aunque haya pagos registrados)
        if pago.payment_id_final or pago.estado_pago_final == "pagado":
            return "pagado"
        if pago.payment_id_sena or pago.estado_pago_sena == "sena_pagada":
            return "sena_pagada"

        return pago.estado_pago

    def _get_cliente_respuesta(self, obj):
        """Obtiene la respuesta de encuesta completada por el cliente autenticado, si existe."""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None

        cache = self.context.setdefault("_encuesta_respuestas_cache", {})
        cache_key = obj.id_reserva
        if cache_key in cache:
            return cache[cache_key]

        cliente = Cliente.objects.filter(persona__email=request.user.email).first()
        if not cliente:
            cache[cache_key] = None
            return None

        # En la normalización de encuestas, se reemplazó fecha_completada por fecha_realizacion.
        respuesta = obj.encuestas.filter(cliente=cliente, estado="completada").order_by("-fecha_realizacion").first()
        cache[cache_key] = respuesta
        return respuesta

    def get_encuesta_cliente_completada(self, obj):
        respuesta = self._get_cliente_respuesta(obj)
        return bool(respuesta)

    def get_encuesta_cliente_respuesta_id(self, obj):
        respuesta = self._get_cliente_respuesta(obj)
        return respuesta.id_encuesta_respuesta if respuesta else None

    def get_empleados_asignados(self, obj):
        asignaciones = list(obj.asignaciones.select_related("empleado__persona").all())
        if not asignaciones:
            return []

        serializer = EmpleadoAsignadoSerializer(asignaciones, many=True)
        data_by_empleado = {
            asignacion.empleado_id: dict(data) for asignacion, data in zip(asignaciones, serializer.data, strict=False)
        }

        empleados_ordenados = ordenar_empleados_por_puntuacion([asignacion.empleado for asignacion in asignaciones])

        resultado = []
        for prioridad, empleado in enumerate(empleados_ordenados, start=1):
            data = data_by_empleado.get(empleado.id_empleado)
            if not data:
                continue
            data["prioridad"] = prioridad
            resultado.append(data)

        return resultado

    def get_localidad_servicio_info(self, obj):
        localidad = obj.localidad_servicio
        if not localidad:
            return None
        return {
            "id": localidad.id_localidad,
            "nombre": localidad.nombre_localidad,
            "provincia": localidad.nombre_provincia,
            "pais": localidad.nombre_pais,
            "cp": localidad.cp,
            "latitud": (float(localidad.latitud) if localidad.latitud is not None else None),
            "longitud": (float(localidad.longitud) if localidad.longitud is not None else None),
        }

    def get_puede_editar_empleados_admin(self, obj):
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return False

        # Consideramos admin a:
        # - staff/superuser
        # - o perfil.tipo_usuario == "administrador"
        # (hay usuarios que son staff pero su perfil puede quedar como "empleado")
        es_admin = bool(request.user.is_staff or request.user.is_superuser)
        try:
            es_admin = es_admin or (request.user.perfil.tipo_usuario == "administrador")
        except Exception:
            pass

        if not es_admin:
            return False

        # Regla de negocio:
        # - Se puede editar asignación SOLO después de que se haya pagado el monto final
        # - y hasta que el servicio se finalice (completada). No aplica a canceladas.
        pago = getattr(obj, "pago", None)
        if not pago:
            try:
                pago = obj.obtener_pago()
            except Exception:
                pago = None

        if obj.estado in ("completada", "cancelada"):
            return False

        # Mantener la edición acotada a los estados operativos
        if obj.estado not in ("confirmada", "en_curso"):
            return False

        if not pago:
            return False

        return bool(pago.estado_pago_final == "pagado" or pago.payment_id_final)


class EditarEmpleadosReservaSerializer(serializers.Serializer):
    empleados_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=True,
        allow_empty=True,
    )


class ImagenDisenoSerializer(serializers.ModelSerializer):
    """Serializer para las imágenes de un diseño"""

    imagen_url = serializers.SerializerMethodField()

    class Meta:
        model = ImagenDiseno
        fields = [
            "id_imagen_diseno",
            "imagen",
            "imagen_url",
            "descripcion",
            "orden",
            "fecha_subida",
        ]
        read_only_fields = ["id_imagen_diseno", "fecha_subida"]

    def get_imagen_url(self, obj):
        if obj.imagen:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.imagen.url)
            return obj.imagen.url
        return None


class ImagenZonaSerializer(serializers.ModelSerializer):
    imagen_url = serializers.SerializerMethodField()

    class Meta:
        model = ImagenZona
        fields = [
            "id_imagen_zona",
            "imagen",
            "imagen_url",
            "descripcion",
        ]
        read_only_fields = ["id_imagen_zona"]

    def get_imagen_url(self, obj):
        if obj.imagen:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.imagen.url)
            return obj.imagen.url
        return None


class ZonaJardinSerializer(serializers.ModelSerializer):
    imagenes = serializers.SerializerMethodField()

    class Meta:
        model = ZonaJardin
        fields = [
            "id_zona",
            "jardin",
            "nombre",
            "ancho",
            "largo",
            "forma",
            "notas",
            "imagenes",
        ]
        read_only_fields = ["id_zona", "jardin"]

    def get_imagenes(self, obj):
        request = self.context.get("request")
        serializer = ImagenZonaSerializer(
            obj.imagenes.order_by("id_imagen_zona"),
            many=True,
            context={"request": request},
        )
        return serializer.data


class DisenoProductoSerializer(serializers.ModelSerializer):
    """Serializer para productos incluidos en un diseño"""

    producto_nombre = serializers.CharField(source="producto.nombre", read_only=True)
    producto_codigo = serializers.CharField(source="producto.codigo", read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = DisenoProducto
        fields = [
            "id_diseno_producto",
            "producto",
            "producto_nombre",
            "producto_codigo",
            "cantidad",
            "precio_unitario",
            "subtotal",
            "notas",
        ]
        read_only_fields = ["id_diseno_producto", "subtotal"]


class FormaTerrenoSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormaTerreno
        fields = ["id_forma", "nombre"]
        read_only_fields = ["id_forma"]


class DisenoSerializer(serializers.ModelSerializer):
    """Serializer básico para listar diseños"""

    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    servicio_nombre = serializers.CharField(source="servicio.nombre", read_only=True)
    reserva_id = serializers.IntegerField(source="reserva.id_reserva", read_only=True)
    reserva_fecha_cita = serializers.DateTimeField(source="reserva.fecha_cita", read_only=True)
    cliente_nombre = serializers.SerializerMethodField()
    disenador_id = serializers.IntegerField(source="disenador.id_empleado", read_only=True, allow_null=True)
    disenador_nombre = serializers.SerializerMethodField()
    tareas_diseno = TareaSerializer(many=True, read_only=True)
    tareas_diseno_items = serializers.SerializerMethodField()

    class Meta:
        model = Diseno
        fields = [
            "id_diseno",
            "titulo",
            "descripcion",
            "presupuesto",
            "estado",
            "estado_display",
            "reserva",
            "reserva_id",
            "reserva_fecha_cita",
            "servicio",
            "servicio_nombre",
            "cliente_nombre",
            "disenador",
            "disenador_id",
            "disenador_nombre",
            "fecha_creacion",
            "fecha_presentacion",
            "fecha_respuesta",
            "fecha_propuesta",
            "fecha_inicio",
            "hora_inicio",
            "fecha_fin",
            "hora_fin",
            "tareas_diseno",
            "tareas_diseno_items",
        ]
        read_only_fields = [
            "id_diseno",
            "fecha_creacion",
            "fecha_presentacion",
            "fecha_respuesta",
        ]

    def get_cliente_nombre(self, obj):
        if obj.reserva and obj.reserva.cliente and obj.reserva.cliente.persona:
            return f"{obj.reserva.cliente.persona.nombre} {obj.reserva.cliente.persona.apellido}"
        return None

    def get_disenador_nombre(self, obj):
        if obj.disenador and obj.disenador.persona:
            return f"{obj.disenador.persona.nombre} {obj.disenador.persona.apellido}"
        return None

    def get_tareas_diseno_items(self, obj):
        items = obj.diseno_tareas.select_related("tarea").all()
        return [
            {
                "tarea_id": it.tarea_id,
                "tarea_nombre": getattr(it.tarea, "nombre", None),
                "duracion_base": getattr(it.tarea, "duracion_base", None),
                "cantidad": it.cantidad,
            }
            for it in items
        ]


class DisenoDetalleSerializer(serializers.ModelSerializer):
    """Serializer completo con productos e imágenes"""

    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    servicio_nombre = serializers.CharField(source="servicio.nombre", read_only=True)
    reserva_id = serializers.IntegerField(source="reserva.id_reserva", read_only=True)
    reserva_fecha_cita = serializers.DateTimeField(source="reserva.fecha_cita", read_only=True)
    cliente_nombre = serializers.SerializerMethodField()
    disenador_nombre = serializers.SerializerMethodField()
    productos = DisenoProductoSerializer(many=True, read_only=True)
    imagenes = ImagenDisenoSerializer(many=True, read_only=True)
    total_productos = serializers.SerializerMethodField()
    tareas_diseno = TareaSerializer(many=True, read_only=True)
    tareas_diseno_items = serializers.SerializerMethodField()

    class Meta:
        model = Diseno
        fields = [
            "id_diseno",
            "titulo",
            "descripcion",
            "presupuesto",
            "estado",
            "estado_display",
            "reserva",
            "reserva_id",
            "reserva_fecha_cita",
            "servicio",
            "servicio_nombre",
            "cliente_nombre",
            "disenador",
            "disenador_nombre",
            "productos",
            "imagenes",
            "total_productos",
            "observaciones_cliente",
            "notas_internas",
            "fecha_creacion",
            "fecha_presentacion",
            "fecha_respuesta",
            "fecha_propuesta",
            "fecha_inicio",
            "hora_inicio",
            "fecha_fin",
            "hora_fin",
            "tareas_diseno",
            "tareas_diseno_items",
        ]
        read_only_fields = [
            "id_diseno",
            "fecha_creacion",
            "fecha_presentacion",
            "fecha_respuesta",
        ]

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

    def get_tareas_diseno_items(self, obj):
        items = obj.diseno_tareas.select_related("tarea").all()
        return [
            {
                "tarea_id": it.tarea_id,
                "tarea_nombre": getattr(it.tarea, "nombre", None),
                "duracion_base": getattr(it.tarea, "duracion_base", None),
                "cantidad": it.cantidad,
            }
            for it in items
        ]


class CrearDisenoSerializer(serializers.Serializer):
    """Serializer para crear un diseño completo con productos e imágenes"""

    titulo = serializers.CharField(max_length=200)
    descripcion = serializers.CharField(required=False, allow_blank=True)
    presupuesto = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    reserva_id = serializers.IntegerField(required=False, allow_null=True)
    servicio_id = serializers.IntegerField()
    disenador_id = serializers.IntegerField(required=False, allow_null=True)
    notas_internas = serializers.CharField(required=False, allow_blank=True)
    fecha_propuesta = serializers.DateTimeField(required=False, allow_null=True)

    # Tareas propias del diseño.
    # Acepta dos formatos para compatibilidad:
    # - [1,2,3] (lista de IDs) => cantidad=1
    # - [{"tarea_id": 1, "cantidad": 3}, ...]
    tareas_diseno = serializers.ListField(child=serializers.JSONField(), required=False, allow_empty=True)

    # Productos como lista de diccionarios
    productos = serializers.ListField(child=serializers.DictField(), required=False, allow_empty=True)

    # Imágenes se manejarán por separado en la vista
    def validate_servicio_id(self, value):
        if not Servicio.objects.filter(id_servicio=value).exists():
            raise serializers.ValidationError("El servicio no existe")
        return value

    def validate_productos(self, value):
        """Validar que los productos tengan los campos requeridos"""
        for producto in value:
            if "producto_id" not in producto:
                raise serializers.ValidationError("Cada producto debe tener 'producto_id'")
            if "cantidad" not in producto:
                raise serializers.ValidationError("Cada producto debe tener 'cantidad'")
            if "precio_unitario" not in producto:
                raise serializers.ValidationError("Cada producto debe tener 'precio_unitario'")
        return value

    def validate_tareas_diseno(self, value):
        if not value:
            return []

        # Normalizar a lista de {tarea_id, cantidad}
        merged: dict[int, int] = {}
        for raw in value:
            if isinstance(raw, (int, str)):
                tarea_id = int(raw)
                qty = 1
            elif isinstance(raw, dict):
                tarea_id = raw.get("tarea_id", raw.get("id_tarea", raw.get("tarea")))
                if tarea_id is None:
                    raise serializers.ValidationError(
                        "Cada tarea debe tener 'tarea_id' (o 'id_tarea' / 'tarea')"
                    )
                tarea_id = int(tarea_id)
                qty = int(raw.get("cantidad", 1))
            else:
                raise serializers.ValidationError("Formato inválido de tareas_diseno")

            if qty < 1:
                raise serializers.ValidationError("La cantidad de una tarea debe ser >= 1")

            merged[tarea_id] = merged.get(tarea_id, 0) + qty

        ids = list(merged.keys())
        existentes = set(Tarea.objects.filter(id_tarea__in=ids).values_list("id_tarea", flat=True))
        faltantes = [i for i in ids if i not in existentes]
        if faltantes:
            raise serializers.ValidationError(f"Tareas inexistentes: {faltantes}")

        return [{"tarea_id": tid, "cantidad": qty} for tid, qty in merged.items()]
