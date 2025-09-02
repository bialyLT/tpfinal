from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'personas', views.PersonaViewSet)
router.register(r'usuarios', views.UsuarioViewSet)
router.register(r'roles', views.RolViewSet)
router.register(r'pagos', views.PagoViewSet)
router.register(r'metodos-pago', views.MetodoPagoViewSet)
router.register(r'historial-acceso', views.HistorialAccesoViewSet)
router.register(r'configuraciones', views.ConfiguracionUsuarioViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
