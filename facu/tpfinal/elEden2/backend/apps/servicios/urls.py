from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"servicios", views.ServicioViewSet)
router.register(r"reservas", views.ReservaViewSet)
router.register(r"disenos", views.DisenoViewSet)
router.register(r"formas-terreno", views.FormaTerrenoViewSet)
router.register(r"objetivos-diseno", views.ObjetivoDisenoViewSet)
router.register(r"niveles-intervencion", views.OpcionNivelIntervencionViewSet)
router.register(r"presupuestos-aproximados", views.OpcionPresupuestoAproximadoViewSet)

urlpatterns = [
    path("servicios/configuracion-pagos/", views.ConfiguracionPagoAPIView.as_view(), name="configuracion-pagos"),
    path("servicios/", include(router.urls)),
]
