"""
Google OAuth Authentication Views
"""

import logging

from django.conf import settings
from django.contrib.auth.models import Group, User
from google.auth.transport import requests
from google.oauth2 import id_token
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import Cliente, Genero, Localidad, Persona, TipoDocumento
from apps.users.services.address_service import (
    get_or_create_localidad,
    normalize_google_address,
)

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([AllowAny])
def google_login(request):
    """
    Endpoint para login/registro con Google OAuth

    Espera un token de Google ID en el body:
    {
        "token": "google_access_token_here",
        "email": "user@gmail.com",
        "first_name": "Name",
        "last_name": "LastName",
        "google_id": "google_user_id"
    }
    """
    try:
        token = request.data.get("token")
        email = request.data.get("email")
        first_name = request.data.get("first_name", "")
        last_name = request.data.get("last_name", "")
        google_id = request.data.get("google_id")
        address_payload = request.data.get("address")
        normalized_address = normalize_google_address(address_payload)

        if not token or not email:
            return Response(
                {"error": "Token y email de Google son requeridos"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Si recibimos los datos directamente, los usamos
        if email and google_id:
            # Usar los datos proporcionados directamente
            idinfo = {
                "email": email,
                "given_name": first_name,
                "family_name": last_name,
                "sub": google_id,
            }
        else:
            # Verificar el token con Google (método anterior)
            try:
                idinfo = id_token.verify_oauth2_token(
                    token,
                    requests.Request(),
                    settings.SOCIALACCOUNT_PROVIDERS["google"]["APP"]["client_id"],
                )

                # Verificar que el token es válido y del issuer correcto
                if idinfo["iss"] not in [
                    "accounts.google.com",
                    "https://accounts.google.com",
                ]:
                    return Response({"error": "Token inválido"}, status=status.HTTP_401_UNAUTHORIZED)

                email = idinfo.get("email")
                first_name = idinfo.get("given_name", "")
                last_name = idinfo.get("family_name", "")
                google_id = idinfo.get("sub")

            except ValueError as e:
                # Token inválido
                logger.error(f"Error al verificar token de Google: {str(e)}")
                return Response(
                    {"error": "Token de Google inválido o expirado"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

        if not email:
            return Response(
                {"error": "No se pudo obtener el email de Google"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verificar si el usuario ya existe
        try:
            user = User.objects.get(email=email)
            is_new_user = False
            if hasattr(user, "persona") and normalized_address:
                persona = user.persona
                needs_update = (
                    not persona.calle
                    or persona.calle.upper() == "PENDIENTE"
                    or not persona.numero
                    or persona.numero.upper() == "S/N"
                    or persona.localidad is None
                )

                if needs_update:
                    localidad = get_or_create_localidad(normalized_address)
                    persona.calle = normalized_address.get("calle") or persona.calle
                    persona.numero = normalized_address.get("numero") or persona.numero
                    persona.localidad = localidad
                    persona.save(update_fields=["calle", "numero", "localidad"])
                    logger.info("✅ Dirección actualizada automáticamente para %s", email)

        except User.DoesNotExist:
            # Crear nuevo usuario
            username = email.split("@")[0]
            base_username = username
            counter = 1

            # Asegurar que el username sea único
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                password=None,  # Sin contraseña para usuarios de Google
            )

            # Agregar al grupo Clientes por defecto
            clientes_group, created = Group.objects.get_or_create(name="Clientes")
            user.groups.add(clientes_group)

            # Crear Persona y Cliente asociados
            try:
                # Obtener/crear valores por defecto (evita fallas si no se cargaron datos iniciales)
                genero_default, _ = Genero.objects.get_or_create(genero="Prefiero no decir")
                tipo_doc_default, _ = TipoDocumento.objects.get_or_create(tipo="DNI")
                localidad_default = None
                if normalized_address:
                    localidad_default = get_or_create_localidad(normalized_address)
                else:
                    localidad_default = Localidad.objects.first()

                if not localidad_default:
                    logger.warning("No hay localidades en el sistema. Crear al menos una.")
                    localidad_default = Localidad.objects.create(
                        cp="S/N",
                        nombre_localidad="Sin ciudad",
                        nombre_provincia="Sin provincia",
                        nombre_pais="Argentina",
                    )

                # Generar un nro_documento único usando el google_id (máximo 20 chars)
                # Formato: GGL-{últimos 13 dígitos del google_id}
                nro_documento_unico = f"GGL-{google_id[-13:]}"

                # Crear Persona relacionada con el User
                persona = Persona.objects.create(
                    user=user,  # Relacionar con el User
                    nombre=first_name or "Usuario",
                    apellido=last_name or "Google",
                    email=email,
                    telefono="PENDIENTE",
                    nro_documento=nro_documento_unico,
                    calle=(normalized_address.get("calle") if normalized_address else "PENDIENTE") or "PENDIENTE",
                    numero=(normalized_address.get("numero") if normalized_address else "S/N") or "S/N",
                    localidad=localidad_default,
                    genero=genero_default,
                    tipo_documento=tipo_doc_default,
                )

                # Crear Cliente
                cliente = Cliente.objects.create(persona=persona)
                logger.info(
                    "Persona y Cliente creados para {email} - Persona ID: "
                    f"{persona.id_persona}, Cliente ID: {cliente.id_cliente}"
                )

            except Exception as e:
                logger.error(f"Error al crear Persona/Cliente: {str(e)}")
                # No fallar el login si hay error al crear Persona

            is_new_user = True
            logger.info(f"Nuevo usuario creado via Google OAuth: {email}")

        # Generar tokens JWT (para usuarios nuevos Y existentes)
        refresh = RefreshToken.for_user(user)

        # Obtener datos completos de Persona si existen
        persona_data = None
        cliente_data = None

        # Intentar obtener la Persona asociada
        persona = None
        if hasattr(user, "persona"):
            persona = user.persona

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

            # Datos completos de Persona
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

        # Preparar respuesta con estructura completa (igual que /users/me/)
        response_data = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "groups": [group.name for group in user.groups.all()],
                "persona": persona_data,
                "cliente": cliente_data,
                "last_login": user.last_login,
            },
            "is_new_user": is_new_user,
            "auth_provider": "google",
        }

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error en google_login: {str(e)}")
        return Response(
            {"error": "Error al procesar la autenticación con Google"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def google_callback(request):
    """
    Callback endpoint (opcional, para flujo web tradicional)
    """
    return Response({"message": "Use el endpoint /api/v1/auth/google/ con el token de Google"})
