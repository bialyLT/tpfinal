from datetime import datetime, time

from django.db import models
from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import IsAdminUser

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogListAPIView(generics.ListAPIView):
    """Lista paginada de registros de auditoría para administradores."""

    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUser]
    queryset = AuditLog.objects.select_related("user").order_by("-created_at")

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        # Nunca mostrar endpoints de autenticación Google en auditoría
        queryset = queryset.exclude(endpoint__startswith="/api/v1/auth/google/")

        operation = params.get("operation")
        if operation:
            normalized = operation.strip().lower()
            operation_map = {
                "create": ["POST"],
                "update": ["PUT", "PATCH"],
                "delete": ["DELETE"],
            }
            methods = operation_map.get(normalized)
            if methods:
                queryset = queryset.filter(method__in=methods)

        metodo = params.get("method")
        if metodo:
            queryset = queryset.filter(method__iexact=metodo.upper())

        entity = params.get("entity")
        if entity:
            queryset = queryset.filter(entity__icontains=entity)

        role = params.get("role")
        if role:
            queryset = queryset.filter(role=role)

        user_id = params.get("user_id")
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        search = params.get("search")
        if search:
            queryset = queryset.filter(
                models.Q(user__username__icontains=search)
                | models.Q(user__email__icontains=search)
                | models.Q(action__icontains=search)
                | models.Q(entity__icontains=search)
                | models.Q(object_id__icontains=search)
            )

        start_date = params.get("start_date")
        if start_date:
            start_dt = self._parse_date(start_date, is_start=True)
            if start_dt:
                queryset = queryset.filter(created_at__gte=start_dt)

        end_date = params.get("end_date")
        if end_date:
            end_dt = self._parse_date(end_date, is_start=False)
            if end_dt:
                queryset = queryset.filter(created_at__lte=end_dt)

        return queryset

    def _parse_date(self, value: str, *, is_start: bool) -> datetime | None:
        try:
            parsed_date = datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError:
            return None

        combined = datetime.combine(parsed_date, time.min if is_start else time.max)
        if timezone.is_naive(combined):
            combined = timezone.make_aware(combined, timezone.get_current_timezone())
        return combined
