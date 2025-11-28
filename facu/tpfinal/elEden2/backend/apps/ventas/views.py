from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Pago, Compra, Venta, DetalleVenta, DetalleCompra
from .serializers import (
    PagoSerializer, 
    CompraSerializer, 
    CompraCreateSerializer,
    VentaSerializer, 
    DetalleVentaSerializer, 
    DetalleCompraSerializer
)


class PagoViewSet(viewsets.ModelViewSet):
    queryset = Pago.objects.all()
    serializer_class = PagoSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['tipo', 'descripcion']
    ordering_fields = ['tipo']
    ordering = ['tipo']


class CompraViewSet(viewsets.ModelViewSet):
    queryset = Compra.objects.select_related('proveedor').prefetch_related('detalles').all()
    serializer_class = CompraSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'proveedor': ['exact'],
        'fecha': ['gte', 'lte', 'exact'],
        'total': ['gte', 'lte', 'exact'],
    }
    search_fields = ['proveedor__razon_social', 'observaciones']
    ordering_fields = ['fecha', 'total']
    ordering = ['-fecha']
    
    def get_serializer_class(self):
        """Usa CompraCreateSerializer para crear, CompraSerializer para el resto"""
        if self.action in ['create', 'update', 'partial_update']:
            return CompraCreateSerializer
        return CompraSerializer


class DetalleCompraViewSet(viewsets.ModelViewSet):
    queryset = DetalleCompra.objects.select_related('compra', 'producto').all()
    serializer_class = DetalleCompraSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['compra', 'producto']
    search_fields = ['producto__nombre']
    ordering_fields = ['fecha_creacion']
    ordering = ['-fecha_creacion']


class VentaViewSet(viewsets.ModelViewSet):
    queryset = Venta.objects.select_related('cliente', 'pago').prefetch_related('detalles').all()
    serializer_class = VentaSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['cliente', 'pago', 'fecha']
    search_fields = ['cliente__persona__nombre', 'cliente__persona__apellido', 'observaciones']
    ordering_fields = ['fecha', 'total']
    ordering = ['-fecha']


class DetalleVentaViewSet(viewsets.ModelViewSet):
    queryset = DetalleVenta.objects.select_related('venta', 'producto').all()
    serializer_class = DetalleVentaSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['venta', 'producto']
    search_fields = ['producto__nombre']
    ordering_fields = ['fecha_creacion']
    ordering = ['-fecha_creacion']
