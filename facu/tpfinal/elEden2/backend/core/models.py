"""Model definitions and shared abstractions for the core app."""

from django.db import models
from django.utils import timezone


class SoftDeleteBehaviorMixin(models.Model):
	"""Reusable soft-delete behavior.

	Assumes the model has an `activo` boolean field and optionally
	a datetime field named in `SOFT_DELETE_DELETED_AT_FIELD`.
	"""

	SOFT_DELETE_ACTIVE_FIELD = "activo"
	SOFT_DELETE_DELETED_AT_FIELD = "fecha_baja"

	class Meta:
		abstract = True

	def delete(self, using=None, keep_parents=False):
		active_field = self.SOFT_DELETE_ACTIVE_FIELD
		deleted_at_field = self.SOFT_DELETE_DELETED_AT_FIELD

		if not hasattr(self, active_field):
			raise AttributeError(f"{self.__class__.__name__} requires field '{active_field}' for soft delete")

		if getattr(self, active_field):
			setattr(self, active_field, False)
			update_fields = [active_field]

			if deleted_at_field and hasattr(self, deleted_at_field):
				setattr(self, deleted_at_field, timezone.now())
				update_fields.append(deleted_at_field)

			self.save(update_fields=update_fields)

	def restaurar(self):
		active_field = self.SOFT_DELETE_ACTIVE_FIELD
		deleted_at_field = self.SOFT_DELETE_DELETED_AT_FIELD

		if not hasattr(self, active_field):
			raise AttributeError(f"{self.__class__.__name__} requires field '{active_field}' for restore")

		if not getattr(self, active_field):
			setattr(self, active_field, True)
			update_fields = [active_field]

			if deleted_at_field and hasattr(self, deleted_at_field):
				setattr(self, deleted_at_field, None)
				update_fields.append(deleted_at_field)

			self.save(update_fields=update_fields)
