from django.urls import path

from .views import AuditLogListAPIView

urlpatterns = [
    path("audit/logs/", AuditLogListAPIView.as_view(), name="audit-log-list"),
]
