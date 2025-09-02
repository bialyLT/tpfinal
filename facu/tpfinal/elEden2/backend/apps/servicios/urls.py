from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'tipos-servicio', views.TipoServicioViewSet)
router.register(r'solicitudes', views.SolicitudServicioViewSet)
router.register(r'propuestas', views.PropuestaDiseñoViewSet)
router.register(r'servicios', views.ServicioViewSet)
router.register(r'disponibilidad', views.EmpleadoDisponibilidadViewSet)
router.register(r'actualizaciones', views.ActualizacionServicioViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
