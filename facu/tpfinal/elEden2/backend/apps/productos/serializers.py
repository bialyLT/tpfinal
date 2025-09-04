from rest_framework import serializers
from .models import Categoria, Marca, Unidad, Producto, Stock, MovimientoStock


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'
        read_only_fields = ('fecha_creacion', 'fecha_actualizacion')


class MarcaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Marca
        fields = '__all__'
        read_only_fields = ('fecha_creacion', 'fecha_actualizacion')


class UnidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unidad
        fields = '__all__'
        read_only_fields = ('fecha_creacion', 'fecha_actualizacion')


class StockSerializer(serializers.ModelSerializer):
    estado_stock = serializers.ReadOnlyField()
    necesita_reposicion = serializers.ReadOnlyField()
    
    class Meta:
        model = Stock
        fields = '__all__'
        read_only_fields = ('fecha_ultima_entrada', 'fecha_ultima_salida', 'fecha_actualizacion')


class ProductoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    marca_nombre = serializers.CharField(source='marca.nombre', read_only=True)
    unidad_nombre = serializers.CharField(source='unidad.nombre', read_only=True)
    unidad_abreviatura = serializers.CharField(source='unidad.abreviatura', read_only=True)
    stock_actual = serializers.ReadOnlyField()
    margen_ganancia = serializers.ReadOnlyField()
    stock = StockSerializer(read_only=True)
    
    class Meta:
        model = Producto
        fields = '__all__'
        read_only_fields = ('fecha_creacion', 'fecha_actualizacion')


class ProductoListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listas de productos"""
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    marca_nombre = serializers.CharField(source='marca.nombre', read_only=True)
    stock_actual = serializers.ReadOnlyField()
    
    class Meta:
        model = Producto
        fields = ('id', 'codigo', 'nombre', 'categoria_nombre', 'marca_nombre', 
                 'precio_cliente', 'estado', 'stock_actual')


class MovimientoStockSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_codigo = serializers.CharField(source='producto.codigo', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    motivo_display = serializers.CharField(source='get_motivo_display', read_only=True)
    
    class Meta:
        model = MovimientoStock
        fields = '__all__'
        read_only_fields = ('stock_anterior', 'stock_posterior', 'fecha_creacion')

    def create(self, validated_data):
        """Crear un movimiento de stock y actualizar el stock correspondiente"""
        return MovimientoStock.objects.create(**validated_data)
