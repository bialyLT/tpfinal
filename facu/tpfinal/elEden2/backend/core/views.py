import logging

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.emails import EmailService

from .serializers import CustomTokenObtainPairSerializer, RegisterSerializer

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    """Vista simple para verificar el estado de la API"""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "status": "healthy",
                "message": "El Eden API is running",
                "version": "1.0.0",
            }
        )


class CustomTokenObtainPairView(TokenObtainPairView):
    """Vista personalizada para obtener tokens JWT que acepta email"""

    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class RegisterView(APIView):
    """Vista para registrar nuevos usuarios (clientes)"""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

            # Enviar email de bienvenida
            try:
                user_name = f"{user.first_name} {user.last_name}".strip() or user.username
                EmailService.send_welcome_email(user_email=user.email, user_name=user_name, username=user.username)
                logger.info(f"Email de bienvenida enviado a {user.email}")
            except Exception as e:
                # No fallar el registro si el email falla
                logger.error(f"Error al enviar email de bienvenida: {str(e)}")

            # Generar tokens JWT para el nuevo usuario
            refresh = RefreshToken.for_user(user)

            return Response(
                {
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                    },
                    "tokens": {
                        "refresh": str(refresh),
                        "access": str(refresh.access_token),
                    },
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ReferenceDataView(APIView):
    """Vista para obtener datos de referencia para formularios"""

    permission_classes = [AllowAny]

    def get(self, request):
        from apps.users.models import Genero, Localidad, TipoDocumento

        generos = [{"id": g.id_genero, "nombre": g.genero} for g in Genero.objects.all()]
        tipos_documento = [{"id": t.id_tipo_documento, "nombre": t.tipo} for t in TipoDocumento.objects.all()]
        localidades = [
            {
                "id": loc.id_localidad,
                "nombre": loc.nombre_localidad,
                "provincia": loc.nombre_provincia,
                "pais": loc.nombre_pais,
                "cp": loc.cp,
            }
            for loc in Localidad.objects.all()
        ]

        return Response(
            {
                "generos": generos,
                "tipos_documento": tipos_documento,
                "localidades": localidades,
            }
        )


"""Solo vistas propias del core; la autenticación vive en apps.users"""
