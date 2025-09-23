from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'tipos-servicio', views.TipoServicioViewSet)
router.register(r'servicios', views.ServicioViewSet)
router.register(r'diseños', views.DiseñoViewSet)
router.register(r'disponibilidad', views.EmpleadoDisponibilidadViewSet)
router.register(r'actualizaciones', views.ActualizacionServicioViewSet)

urlpatterns = [
    path('servicios/', include(router.urls)),
]
