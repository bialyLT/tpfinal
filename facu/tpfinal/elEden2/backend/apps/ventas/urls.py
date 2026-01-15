from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CompraViewSet,
    DetalleCompraViewSet,
    PagoViewSet,
)

router = DefaultRouter()
router.register(r"pagos", PagoViewSet)
router.register(r"compras", CompraViewSet)
router.register(r"detalles-compra", DetalleCompraViewSet)

urlpatterns = [
    path("ventas/", include(router.urls)),
]
