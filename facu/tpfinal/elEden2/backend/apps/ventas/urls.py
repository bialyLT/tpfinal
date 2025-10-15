from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PagoViewSet, CompraViewSet, VentaViewSet, DetalleVentaViewSet, DetalleCompraViewSet

router = DefaultRouter()
router.register(r'pagos', PagoViewSet)
router.register(r'compras', CompraViewSet)
router.register(r'detalles-compra', DetalleCompraViewSet)
router.register(r'ventas', VentaViewSet)
router.register(r'detalles-venta', DetalleVentaViewSet)

urlpatterns = [
    path('ventas/', include(router.urls)),
]
