from rest_framework import serializers
from .models import Pago, Compra, Venta, DetalleVenta, DetalleCompra


class PagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pago
        fields = '__all__'


class DetalleCompraSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    
    class Meta:
        model = DetalleCompra
        fields = '__all__'
        read_only_fields = ['subtotal', 'compra']


class DetalleCompraCreateSerializer(serializers.Serializer):
    """Serializer para crear detalles de compra dentro de una compra"""
    producto = serializers.IntegerField()
    cantidad = serializers.IntegerField(min_value=1)
    precio_unitario = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)


class CompraSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='proveedor.razon_social', read_only=True)
    detalles = DetalleCompraSerializer(many=True, read_only=True)

    class Meta:
        model = Compra
        fields = '__all__'
        read_only_fields = ['total']


class CompraCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear compras con detalles inline"""
    detalles = DetalleCompraCreateSerializer(many=True, write_only=True)
    porcentaje_ganancia = serializers.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        min_value=0, 
        max_value=100,
        write_only=True,
        help_text="Porcentaje de ganancia a aplicar sobre el precio de compra (0-100%)"
    )
    
    class Meta:
        model = Compra
        fields = ['proveedor', 'fecha', 'observaciones', 'detalles', 'porcentaje_ganancia']
    
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles')
        porcentaje_ganancia = validated_data.pop('porcentaje_ganancia', None)
        
        # Crear la compra sin total (se calculará automáticamente)
        compra = Compra.objects.create(**validated_data)
        
        # Crear los detalles
        from apps.productos.models import Producto
        for detalle_data in detalles_data:
            producto = Producto.objects.get(id_producto=detalle_data['producto'])
            DetalleCompra.objects.create(
                compra=compra,
                producto=producto,
                cantidad=detalle_data['cantidad'],
                precio_unitario=detalle_data['precio_unitario']
            )
        
        # Calcular el total automáticamente
        compra.calcular_total()
        
        # Actualizar precios de productos basados en las compras con porcentaje de ganancia
        for detalle_data in detalles_data:
            producto = Producto.objects.get(id_producto=detalle_data['producto'])
            producto.calcular_precio_desde_compras(porcentaje_ganancia=porcentaje_ganancia)
        
        return compra


class DetalleVentaSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    
    class Meta:
        model = DetalleVenta
        fields = '__all__'
        read_only_fields = ['subtotal']


class VentaSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.persona.nombre', read_only=True)
    cliente_apellido = serializers.CharField(source='cliente.persona.apellido', read_only=True)
    pago_tipo = serializers.CharField(source='pago.tipo', read_only=True)
    detalles = DetalleVentaSerializer(many=True, read_only=True)

    class Meta:
        model = Venta
        fields = '__all__'
        read_only_fields = ['total']
