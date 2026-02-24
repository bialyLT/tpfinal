from django.conf import settings
from django.db import models


class Notification(models.Model):
	recipient = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		null=True,
		blank=True,
		on_delete=models.SET_NULL,
		related_name="notifications",
	)
	recipient_email = models.EmailField()
	subject = models.CharField(max_length=255)
	body = models.TextField()
	created_at = models.DateTimeField(auto_now_add=True)
	read_at = models.DateTimeField(null=True, blank=True)

	class Meta:
		ordering = ["-created_at"]
		indexes = [
			models.Index(fields=["recipient_email"]),
			models.Index(fields=["read_at"]),
		]

	@property
	def is_read(self):
		return self.read_at is not None

	def __str__(self):
		return f"{self.subject} -> {self.recipient_email}"
