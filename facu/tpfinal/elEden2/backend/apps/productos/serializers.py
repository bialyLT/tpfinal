from rest_framework import serializers

from .models import Categoria, Marca, Producto, Stock


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
    marca_nombre = serializers.CharField(source="marca.nombre_marca", read_only=True)
    precio = serializers.SerializerMethodField()
    stock_actual = serializers.SerializerMethodField()
    stock = StockSerializer(read_only=True)

    class Meta:
        model = Producto
        fields = [
            "id_producto",
            "nombre",
            "descripcion",
            "categoria",
            "categoria_nombre",
            "marca",
            "marca_nombre",
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


class ProductoListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listas de productos"""

    categoria_nombre = serializers.CharField(source="categoria.nombre_categoria", read_only=True)
    marca_nombre = serializers.CharField(source="marca.nombre_marca", read_only=True)
    precio = serializers.SerializerMethodField()
    stock_actual = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = (
            "id_producto",
            "nombre",
            "descripcion",
            "categoria",
            "categoria_nombre",
            "marca",
            "marca_nombre",
            "imagen",
            "precio",
            "stock_actual",
        )

    def get_precio(self, obj):
        """Obtiene el precio del producto (property)"""
        return obj.precio

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
