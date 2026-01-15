from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets

from .models import Compra, DetalleCompra, Pago
from .serializers import (
    CompraCreateSerializer,
    CompraSerializer,
    DetalleCompraSerializer,
    PagoSerializer,
)


class PagoViewSet(viewsets.ModelViewSet):
    queryset = Pago.objects.all()
    serializer_class = PagoSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ["tipo", "descripcion"]
    ordering_fields = ["tipo"]
    ordering = ["tipo"]


class CompraViewSet(viewsets.ModelViewSet):
    queryset = Compra.objects.select_related("proveedor").prefetch_related("detalles").all()
    serializer_class = CompraSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = {
        "proveedor": ["exact"],
        "fecha": ["gte", "lte", "exact"],
        "total": ["gte", "lte", "exact"],
    }
    search_fields = ["proveedor__razon_social", "observaciones"]
    ordering_fields = ["fecha", "total"]
    ordering = ["-fecha"]

    def get_serializer_class(self):
        """Usa CompraCreateSerializer para crear, CompraSerializer para el resto"""
        if self.action in ["create", "update", "partial_update"]:
            return CompraCreateSerializer
        return CompraSerializer


class DetalleCompraViewSet(viewsets.ModelViewSet):
    queryset = DetalleCompra.objects.select_related("compra", "producto").all()
    serializer_class = DetalleCompraSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["compra", "producto"]
    search_fields = ["producto__nombre"]
    ordering_fields = ["fecha_creacion"]
    ordering = ["-fecha_creacion"]
