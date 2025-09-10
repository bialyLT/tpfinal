from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'encuestas', views.EncuestaViewSet)
router.register(r'preguntas', views.PreguntaViewSet)
router.register(r'respuestas', views.RespuestaEncuestaViewSet)

urlpatterns = [
    path('encuestas/', include(router.urls)),
]
