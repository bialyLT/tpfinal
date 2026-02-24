import logging

from django.contrib.auth.models import Group, User
from django.forms.models import model_to_dict
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.emails import EmailService
from apps.audit.services import AuditService, sanitize_payload

from .models import (
    Cliente,
    Empleado,
    Genero,
    Localidad,
    Persona,
    Proveedor,
    TipoDocumento,
)
from .serializers import (
    ClienteSerializer,
    CreateEmpleadoSerializer,
    GeneroSerializer,
    LocalidadSerializer,
    PersonaSerializer,
    ProveedorSerializer,
    TipoDocumentoSerializer,
    UpdateEmpleadoSerializer,
    UserSerializer,
)
from .services.address_service import (
    geocode_address,
    get_or_create_localidad,
    suggest_addresses,
)

logger = logging.getLogger(__name__)


class AddressLookupView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        query = (
            request.query_params.get("q") or request.query_params.get("query") or request.query_params.get("address")
        )
        if not query:
            return Response(
                {"error": "La dirección es requerida", "results": []},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            limit = int(request.query_params.get("limit", 5))
        except (TypeError, ValueError):
            limit = 5

        try:
            suggestions = suggest_addresses(query.strip(), limit=limit)
            return Response({"results": suggestions}, status=status.HTTP_200_OK)
        except ValueError as exc:
            return Response({"error": str(exc), "results": []}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:  # pragma: no cover - red externa
            logger.error("Error inesperado en sugerencias de dirección: %s", exc, exc_info=True)
            return Response(
                {"error": "No se pudieron obtener sugerencias", "results": []},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def post(self, request):
        address_text = request.data.get("address")
        if not address_text:
            return Response(
                {"error": "La dirección es requerida"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            geocoded = geocode_address(address_text)
            localidad = get_or_create_localidad(geocoded)

            geocoded["localidad_id"] = localidad.id_localidad
            geocoded["localidad"] = {
                "id": localidad.id_localidad,
                "nombre": localidad.nombre_localidad,
                "provincia": localidad.nombre_provincia,
                "pais": localidad.nombre_pais,
                "cp": localidad.cp,
                "latitud": (float(localidad.latitud) if localidad.latitud is not None else None),
                "longitud": (float(localidad.longitud) if localidad.longitud is not None else None),
            }

            return Response(geocoded, status=status.HTTP_200_OK)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:  # pragma: no cover - red externa
            logger.error("Error inesperado en AddressLookupView: %s", exc, exc_info=True)
            return Response(
                {"error": "No se pudo procesar la dirección"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class CurrentUserView(APIView):
    """Vista para obtener los datos del usuario autenticado actual"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        # Obtener información del perfil si existe
        perfil_data = None
        if hasattr(user, "perfil"):
            perfil_data = {
                "id_perfil": user.perfil.id_perfil,
                "tipo_usuario": user.perfil.tipo_usuario,
                "foto_perfil": (
                    request.build_absolute_uri(user.perfil.foto_perfil.url) if user.perfil.foto_perfil else None
                ),
            }

        # Obtener información del cliente o empleado si existe
        cliente_data = None
        empleado_data = None
        persona_data = None

        # Intentar obtener la Persona asociada al User
        persona = None
        if hasattr(user, "persona"):
            persona = user.persona

        # Si no tiene relación directa, buscar por email (usuarios antiguos)
        if not persona:
            try:
                persona = Persona.objects.select_related("localidad", "genero", "tipo_documento").get(email=user.email)
            except Persona.DoesNotExist:
                pass

        # Si encontramos Persona pero no está vinculada al User, persistimos el vínculo.
        # Esto evita que el resto del sistema "no vea" las relaciones cliente/empleado.
        if persona and persona.user_id is None:
            persona.user = user
            persona.save(update_fields=["user"])

        if persona:
            # Construir dirección completa
            direccion_partes = [persona.calle, persona.numero]
            if persona.piso:
                direccion_partes.append(f"Piso {persona.piso}")
            if persona.dpto:
                direccion_partes.append(f"Dpto {persona.dpto}")

            direccion_completa = ", ".join(direccion_partes)
            if persona.localidad:
                direccion_completa += f", {persona.localidad.nombre_localidad}, {persona.localidad.nombre_provincia}"
                if persona.localidad.nombre_pais:
                    direccion_completa += f", {persona.localidad.nombre_pais}"

            # Datos completos de Persona para edición
            persona_data = {
                "id_persona": persona.id_persona,
                "telefono": persona.telefono,
                "nro_documento": persona.nro_documento,
                "calle": persona.calle,
                "numero": persona.numero,
                "piso": persona.piso or "",
                "dpto": persona.dpto or "",
                "genero": (
                    {"id": persona.genero.id_genero, "nombre": persona.genero.genero} if persona.genero else None
                ),
                "tipo_documento": (
                    {
                        "id": persona.tipo_documento.id_tipo_documento,
                        "nombre": persona.tipo_documento.tipo,
                    }
                    if persona.tipo_documento
                    else None
                ),
                "localidad": (
                    {
                        "id": persona.localidad.id_localidad,
                        "nombre": persona.localidad.nombre_localidad,
                        "provincia": persona.localidad.nombre_provincia,
                        "pais": persona.localidad.nombre_pais,
                        "cp": persona.localidad.cp,
                    }
                    if persona.localidad
                    else None
                ),
            }

            # Verificar si es Cliente
            if hasattr(persona, "cliente"):
                cliente_data = {
                    "id_cliente": persona.cliente.id_cliente,
                    "direccion_completa": direccion_completa,
                    "telefono": persona.telefono,
                    "nombre_completo": f"{persona.nombre} {persona.apellido}",
                }

            # Verificar si es Empleado
            if hasattr(persona, "empleado"):
                empleado_data = {
                    "id_empleado": persona.empleado.id_empleado,
                    "cargo": persona.empleado.cargo or "",
                    "fecha_contratacion": persona.empleado.fecha_contratacion,
                    "telefono": persona.telefono,
                    "nombre_completo": f"{persona.nombre} {persona.apellido}",
                    "puntuacion_promedio": persona.empleado.puntuacion_promedio,
                    "puntuacion_cantidad": persona.empleado.puntuacion_cantidad,
                    "puntuacion_acumulada": persona.empleado.puntuacion_acumulada,
                    "fecha_ultima_puntuacion": persona.empleado.fecha_ultima_puntuacion,
                }

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "groups": [group.name for group in user.groups.all()],
                "perfil": perfil_data,
                "cliente": cliente_data,
                "empleado": empleado_data,
                "persona": persona_data,
                "last_login": user.last_login,
            }
        )

    def put(self, request):
        """Actualizar el perfil del usuario autenticado"""
        user = request.user
        data = request.data

        try:
            # Primero buscar el cliente o empleado con el email actual antes de modificarlo
            cliente = None
            empleado = None
            persona = None

            try:
                # Usar el email actual del usuario (antes de actualizarlo)
                old_email = user.email
                cliente = Cliente.objects.select_related("persona").get(persona__email=old_email)
                persona = cliente.persona
            except Cliente.DoesNotExist:
                # Si no es cliente, intentar empleado
                try:
                    old_email = user.email
                    empleado = Empleado.objects.select_related("persona").get(persona__email=old_email)
                    persona = empleado.persona
                except Empleado.DoesNotExist:
                    pass

            # Actualizar datos del User
            if "first_name" in data:
                user.first_name = data["first_name"]
            if "last_name" in data:
                user.last_name = data["last_name"]
            if "email" in data:
                user.email = data["email"]
            user.save()

            # Actualizar datos de Persona si existe
            if persona:
                # Actualizar campos de Persona
                if "telefono" in data:
                    persona.telefono = data["telefono"]
                if "nro_documento" in data:
                    persona.nro_documento = data["nro_documento"]
                if "calle" in data:
                    persona.calle = data["calle"]
                if "numero" in data:
                    persona.numero = data["numero"]
                if "piso" in data:
                    persona.piso = data["piso"]
                if "dpto" in data:
                    persona.dpto = data["dpto"]
                if "genero_id" in data:
                    persona.genero_id = data["genero_id"]
                if "tipo_documento_id" in data:
                    persona.tipo_documento_id = data["tipo_documento_id"]
                if "localidad_id" in data:
                    persona.localidad_id = data["localidad_id"]

                # Mantener sincronización con User
                persona.nombre = user.first_name
                persona.apellido = user.last_name
                persona.email = user.email

                persona.save()

            # Devolver los datos actualizados
            return self.get(request)

        except Exception as e:
            import logging

            logger = logging.getLogger(__name__)
            logger.error(f"Error al actualizar perfil: {str(e)}", exc_info=True)
            return Response(
                {"error": f"Error al actualizar el perfil: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class GeneroViewSet(viewsets.ModelViewSet):
    queryset = Genero.objects.all()
    serializer_class = GeneroSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["genero"]
    ordering = ["genero"]


class TipoDocumentoViewSet(viewsets.ModelViewSet):
    queryset = TipoDocumento.objects.all()
    serializer_class = TipoDocumentoSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["tipo"]
    ordering = ["tipo"]


class LocalidadViewSet(viewsets.ModelViewSet):
    queryset = Localidad.objects.all()
    serializer_class = LocalidadSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["nombre_provincia"]
    search_fields = ["cp", "nombre_localidad", "nombre_provincia"]
    ordering = ["nombre_provincia", "nombre_localidad"]


class PersonaViewSet(viewsets.ModelViewSet):
    queryset = Persona.objects.select_related("genero", "tipo_documento", "localidad").all()
    serializer_class = PersonaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["genero", "tipo_documento", "localidad"]
    search_fields = ["nombre", "apellido", "documento", "email", "telefono"]
    ordering_fields = ["apellido", "nombre"]
    ordering = ["apellido", "nombre"]


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.select_related("persona").all()
    serializer_class = ClienteSerializer
    filter_backends = [SearchFilter]
    search_fields = [
        "persona__nombre",
        "persona__apellido",
        "persona__documento",
        "persona__email",
    ]
    ordering = ["persona__apellido", "persona__nombre"]


class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = {
        "activo": ["exact"],
        "fecha_alta": ["gte", "lte"],
    }
    search_fields = ["razon_social", "cuit", "nombre_contacto", "email"]
    ordering_fields = ["razon_social", "nombre_contacto"]
    ordering = ["razon_social"]


class EmpleadoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de empleados (usuarios con grupo 'Empleados')
    Solo accesible por administradores
    """

    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["username", "email", "first_name", "last_name"]
    ordering_fields = ["username", "email", "date_joined"]
    ordering = ["-date_joined"]

    def get_queryset(self):
        """Obtener solo usuarios que pertenecen al grupo 'Empleados'"""
        empleados_group = Group.objects.filter(name="Empleados").first()
        if empleados_group:
            return User.objects.filter(groups=empleados_group).select_related(
                "persona",
                "persona__empleado",
                "persona__localidad",
                "persona__genero",
                "persona__tipo_documento",
            )
        return User.objects.none()

    def get_serializer_class(self):
        if self.action == "create":
            return CreateEmpleadoSerializer
        elif self.action in ["update", "partial_update"]:
            return UpdateEmpleadoSerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        """Crear empleado y enviar email de bienvenida"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Guardar la contraseña antes de crear (el serializer la hashea)
        password_plain = request.data.get("password")

        # Crear el empleado
        user = serializer.save()

        # Enviar email de bienvenida con credenciales
        try:
            user_name = f"{user.first_name} {user.last_name}".strip()
            EmailService.send_employee_welcome_email(
                user_email=user.email,
                user_name=user_name,
                username=user.email,  # Usamos el email para login
                password=password_plain,
            )
            logger.info(f"Email de bienvenida de empleado enviado a {user.email}")
        except Exception as e:
            # No fallar la creación si el email falla
            logger.error(f"Error al enviar email de bienvenida a empleado: {str(e)}")

        headers = self.get_success_headers({"id": user.id})
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        request._skip_audit = True
        instance = self.get_object()
        request._audit_before = sanitize_payload(model_to_dict(instance))
        response = super().update(request, *args, **kwargs)
        try:
            updated = self.get_object()
            request._audit_after = sanitize_payload(model_to_dict(updated))
            role = "administrador" if (request.user.is_staff or request.user.is_superuser) else "empleado"
            AuditService.register(
                user=request.user,
                role=role,
                method="PUT",
                action="Actualizacion de empleados",
                entity="empleados",
                response_body=response.data,
                before_state=request._audit_before,
                after_state=request._audit_after,
            )
        except Exception:
            pass
        return response

    def partial_update(self, request, *args, **kwargs):
        request._skip_audit = True
        instance = self.get_object()
        request._audit_before = sanitize_payload(model_to_dict(instance))
        response = super().partial_update(request, *args, **kwargs)
        try:
            updated = self.get_object()
            request._audit_after = sanitize_payload(model_to_dict(updated))
            role = "administrador" if (request.user.is_staff or request.user.is_superuser) else "empleado"
            AuditService.register(
                user=request.user,
                role=role,
                method="PATCH",
                action="Actualizacion parcial de empleados",
                entity="empleados",
                response_body=response.data,
                before_state=request._audit_before,
                after_state=request._audit_after,
            )
        except Exception:
            pass
        return response

    def destroy(self, request, *args, **kwargs):
        """No permitir eliminar, solo desactivar"""
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response({"detail": "Empleado desactivado exitosamente."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def activar(self, request, pk=None):
        """Activar un empleado desactivado"""
        empleado = self.get_object()
        empleado.is_active = True
        empleado.save()
        return Response({"detail": "Empleado activado exitosamente."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def resetear_password(self, request, pk=None):
        """Resetear la contraseña de un empleado"""
        empleado = self.get_object()
        new_password = User.objects.make_random_password()
        empleado.set_password(new_password)
        empleado.save()
        return Response(
            {
                "detail": "Contraseña reseteada exitosamente.",
                "new_password": new_password,
            },
            status=status.HTTP_200_OK,
        )
