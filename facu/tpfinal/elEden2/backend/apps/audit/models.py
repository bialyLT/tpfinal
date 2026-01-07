from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    role = models.CharField(max_length=32, blank=True, default="")
    method = models.CharField(max_length=10)
    action = models.CharField(max_length=120)
    entity = models.CharField(max_length=120)
    response_body = models.JSONField(null=True, blank=True)
    metadata = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Registro de auditoría"
        verbose_name_plural = "Registros de auditoría"
        db_table = "audit_log"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["created_at"]),
            models.Index(fields=["method"]),
            models.Index(fields=["entity"]),
            models.Index(fields=["role"]),
        ]

    def __str__(self):
        username = self.user.username if self.user else "Sistema"
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {username} - {self.action}"
