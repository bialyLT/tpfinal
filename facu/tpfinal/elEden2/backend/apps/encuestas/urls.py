from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EncuestaViewSet,
    PreguntaViewSet,
    EncuestaRespuestaViewSet,
    RespuestaViewSet,
    EmpleadoImpactoEncuestaAPIView,
)

router = DefaultRouter()
router.register(r'encuestas', EncuestaViewSet)
router.register(r'preguntas', PreguntaViewSet)
router.register(r'encuestas-respuestas', EncuestaRespuestaViewSet)
router.register(r'respuestas', RespuestaViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('encuestas/empleados/impacto-respuestas/', EmpleadoImpactoEncuestaAPIView.as_view(), name='empleado-impacto-respuestas'),
]
