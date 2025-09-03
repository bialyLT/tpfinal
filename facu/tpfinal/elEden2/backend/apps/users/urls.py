from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r'personas', views.PersonaViewSet)
router.register(r'usuarios', views.UsuarioViewSet)
router.register(r'roles', views.RolViewSet)
router.register(r'pagos', views.PagoViewSet)
router.register(r'metodos-pago', views.MetodoPagoViewSet)
router.register(r'historial-acceso', views.HistorialAccesoViewSet)
router.register(r'configuraciones', views.ConfiguracionUsuarioViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # Auth endpoints
    path('auth/login/', views.LoginView.as_view(), name='auth-login'),
    path('auth/register/', views.RegisterPublicView.as_view(), name='auth-register'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/user/', views.ProfileView.as_view(), name='auth-user'),
    path('auth/logout/', views.LogoutView.as_view(), name='auth-logout'),
]
