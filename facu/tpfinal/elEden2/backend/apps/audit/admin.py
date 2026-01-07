from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "user", "role", "method", "entity")
    list_filter = ("role", "method", "entity")
    search_fields = (
        "user__username",
        "user__email",
        "action",
        "entity",
    )
    readonly_fields = ("created_at",)

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "created_at",
                    "user",
                    "role",
                    "method",
                    "action",
                    "entity",
                )
            },
        ),
        ("Respuesta", {"fields": ("response_body", "metadata")}),
    )
