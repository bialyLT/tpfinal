from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"servicios", views.ServicioViewSet)
router.register(r"reservas", views.ReservaViewSet)
router.register(r"disenos", views.DisenoViewSet)
router.register(r"formas-terreno", views.FormaTerrenoViewSet)

urlpatterns = [
    path("servicios/", include(router.urls)),
]
