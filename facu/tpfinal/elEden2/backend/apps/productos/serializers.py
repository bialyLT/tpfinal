from rest_framework import serializers

from .models import Categoria, Especie, Marca, Producto, Stock, Tarea


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = "__all__"
        read_only_fields = ("fecha_creacion", "fecha_actualizacion")


class MarcaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Marca
        fields = "__all__"
        read_only_fields = ("fecha_creacion", "fecha_actualizacion")


class EspecieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Especie
        fields = "__all__"


class TareaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tarea
        fields = "__all__"


# UnidadSerializer comentado - modelo no existe en el diagrama ER
# class UnidadSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Unidad
#         fields = '__all__'
#         read_only_fields = ('fecha_creacion', 'fecha_actualizacion')


class StockSerializer(serializers.ModelSerializer):

    class Meta:
        model = Stock
        fields = "__all__"


class ProductoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source="categoria.nombre_categoria", read_only=True)
    tipoProducto = serializers.BooleanField(source="tipo_producto")
    marca_nombre = serializers.SerializerMethodField()
    especie_nombre = serializers.SerializerMethodField()
    tareas = serializers.PrimaryKeyRelatedField(queryset=Tarea.objects.all(), many=True, required=False)
    precio = serializers.SerializerMethodField()
    stock_actual = serializers.SerializerMethodField()
    stock = StockSerializer(read_only=True)

    class Meta:
        model = Producto
        fields = [
            "id_producto",
            "nombre",
            "descripcion",
            "tipoProducto",
            "categoria",
            "categoria_nombre",
            "marca",
            "marca_nombre",
            "especie",
            "especie_nombre",
            "tareas",
            "imagen",
            "precio",
            "stock_actual",
            "stock",
            "fecha_creacion",
            "fecha_actualizacion",
        ]
        read_only_fields = (
            "fecha_creacion",
            "fecha_actualizacion",
            "precio",
            "stock_actual",
        )

    def get_precio(self, obj):
        """Obtiene el precio del producto (property)"""
        return obj.precio

    def get_marca_nombre(self, obj):
        return obj.marca.nombre_marca if getattr(obj, "marca", None) else None

    def get_especie_nombre(self, obj):
        return obj.especie.nombre_especie if getattr(obj, "especie", None) else None

    def get_stock_actual(self, obj):
        """Obtiene el stock actual del producto (property)"""
        return obj.stock_actual

    def validate(self, attrs):
        """Valida coherencia entre tipoProducto y marca/especie.

        - Insumo (tipoProducto=True): requiere marca y no debe tener especie.
        - Planta (tipoProducto=False): requiere especie y no debe tener marca.
        """

        tipo_producto = attrs.get("tipo_producto")
        if tipo_producto is None and self.instance is not None:
            tipo_producto = self.instance.tipo_producto
        if tipo_producto is None:
            tipo_producto = True

        if tipo_producto:
            marca = attrs.get("marca") if "marca" in attrs else getattr(self.instance, "marca", None)
            if not marca:
                raise serializers.ValidationError({"marca": "La marca es requerida cuando el producto es un insumo."})
            # limpiar especie si llega
            attrs["especie"] = None
        else:
            especie = attrs.get("especie") if "especie" in attrs else getattr(self.instance, "especie", None)
            if not especie:
                raise serializers.ValidationError({"especie": "La especie es requerida cuando el producto es una planta."})
            # limpiar marca si llega
            attrs["marca"] = None

        return attrs

    def create(self, validated_data):
        tareas = validated_data.pop("tareas", None)
        instance = super().create(validated_data)
        if tareas is not None:
            instance.tareas.set(tareas)
        return instance

    def update(self, instance, validated_data):
        tareas = validated_data.pop("tareas", None)
        instance = super().update(instance, validated_data)
        if tareas is not None:
            instance.tareas.set(tareas)
        return instance

    def to_representation(self, instance):
        """Personaliza la representación para devolver URL completa de imagen"""
        representation = super().to_representation(instance)
        if instance.imagen:
            request = self.context.get("request")
            if request:
                representation["imagen"] = request.build_absolute_uri(instance.imagen.url)
            else:
                representation["imagen"] = instance.imagen.url
        else:
            representation["imagen"] = None
        return representation


class ProductoListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listas de productos"""

    categoria_nombre = serializers.CharField(source="categoria.nombre_categoria", read_only=True)
    tipoProducto = serializers.BooleanField(source="tipo_producto")
    marca_nombre = serializers.SerializerMethodField()
    especie_nombre = serializers.SerializerMethodField()
    tareas = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    precio = serializers.SerializerMethodField()
    stock_actual = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = (
            "id_producto",
            "nombre",
            "descripcion",
            "tipoProducto",
            "categoria",
            "categoria_nombre",
            "marca",
            "marca_nombre",
            "especie",
            "especie_nombre",
            "tareas",
            "imagen",
            "precio",
            "stock_actual",
        )

    def get_precio(self, obj):
        """Obtiene el precio del producto (property)"""
        return obj.precio

    def get_marca_nombre(self, obj):
        return obj.marca.nombre_marca if getattr(obj, "marca", None) else None

    def get_especie_nombre(self, obj):
        return obj.especie.nombre_especie if getattr(obj, "especie", None) else None

    def get_stock_actual(self, obj):
        """Obtiene el stock actual del producto (property)"""
        return obj.stock_actual

    def to_representation(self, instance):
        """Personaliza la representación para devolver URL completa de imagen"""
        representation = super().to_representation(instance)
        if instance.imagen:
            request = self.context.get("request")
            if request:
                representation["imagen"] = request.build_absolute_uri(instance.imagen.url)
            else:
                representation["imagen"] = instance.imagen.url
        else:
            representation["imagen"] = None
        return representation


# MovimientoStockSerializer comentado - modelo no existe en el diagrama ER
# class MovimientoStockSerializer(serializers.ModelSerializer):
#     producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
#     producto_codigo = serializers.CharField(source='producto.codigo', read_only=True)
#     tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
#     motivo_display = serializers.CharField(source='get_motivo_display', read_only=True)
#
#     class Meta:
#         model = MovimientoStock
#         fields = '__all__'
#         read_only_fields = ('stock_anterior', 'stock_posterior', 'fecha_creacion')
#
#     def create(self, validated_data):
#         """Crear un movimiento de stock y actualizar el stock correspondiente"""
#         return MovimientoStock.objects.create(**validated_data)
