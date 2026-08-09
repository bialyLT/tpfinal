from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    EmpleadoCalificacionesBajasAPIView,
    EmpleadoImpactoEncuestaAPIView,
    EncuestaRespuestaViewSet,
    EncuestaViewSet,
    PreguntaViewSet,
    RespuestaViewSet,
)

router = DefaultRouter()
router.register(r"encuestas", EncuestaViewSet)
router.register(r"preguntas", PreguntaViewSet)
router.register(r"encuestas-respuestas", EncuestaRespuestaViewSet)
router.register(r"respuestas", RespuestaViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path(
        "encuestas/empleados/impacto-respuestas/",
        EmpleadoImpactoEncuestaAPIView.as_view(),
        name="empleado-impacto-respuestas",
    ),
    path(
        "encuestas/empleados/calificaciones-bajas/",
        EmpleadoCalificacionesBajasAPIView.as_view(),
        name="empleado-calificaciones-bajas",
    ),
]
