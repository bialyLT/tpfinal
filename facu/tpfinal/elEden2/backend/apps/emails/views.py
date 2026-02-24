from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
	serializer_class = NotificationSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		user = self.request.user
		email = (user.email or "").strip()
		filters = Q(recipient=user)
		if email:
			filters |= Q(recipient_email__iexact=email)
		return Notification.objects.filter(filters).order_by("-created_at")

	@action(detail=True, methods=["post"], url_path="marcar-leida")
	def marcar_leida(self, request, pk=None):
		notif = self.get_object()
		if notif.read_at is None:
			notif.read_at = timezone.now()
			notif.save(update_fields=["read_at"])
		serializer = self.get_serializer(notif)
		return Response(serializer.data)

	@action(detail=False, methods=["post"], url_path="marcar-todas-leidas")
	def marcar_todas_leidas(self, request):
		qs = self.get_queryset().filter(read_at__isnull=True)
		now = timezone.now()
		count = qs.update(read_at=now)
		return Response({"count": count})
