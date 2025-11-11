from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EncuestaViewSet, PreguntaViewSet, EncuestaRespuestaViewSet, RespuestaViewSet

router = DefaultRouter()
router.register(r'encuestas', EncuestaViewSet)
router.register(r'preguntas', PreguntaViewSet)
router.register(r'encuestas-respuestas', EncuestaRespuestaViewSet)
router.register(r'respuestas', RespuestaViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
