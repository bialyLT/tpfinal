from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "subject",
            "body",
            "recipient_email",
            "created_at",
            "read_at",
            "is_read",
        ]

    def get_is_read(self, obj):
        return obj.read_at is not None
