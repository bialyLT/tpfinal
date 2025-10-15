from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'servicios', views.ServicioViewSet)
router.register(r'reservas', views.ReservaViewSet)

urlpatterns = [
    path('servicios/', include(router.urls)),
]
