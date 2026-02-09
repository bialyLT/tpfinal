from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_display = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "created_at",
            "user_display",
            "role",
            "method",
            "action",
            "entity",
            "response_body",
            "before_state",
            "after_state",
        ]

    def get_user_display(self, obj):
        if not obj.user:
            return "Sistema"
        full_name = obj.user.get_full_name().strip()
        return full_name or obj.user.username
