from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categorias', views.CategoriaViewSet)
router.register(r'marcas', views.MarcaViewSet)
router.register(r'unidades', views.UnidadViewSet)
router.register(r'productos', views.ProductoViewSet)
router.register(r'stock', views.StockViewSet)
router.register(r'movimientos-stock', views.MovimientoStockViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
