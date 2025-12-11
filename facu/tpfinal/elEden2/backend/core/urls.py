from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

# Router para ViewSets
router = DefaultRouter()
# router.register(r'products', views.ProductViewSet)
# router.register(r'categories', views.CategoryViewSet)

app_name = "core"

urlpatterns = [
    # ViewSets URLs
    path("", include(router.urls)),
    # Custom API endpoints
    path("health/", views.HealthCheckView.as_view(), name="health-check"),
    # Authentication
    path("users/register/", views.RegisterView.as_view(), name="register"),
    path("reference-data/", views.ReferenceDataView.as_view(), name="reference-data"),
]
