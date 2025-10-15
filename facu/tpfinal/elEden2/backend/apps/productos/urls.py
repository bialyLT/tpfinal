from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categorias', views.CategoriaViewSet)
router.register(r'marcas', views.MarcaViewSet)
# router.register(r'unidades', views.UnidadViewSet)  # Comentado - no existe en diagrama ER
router.register(r'productos', views.ProductoViewSet)
router.register(r'stock', views.StockViewSet)
# router.register(r'movimientos-stock', views.MovimientoStockViewSet)  # Comentado - no existe en diagrama ER

urlpatterns = [
    path('productos/', include(router.urls)),
]
