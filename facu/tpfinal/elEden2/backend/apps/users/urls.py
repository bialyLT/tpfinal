from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"generos", views.GeneroViewSet)
router.register(r"tipos-documento", views.TipoDocumentoViewSet)
router.register(r"localidades", views.LocalidadViewSet)
router.register(r"personas", views.PersonaViewSet)
router.register(r"clientes", views.ClienteViewSet)
router.register(r"proveedores", views.ProveedorViewSet)
router.register(r"empleados", views.EmpleadoViewSet, basename="empleado")

urlpatterns = [
    path("users/", include(router.urls)),
    path("users/me/", views.CurrentUserView.as_view(), name="current-user"),
    path(
        "users/address/lookup/",
        views.AddressLookupView.as_view(),
        name="address-lookup",
    ),
]
