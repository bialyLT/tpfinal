from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q, F

from .models import Categoria, Marca, Producto, Stock
from .serializers import (
    CategoriaSerializer, MarcaSerializer,
    ProductoSerializer, ProductoListSerializer, StockSerializer
)


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['nombre_categoria', 'descripcion']
    ordering_fields = ['nombre_categoria', 'id_categoria']
    ordering = ['nombre_categoria']


class MarcaViewSet(viewsets.ModelViewSet):
    queryset = Marca.objects.all()
    serializer_class = MarcaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['nombre_marca', 'descripcion']
    ordering_fields = ['nombre_marca', 'id_marca']
    ordering = ['nombre_marca']


# UnidadViewSet comentado - modelo no existe en el diagrama ER
# class UnidadViewSet(viewsets.ModelViewSet):
#     queryset = Unidad.objects.all()
#     serializer_class = UnidadSerializer
#     permission_classes = [EsEmpleadoOAdministrador]
#     filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
#     filterset_fields = ['activo']
#     search_fields = ['nombre', 'abreviatura', 'descripcion']
#     ordering_fields = ['nombre', 'fecha_creacion']
#     ordering = ['nombre']


class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.select_related('categoria', 'marca').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['categoria', 'marca']
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['nombre', 'fecha_creacion']
    ordering = ['nombre']

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductoListSerializer
        return ProductoSerializer

    @action(detail=False, methods=['get'])
    def stock_bajo(self, request):
        """Obtiene productos con stock bajo"""
        productos_stock_bajo = []
        for producto in self.get_queryset():
            if hasattr(producto, 'stock') and producto.stock.necesita_reposicion:
                productos_stock_bajo.append(producto)
        
        serializer = self.get_serializer(productos_stock_bajo, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def sin_stock(self, request):
        """Obtiene productos sin stock"""
        productos_sin_stock = []
        for producto in self.get_queryset():
            if hasattr(producto, 'stock') and producto.stock.cantidad_actual <= 0:
                productos_sin_stock.append(producto)
        
        serializer = self.get_serializer(productos_sin_stock, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def crear_stock(self, request, pk=None):
        """Crear registro de stock para un producto"""
        producto = self.get_object()
        
        if hasattr(producto, 'stock'):
            return Response(
                {'error': 'El producto ya tiene un registro de stock'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        stock_data = request.data.copy()
        stock_data['producto'] = producto.id
        
        serializer = StockSerializer(data=stock_data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StockViewSet(viewsets.ModelViewSet):
    queryset = Stock.objects.select_related('producto').all()
    serializer_class = StockSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['producto__nombre', 'producto__codigo', 'ubicacion']
    ordering_fields = ['cantidad_actual', 'cantidad_minima']
    ordering = ['producto__nombre']

    @action(detail=False, methods=['get'])
    def alertas(self, request):
        """Obtiene todos los stocks que necesitan reposición"""
        stocks_criticos = self.get_queryset().filter(
            cantidad_actual__lte=F('cantidad_minima')
        )
        serializer = self.get_serializer(stocks_criticos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Obtiene un resumen del estado de stocks"""
        queryset = self.get_queryset()
        
        resumen = {
            'total_productos': queryset.count(),
            'sin_stock': queryset.filter(cantidad_actual=0).count(),
            'stock_critico': queryset.filter(cantidad_actual__lte=F('cantidad_minima')).count(),
            'stock_normal': queryset.filter(cantidad_actual__gt=F('cantidad_minima')).count(),
        }
        
        return Response(resumen)


# MovimientoStockViewSet comentado - modelo no existe en el diagrama ER
# class MovimientoStockViewSet(viewsets.ModelViewSet):
#     queryset = MovimientoStock.objects.select_related('producto').all()
#     serializer_class = MovimientoStockSerializer
#     filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
#     filterset_fields = ['tipo', 'motivo', 'producto']
#     search_fields = ['producto__nombre', 'producto__codigo', 'observaciones', 'numero_documento']
#     ordering_fields = ['fecha_movimiento', 'cantidad']
#     ordering = ['-fecha_movimiento']
#
#     @action(detail=False, methods=['get'])
#     def por_producto(self, request):
#         """Obtiene movimientos de stock por producto"""
#         producto_id = request.query_params.get('producto_id')
#         if not producto_id:
#             return Response(
#                 {'error': 'Se requiere el parámetro producto_id'},
#                 status=status.HTTP_400_BAD_REQUEST
#             )
#         
#         movimientos = self.get_queryset().filter(producto_id=producto_id)
#         serializer = self.get_serializer(movimientos, many=True)
#         return Response(serializer.data)
#
#     def perform_create(self, serializer):
#         """Asegurar que se actualice el stock al crear un movimiento"""
#         movimiento = serializer.save()
#         return movimiento
