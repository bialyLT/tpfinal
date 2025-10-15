"""
URL configuration for elEden_api project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView
from core.views import CustomTokenObtainPairView

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # JWT Authentication (con serializer personalizado que acepta email)
    path('api/v1/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/v1/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/v1/token/blacklist/', TokenBlacklistView.as_view(), name='token_blacklist'),
    
    # API
    path('api/v1/', include('core.urls')),
    path('api/v1/', include('apps.productos.urls')),
    path('api/v1/', include('apps.users.urls')),
    path('api/v1/', include('apps.servicios.urls')),
    path('api/v1/', include('apps.encuestas.urls')),
    path('api/v1/', include('apps.ventas.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
