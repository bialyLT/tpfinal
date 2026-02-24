from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
	list_display = ("subject", "recipient_email", "created_at", "read_at")
	list_filter = ("read_at", "created_at")
	search_fields = ("subject", "recipient_email", "body")
