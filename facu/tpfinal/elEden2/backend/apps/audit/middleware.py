from __future__ import annotations

import json
from typing import Any, Optional, Tuple

from django.utils.deprecation import MiddlewareMixin

from .services import AuditService, sanitize_payload


class AuditLogMiddleware(MiddlewareMixin):
    TRACKED_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}
    API_PREFIX = '/api/'
    EXCLUDED_PATHS = (
        '/api/v1/audit/logs/',
        '/api/v1/token/',
        '/api/v1/token/refresh/',
        '/api/v1/token/blacklist/',
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

        user = getattr(request, 'user', None)
        if not getattr(user, 'is_authenticated', False):
            return

        role = self._resolve_role(user)
        if role not in {'administrador', 'empleado'}:
            return

        entity, object_id = self._extract_entity(path)
        payload = self._extract_request_payload(request)
        response_body = self._extract_response_body(response)

        AuditService.register(
            user=user,
            role=role,
            method=request.method,
            action=self._build_action(request.method, entity),
            entity=entity,
            object_id=object_id,
            endpoint=path,
            ip_address=self._get_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            payload=payload,
            response_code=getattr(response, 'status_code', None),
            response_body=response_body,
            metadata=self._build_metadata(request, response)
        )

    def _extract_request_payload(self, request) -> Optional[Any]:
        try:
            body = request.body
        except Exception:
            return None

        if not body:
            return None

        content_type = request.META.get('CONTENT_TYPE', '')
        if 'application/json' in content_type:
            try:
                data = json.loads(body.decode('utf-8'))
            except (ValueError, UnicodeDecodeError):
                data = body[:1024]
        else:
            data = {'_raw': f'{len(body)} bytes', 'content_type': content_type}

        return sanitize_payload(data)

    def _extract_response_body(self, response) -> Optional[Any]:
        if not hasattr(response, 'content'):
            return None
        try:
            content = response.content
        except Exception:
            return None

        if not content:
            return None

        content_type = response.get('Content-Type', '')
        if 'application/json' in content_type:
            try:
                data = json.loads(content.decode('utf-8'))
            except (ValueError, UnicodeDecodeError):
                data = content[:1024]
        else:
            data = {'_raw': f'{len(content)} bytes', 'content_type': content_type}

        return sanitize_payload(data)

    def _extract_entity(self, path: str) -> Tuple[str, Optional[str]]:
        segments = [segment for segment in path.rstrip('/').split('/') if segment]
        if not segments:
            return 'root', None

        entity = segments[-1]
        object_id = None
        if entity.isdigit() and len(segments) >= 2:
            object_id = entity
            entity = segments[-2]
        elif '-' in entity and entity.replace('-', '').isdigit():
            object_id = entity
            entity = segments[-2] if len(segments) >= 2 else entity

        return entity, object_id

    def _build_action(self, method: str, entity: str) -> str:
        action_map = {
            'POST': 'Creación',
            'PUT': 'Actualización total',
            'PATCH': 'Actualización parcial',
            'DELETE': 'Eliminación'
        }
        verb = action_map.get(method.upper(), method)
        return f"{verb} de {entity}"

    def _get_ip(self, request) -> Optional[str]:
        forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        if forwarded:
            return forwarded.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')

    def _resolve_role(self, user) -> str:
        if not getattr(user, 'is_authenticated', False):
            return 'anonimo'

        if user.is_superuser or user.is_staff:
            return 'administrador'

        perfil = getattr(user, 'perfil', None)
        if perfil and getattr(perfil, 'tipo_usuario', None):
            tipo = perfil.tipo_usuario.lower()
            if tipo in {'administrador', 'empleado', 'diseñador', 'cliente'}:
                return 'empleado' if tipo == 'diseñador' else tipo

        group_names = set(user.groups.values_list('name', flat=True))
        if 'Administradores' in group_names:
            return 'administrador'
        if 'Empleados' in group_names:
            return 'empleado'

        return 'cliente'

    def _build_metadata(self, request, response):
        return {
            'query_params': request.GET.dict(),
            'response_reason': getattr(response, 'reason_phrase', ''),
        }
