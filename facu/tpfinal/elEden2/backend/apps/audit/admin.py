from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'user', 'role', 'method', 'entity', 'response_code')
    list_filter = ('role', 'method', 'entity', 'response_code')
    search_fields = ('user__username', 'user__email', 'action', 'entity', 'object_id', 'endpoint')
    readonly_fields = ('created_at',)

    fieldsets = (
        (None, {
            'fields': ('created_at', 'user', 'role', 'method', 'action', 'entity', 'object_id', 'endpoint')
        }),
        ('Detalles de la petición', {
            'fields': ('ip_address', 'user_agent', 'payload')
        }),
        ('Respuesta', {
            'fields': ('response_code', 'response_body', 'metadata')
        }),
    )
