from __future__ import annotations

import json
from typing import Any, Optional, Tuple

from django.utils.deprecation import MiddlewareMixin
from django.forms.models import model_to_dict

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
            if getattr(request, "_skip_audit", False):
                return response
            self._maybe_log(request, response)
        except Exception:
            # No interrumpir el flujo si la auditoría falla
            pass
        return response

    def process_view(self, request, view_func, view_args, view_kwargs):
        if request.method not in {"PUT", "PATCH", "DELETE"}:
            return None

        model, lookup_field, lookup_value = self._resolve_model_and_lookup(request, view_func, view_kwargs)
        if not model or lookup_value is None:
            return None

        request._audit_model = model
        request._audit_lookup_field = lookup_field
        request._audit_lookup_value = lookup_value

        try:
            obj = model.objects.filter(**{lookup_field: lookup_value}).first()
        except Exception:
            return None

        if not obj:
            return None

        try:
            request._audit_before = sanitize_payload(model_to_dict(obj))
        except Exception:
            return None

        return None

    def _maybe_log(self, request, response):
        if request.method not in self.TRACKED_METHODS:
            return

        path = request.path
        if path.rstrip("/") == "/api/v1/servicios/configuracion-pagos" and request.method in {"PUT", "PATCH"}:
            return
        if not path.startswith(self.API_PREFIX) or any(path.startswith(prefix) for prefix in self.EXCLUDED_PATHS):
            return

        user = getattr(request, "user", None)
        if not getattr(user, "is_authenticated", False):
            return

        is_admin = bool(getattr(user, "is_superuser", False) or getattr(user, "is_staff", False))
        is_employee = bool(getattr(user, "groups", None) and user.groups.exists())

        # Solo auditar acciones de administradores y empleados
        if not is_admin and not is_employee:
            return

        role = "administrador" if is_admin else "empleado"

        entity = self._extract_entity(path)
        payload = self._extract_request_payload(request)
        response_body = self._extract_response_body(response)

        before_state = getattr(request, "_audit_before", None)
        after_state = getattr(request, "_audit_after", None)
        if request.method in {"PUT", "PATCH"}:
            model = getattr(request, "_audit_model", None)
            lookup_field = getattr(request, "_audit_lookup_field", None)
            lookup_value = getattr(request, "_audit_lookup_value", None)
            if model and lookup_field and lookup_value is not None:
                try:
                    obj = model.objects.filter(**{lookup_field: lookup_value}).first()
                    if obj:
                        after_state = sanitize_payload(model_to_dict(obj))
                except Exception:
                    pass

            if after_state is None:
                after_state = self._extract_after_state(response_body)

        if request.method == "POST":
            after_state = self._extract_after_state(response_body)

        AuditService.register(
            user=user,
            role=role,
            method=request.method,
            action=self._build_action(request.method, entity, path, user, payload, response_body),
            entity=entity,
            response_body=response_body,
            before_state=before_state,
            after_state=after_state,
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

    def _extract_entity(self, path: str) -> str:
        normalized_path = path if path.endswith("/") else f"{path}/"
        if normalized_path == "/api/v1/users/address/lookup/":
            return "direccion"

        segments = [segment for segment in path.rstrip("/").split("/") if segment]
        if not segments:
            return "root"

        entity = segments[-1]
        if entity.isdigit() and len(segments) >= 2:
            entity = segments[-2]
        elif "-" in entity and entity.replace("-", "").isdigit():
            entity = segments[-2] if len(segments) >= 2 else entity

        return entity

    def _extract_after_state(self, response_body: Any) -> Any:
        if not response_body:
            return None

        if isinstance(response_body, dict):
            for key in (
                "reserva",
                "servicio",
                "producto",
                "diseno",
                "cliente",
                "empleado",
                "proveedor",
                "categoria",
                "marca",
                "especie",
                "tarea",
                "user",
                "data",
                "result",
            ):
                value = response_body.get(key)
                if isinstance(value, dict):
                    return value

            if len(response_body) == 1:
                value = next(iter(response_body.values()))
                if isinstance(value, dict):
                    return value

        return response_body

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

        # Users: address lookup
        # Example: /api/v1/users/address/lookup/
        if normalized_method == "POST" and normalized_path == "/api/v1/users/address/lookup/":
            address = self._extract_address_text(payload, response_body)
            if address:
                return f"El usuario {user_display} consulto direccion: {address}"
            return f"El usuario {user_display} consulto una direccion"

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

    def _extract_address_text(self, payload: Any, response_body: Any) -> str | None:
        for source in (payload, response_body):
            if not isinstance(source, dict):
                continue
            for key in ("address", "direccion_formateada", "direccion", "query"):
                value = source.get(key)
                if isinstance(value, (str, int)) and str(value).strip():
                    text = str(value).strip()
                    return text[:120]
            nested = source.get("data") if isinstance(source.get("data"), dict) else None
            if nested:
                for key in ("address", "direccion_formateada", "direccion", "query"):
                    value = nested.get(key)
                    if isinstance(value, (str, int)) and str(value).strip():
                        text = str(value).strip()
                        return text[:120]
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

    def _resolve_model_and_lookup(self, request, view_func, view_kwargs) -> Tuple[Any, str, Any]:
        view_class = getattr(view_func, "cls", None)
        if not view_class:
            return None, "", None

        lookup_field = getattr(view_class, "lookup_field", "pk")
        lookup_url_kwarg = getattr(view_class, "lookup_url_kwarg", None) or lookup_field
        lookup_value = view_kwargs.get(lookup_url_kwarg)
        if lookup_value is None and "pk" in view_kwargs:
            lookup_value = view_kwargs.get("pk")

        queryset = getattr(view_class, "queryset", None)
        model = getattr(queryset, "model", None) if queryset is not None else None

        if not model:
            try:
                view = view_class()
                view.request = request
                view.args = []
                view.kwargs = view_kwargs
                actions = getattr(view_func, "actions", {}) or {}
                view.action = actions.get(request.method.lower())

                if hasattr(view, "get_queryset"):
                    qs = view.get_queryset()
                    model = getattr(qs, "model", None)

                if not model and hasattr(view, "get_serializer_class"):
                    serializer_class = view.get_serializer_class()
                    model = getattr(getattr(serializer_class, "Meta", None), "model", None)
            except Exception:
                model = None

        if not model:
            serializer_class = getattr(view_class, "serializer_class", None)
            model = getattr(getattr(serializer_class, "Meta", None), "model", None)

        return model, lookup_field, lookup_value
