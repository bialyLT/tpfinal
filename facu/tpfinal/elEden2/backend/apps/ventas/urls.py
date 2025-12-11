from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CompraViewSet,
    DetalleCompraViewSet,
    DetalleVentaViewSet,
    PagoViewSet,
    VentaViewSet,
)

router = DefaultRouter()
router.register(r"pagos", PagoViewSet)
router.register(r"compras", CompraViewSet)
router.register(r"detalles-compra", DetalleCompraViewSet)
router.register(r"ventas", VentaViewSet)
router.register(r"detalles-venta", DetalleVentaViewSet)

urlpatterns = [
    path("ventas/", include(router.urls)),
]
