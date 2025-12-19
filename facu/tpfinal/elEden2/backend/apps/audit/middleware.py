from __future__ import annotations

import json
import re
from typing import Any, Optional, Tuple

from django.utils.deprecation import MiddlewareMixin

from .services import AuditService, sanitize_payload


class AuditLogMiddleware(MiddlewareMixin):
    TRACKED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
    API_PREFIX = "/api/"
    EXCLUDED_PATHS = (
        # Audit endpoints
        "/api/v1/audit/logs/",
        # Auth/token endpoints
        "/api/v1/token/",
        "/api/v1/token/refresh/",
        "/api/v1/token/blacklist/",
        # Google OAuth endpoints (should not appear in audit)
        "/api/v1/auth/google/",
        "/api/v1/auth/google/callback/",
    )

    def process_response(self, request, response):
        try:
            self._maybe_log(request, response)
        except Exception:
            # No interrumpir el flujo si la auditoría falla
            pass
        return response

    def _maybe_log(self, request, response):
        if request.method not in self.TRACKED_METHODS:
            return

        path = request.path
        if not path.startswith(self.API_PREFIX) or any(path.startswith(prefix) for prefix in self.EXCLUDED_PATHS):
            return

        user = getattr(request, "user", None)
        if not getattr(user, "is_authenticated", False):
            return

        role = self._resolve_role(user)
        if role not in {"administrador", "empleado"}:
            return

        entity, object_id = self._extract_entity(path)
        payload = self._extract_request_payload(request)
        response_body = self._extract_response_body(response)

        AuditService.register(
            user=user,
            role=role,
            method=request.method,
            action=self._build_action(request.method, entity, path, user, payload, response_body),
            entity=entity,
            object_id=object_id,
            endpoint=path,
            ip_address=self._get_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            payload=payload,
            response_code=getattr(response, "status_code", None),
            response_body=response_body,
            metadata=self._build_metadata(request, response),
        )

    def _extract_request_payload(self, request) -> Optional[Any]:
        content_type = request.META.get("CONTENT_TYPE", "")

        # Prefer parsed form fields for form/multipart requests (common in uploads)
        if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
            try:
                post_data = {key: values[-1] if values else "" for key, values in request.POST.lists()}
                files = list(request.FILES.keys()) if getattr(request, "FILES", None) else []
                data = {**post_data}
                if files:
                    data["_files"] = files
                if not data:
                    return None
                return sanitize_payload(data)
            except Exception:
                # Fall back to raw body handling below
                pass

        try:
            body = request.body
        except Exception:
            return None

        if not body:
            return None

        if "application/json" in content_type:
            try:
                data = json.loads(body.decode("utf-8"))
            except (ValueError, UnicodeDecodeError):
                data = body[:1024]
        else:
            data = {"_raw": f"{len(body)} bytes", "content_type": content_type}

        return sanitize_payload(data)

    def _extract_response_body(self, response) -> Optional[Any]:
        if not hasattr(response, "content"):
            return None
        try:
            content = response.content
        except Exception:
            return None

        if not content:
            return None

        content_type = response.get("Content-Type", "")
        if "application/json" in content_type:
            try:
                data = json.loads(content.decode("utf-8"))
            except (ValueError, UnicodeDecodeError):
                data = content[:1024]
        else:
            data = {"_raw": f"{len(content)} bytes", "content_type": content_type}

        return sanitize_payload(data)

    def _extract_entity(self, path: str) -> Tuple[str, Optional[str]]:
        segments = [segment for segment in path.rstrip("/").split("/") if segment]
        if not segments:
            return "root", None

        entity = segments[-1]
        object_id = None
        if entity.isdigit() and len(segments) >= 2:
            object_id = entity
            entity = segments[-2]
        elif "-" in entity and entity.replace("-", "").isdigit():
            object_id = entity
            entity = segments[-2] if len(segments) >= 2 else entity

        return entity, object_id

    def _build_action(self, method: str, entity: str, path: str, user, payload: Any, response_body: Any) -> str:
        custom = self._build_custom_action(method, path, user, payload, response_body)
        if custom:
            return custom

        action_map = {
            "POST": "Creación",
            "PUT": "Actualización total",
            "PATCH": "Actualización parcial",
            "DELETE": "Eliminación",
        }
        verb = action_map.get(method.upper(), method)
        return f"{verb} de {entity}"

    def _build_custom_action(self, method: str, path: str, user, payload: Any, response_body: Any) -> str | None:
        """Provide more meaningful messages for certain non-CRUD endpoints."""
        normalized_method = method.upper()
        normalized_path = path if path.endswith("/") else f"{path}/"

        user_display = self._get_user_display(user)

        # Weather: cancel rescheduling (dismiss alert)
        # Example: /api/v1/weather/alerts/18/dismiss/
        if normalized_method == "POST" and normalized_path.startswith("/api/v1/weather/alerts/") and normalized_path.endswith("/dismiss/"):
            return f"El usuario {user_display} canceló la reprogramación"

        # Weather: simulate rain
        # Example: /api/v1/weather/simulate/
        if normalized_method == "POST" and normalized_path == "/api/v1/weather/simulate/":
            return f"El usuario {user_display} creó una simulación de lluvia"

        # Servicios/Disenos: crear diseño completo
        # Example: /api/v1/servicios/disenos/crear-completo/
        if normalized_method == "POST" and normalized_path == "/api/v1/servicios/disenos/crear-completo/":
            reserva_id = self._extract_reserva_id(payload) or self._extract_reserva_id(response_body)
            if reserva_id:
                return f"El usuario {user_display} creó un diseño para la reserva {reserva_id}"
            return f"El usuario {user_display} creó un diseño"

        # Servicios/Disenos: presentar diseño
        # Example: /api/v1/servicios/disenos/<id>/presentar/
        if normalized_method == "POST" and normalized_path.startswith("/api/v1/servicios/disenos/") and normalized_path.endswith("/presentar/"):
            reserva_id = self._extract_reserva_id(response_body) or self._extract_reserva_id(payload)
            if reserva_id:
                return f"El usuario {user_display} presentó el diseño para la reserva {reserva_id}"
            return f"El usuario {user_display} presentó el diseño"

        # Servicios/Reservas: finalizar servicio
        # Example: /api/v1/servicios/reservas/<id>/finalizar-servicio/
        if normalized_method == "POST" and normalized_path.startswith("/api/v1/servicios/reservas/") and normalized_path.endswith("/finalizar-servicio/"):
            return f"El usuario {user_display} finalizó el servicio"

        return None

    def _get_user_display(self, user) -> str:
        if not user:
            return "Sistema"
        try:
            full_name = user.get_full_name().strip()
        except Exception:
            full_name = ""
        return full_name or getattr(user, "username", None) or getattr(user, "email", "Usuario")

    def _extract_reserva_id(self, data: Any) -> str | None:
        """Try to find a reserva identifier inside a payload/response snapshot."""
        if not data:
            return None

        # direct scalar
        if isinstance(data, (str, int)):
            return str(data)

        # dict-like
        if isinstance(data, dict):
            for key in ("reserva_id", "id_reserva", "reserva"):
                value = data.get(key)
                if value is None:
                    continue
                if isinstance(value, (str, int)) and str(value).strip():
                    return str(value).strip()
                if isinstance(value, dict):
                    nested = value.get("id_reserva") or value.get("id") or value.get("pk")
                    if nested is not None and str(nested).strip():
                        return str(nested).strip()

            # deep search (bounded)
            for _, value in list(data.items())[:25]:
                found = self._extract_reserva_id(value)
                if found:
                    return found
            return None

        # list-like
        if isinstance(data, list):
            for item in data[:25]:
                found = self._extract_reserva_id(item)
                if found:
                    return found
            return None

        return None

    def _get_ip(self, request) -> Optional[str]:
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")

    def _resolve_role(self, user) -> str:
        if not getattr(user, "is_authenticated", False):
            return "anonimo"

        if user.is_superuser or user.is_staff:
            return "administrador"

        perfil = getattr(user, "perfil", None)
        if perfil and getattr(perfil, "tipo_usuario", None):
            tipo = perfil.tipo_usuario.lower()
            if tipo in {"administrador", "empleado", "diseñador", "cliente"}:
                return "empleado" if tipo == "diseñador" else tipo

        group_names = set(user.groups.values_list("name", flat=True))
        if "Administradores" in group_names:
            return "administrador"
        if "Empleados" in group_names:
            return "empleado"

        return "cliente"

    def _build_metadata(self, request, response):
        return {
            "query_params": request.GET.dict(),
            "response_reason": getattr(response, "reason_phrase", ""),
        }
