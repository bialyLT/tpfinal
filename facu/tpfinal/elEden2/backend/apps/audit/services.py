from __future__ import annotations

from typing import Any, Dict

from .models import AuditLog

SENSITIVE_KEYS = {
    "password",
    "new_password",
    "old_password",
    "token",
    "access",
    "refresh",
    "authorization",
    "secret",
    "api_key",
}


def sanitize_payload(data: Any, max_length: int = 2000) -> Any:
    """Return a JSON-serializable snapshot with sensitive keys masked."""
    if data is None:
        return None

    if isinstance(data, dict):
        sanitized: Dict[str, Any] = {}
        for key, value in data.items():
            key_lower = key.lower()
            if key_lower in SENSITIVE_KEYS:
                sanitized[key] = "***"
            else:
                sanitized[key] = sanitize_payload(value, max_length)
        return sanitized

    if isinstance(data, list):
        return [sanitize_payload(item, max_length) for item in data][:100]

    if isinstance(data, (str, bytes)):
        text = data.decode("utf-8", errors="ignore") if isinstance(data, bytes) else data
        return text[:max_length]

    return data


class AuditService:
    """Helper responsible for persisting audit records."""

    @staticmethod
    def register(**payload) -> AuditLog:
        return AuditLog.objects.create(**payload)
