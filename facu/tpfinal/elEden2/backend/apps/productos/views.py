import json
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Categoria, Especie, Marca, Producto, Stock, Tarea
from .serializers import (
    CategoriaSerializer,
    EspecieSerializer,
    MarcaSerializer,
    ProductoListSerializer,
    ProductoSerializer,
    StockSerializer,
    TareaSerializer,
)


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["nombre_categoria", "descripcion"]
    ordering_fields = ["nombre_categoria", "id_categoria"]
    ordering = ["nombre_categoria"]


class MarcaViewSet(viewsets.ModelViewSet):
    queryset = Marca.objects.all()
    serializer_class = MarcaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["nombre_marca", "descripcion"]
    ordering_fields = ["nombre_marca", "id_marca"]
    ordering = ["nombre_marca"]


class EspecieViewSet(viewsets.ModelViewSet):
    queryset = Especie.objects.all()
    serializer_class = EspecieSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["nombre_especie", "descripcion"]
    ordering_fields = ["nombre_especie", "id_especie"]
    ordering = ["nombre_especie"]


class TareaViewSet(viewsets.ModelViewSet):
    queryset = Tarea.objects.all()
    serializer_class = TareaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["nombre"]
    ordering_fields = ["nombre", "id_tarea", "duracion_base", "cantidad_personal_minimo"]
    ordering = ["nombre"]


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
    queryset = Producto.objects.select_related("categoria", "marca", "especie").prefetch_related("tareas").all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = {
        "categoria": ["exact"],
        "marca": ["exact"],
        "especie": ["exact"],
        "tipo_producto": ["exact"],
        "precio": ["gte", "lte", "exact"],
        "stock__cantidad": ["gte", "lte"],
    }
    search_fields = ["nombre", "descripcion"]
    ordering_fields = ["nombre", "fecha_creacion"]
    ordering = ["nombre"]

    def get_serializer_class(self):
        if self.action == "list":
            return ProductoListSerializer
        return ProductoSerializer

    def _normalize_tareas_in_data(self, data):
        """Permite enviar tareas como JSON dentro de multipart/form-data.

        Ej: FormData.append('tareas', '[1,2]') o '[]'
        """
        if not hasattr(data, "copy"):
            return data

        normalized = data.copy()
        if not hasattr(normalized, "getlist"):
            return normalized

        if "tareas" not in normalized:
            return normalized

        raw_values = normalized.getlist("tareas")
        if len(raw_values) != 1:
            return normalized

        raw = raw_values[0]
        if not isinstance(raw, str):
            return normalized

        raw = raw.strip()
        if raw == "":
            normalized.setlist("tareas", [])
            return normalized

        if not raw.startswith("["):
            return normalized

        try:
            parsed = json.loads(raw)
        except Exception:
            return normalized

        if not isinstance(parsed, list):
            return normalized

        normalized.setlist("tareas", [str(v) for v in parsed])
        return normalized

    def create(self, request, *args, **kwargs):
        data = self._normalize_tareas_in_data(request.data)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        data = self._normalize_tareas_in_data(request.data)
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def sin_stock(self, request):
        """Obtiene productos sin stock"""
        productos_sin_stock = []
        for producto in self.get_queryset():
            if hasattr(producto, "stock") and producto.stock.cantidad <= 0:
                productos_sin_stock.append(producto)

        serializer = self.get_serializer(productos_sin_stock, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def crear_stock(self, request, pk=None):
        """Crear registro de stock para un producto"""
        producto = self.get_object()

        if hasattr(producto, "stock"):
            return Response(
                {"error": "El producto ya tiene un registro de stock"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stock_data = request.data.copy()
        stock_data["producto"] = producto.id_producto

        serializer = StockSerializer(data=stock_data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StockViewSet(viewsets.ModelViewSet):
    queryset = Stock.objects.select_related("producto").all()
    serializer_class = StockSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["producto__nombre"]
    ordering_fields = ["cantidad"]
    ordering = ["producto__nombre"]

    @action(detail=False, methods=["get"])
    def resumen(self, request):
        """Obtiene un resumen del estado de stocks"""
        queryset = self.get_queryset()

        resumen = {
            "total_productos": queryset.count(),
            "sin_stock": queryset.filter(cantidad=0).count(),
        }

        return Response(resumen)


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
