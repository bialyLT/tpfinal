from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q, Sum, Count
from django.contrib.auth.models import Group, User
from django.utils import timezone
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
import logging

from .models import (
    Persona, Rol, Pago, DetallePago, 
    MetodoPago, HistorialAcceso, ConfiguracionUsuario, PerfilUsuario
)
from .serializers import (
    PersonaSerializer, UsuarioSerializer, UsuarioListSerializer,
    RolSerializer, PagoSerializer, PagoListSerializer,
    MetodoPagoSerializer, HistorialAccesoSerializer,
    ConfiguracionUsuarioSerializer, CrearUsuarioSerializer,
    PublicUserSerializer, PublicRegisterSerializer, EmailTokenObtainPairSerializer
)


class PersonaViewSet(viewsets.ModelViewSet):
    queryset = Persona.objects.all()
    serializer_class = PersonaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['tipo_documento', 'genero', 'provincia', 'activo']
    search_fields = ['nombres', 'apellidos', 'numero_documento', 'telefono']
    ordering_fields = ['apellidos', 'nombres', 'fecha_creacion']
    ordering = ['apellidos', 'nombres']

    @action(detail=False, methods=['get'])
    def buscar_por_documento(self, request):
        """Buscar persona por número de documento"""
        numero = request.query_params.get('numero')
        if not numero:
            return Response(
                {'error': 'Se requiere el parámetro numero'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            persona = self.get_queryset().get(numero_documento=numero)
            serializer = self.get_serializer(persona)
            return Response(serializer.data)
        except Persona.DoesNotExist:
            return Response(
                {'error': 'Persona no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )


class RolViewSet(viewsets.ModelViewSet):
    queryset = Rol.objects.select_related('grupo').all()
    serializer_class = RolSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['nivel_acceso', 'activo']
    search_fields = ['grupo__name', 'descripcion']
    ordering_fields = ['nivel_acceso', 'grupo__name']
    ordering = ['nivel_acceso']


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('perfilusuario__persona').prefetch_related('groups', 'configuracionusuario').all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'is_staff', 'groups']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'perfilusuario__persona__nombres', 'perfilusuario__persona__apellidos', 'perfilusuario__persona__numero_documento']
    ordering_fields = ['username', 'date_joined', 'first_name', 'last_name']
    ordering = ['first_name', 'last_name']

    def get_serializer_class(self):
        if self.action == 'list':
            return UsuarioListSerializer
        elif self.action == 'create':
            return CrearUsuarioSerializer
        return UsuarioSerializer

    @action(detail=False, methods=['get'])
    def usuarios_activos(self, request):
        """Obtiene usuarios activos"""
        usuarios = self.get_queryset().filter(perfilusuario__estado='activo', is_active=True)
        serializer = self.get_serializer(usuarios, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def administradores(self, request):
        """Obtiene usuarios administradores"""
        usuarios = self.get_queryset().filter(
            Q(is_superuser=True) | Q(groups__rol_extendido__nivel_acceso__gte=8)
        ).distinct()
        serializer = self.get_serializer(usuarios, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def empleados(self, request):
        """Obtiene usuarios empleados"""
        usuarios = self.get_queryset().filter(
            Q(perfilusuario__tipo_usuario='empleado') | Q(groups__name='Empleados')
        ).distinct()
        serializer = self.get_serializer(usuarios, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def clientes(self, request):
        """Obtiene usuarios clientes"""
        usuarios = self.get_queryset().filter(
            Q(perfilusuario__tipo_usuario='cliente') | Q(groups__name='Clientes')
        ).distinct()
        serializer = self.get_serializer(usuarios, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """Cambiar estado del usuario"""
        user = self.get_object()
        nuevo_estado = request.data.get('estado')
        
        if nuevo_estado not in ['activo', 'inactivo', 'suspendido', 'bloqueado']:
            return Response(
                {'error': 'Estado no válido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            perfil = PerfilUsuario.objects.get(user=user)
            perfil.estado = nuevo_estado
            if nuevo_estado == 'bloqueado':
                perfil.fecha_bloqueo = timezone.now()
            elif nuevo_estado == 'activo' and perfil.fecha_bloqueo:
                perfil.fecha_bloqueo = None
                perfil.intentos_fallidos_login = 0
            perfil.save()
        except PerfilUsuario.DoesNotExist:
            return Response(
                {'error': 'Perfil de usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({'mensaje': f'Estado cambiado a {nuevo_estado}'})

    @action(detail=True, methods=['post'])
    def resetear_password(self, request, pk=None):
        """Marcar que el usuario debe cambiar su contraseña"""
        user = self.get_object()
        try:
            perfil = PerfilUsuario.objects.get(user=user)
            perfil.debe_cambiar_password = True
            perfil.save()
        except PerfilUsuario.DoesNotExist:
            return Response(
                {'error': 'Perfil de usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({'mensaje': 'Usuario debe cambiar contraseña en próximo acceso'})


class MetodoPagoViewSet(viewsets.ModelViewSet):
    queryset = MetodoPago.objects.all()
    serializer_class = MetodoPagoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['tipo', 'activo', 'requiere_autorizacion']
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['nombre', 'tipo']
    ordering = ['nombre']

    @action(detail=False, methods=['get'])
    def activos(self, request):
        """Obtiene métodos de pago activos"""
        metodos = self.get_queryset().filter(activo=True)
        serializer = self.get_serializer(metodos, many=True)
        return Response(serializer.data)


# =============================
# Endpoints de Autenticación
# =============================

class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = EmailTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            try:
                # Adjuntar datos de usuario mínimos
                email = request.data.get('email')
                user = User.objects.get(email=email)
                response.data['user'] = PublicUserSerializer(user).data
            except User.DoesNotExist:
                pass
        return response


class RegisterPublicView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logger = logging.getLogger('apps.users')
        # Copiar payload y ocultar contraseñas
        payload = dict(request.data)
        for k in ['password', 'password2']:
            if k in payload:
                payload[k] = '***'
        logger.debug(f"/auth/register payload: {payload}")

        serializer = PublicRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'message': 'Usuario creado exitosamente',
                'user': PublicUserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }, status=status.HTTP_201_CREATED)
        logger.debug({ 'register_errors': serializer.errors })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(PublicUserSerializer(request.user).data)

    def put(self, request):
        serializer = PublicUserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'Refresh token es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            # Log para debugging
            import logging
            logger = logging.getLogger('apps.users')
            logger.debug(f"/auth/logout refresh token length: {len(refresh_token) if refresh_token else 'None'}")
            
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Sesión cerrada exitosamente'})
        except Exception as e:
            # Log más específico del error
            import logging
            logger = logging.getLogger('apps.users')
            logger.debug(f"/auth/logout error: {type(e).__name__}: {str(e)}")
            return Response({'error': 'Token inválido'}, status=status.HTTP_400_BAD_REQUEST)


class PagoViewSet(viewsets.ModelViewSet):
    queryset = Pago.objects.select_related('usuario', 'metodo_pago', 'usuario__persona').prefetch_related('detalles').all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['estado', 'tipo_transaccion', 'metodo_pago', 'usuario']
    search_fields = ['numero_transaccion', 'usuario__username', 'referencia_externa']
    ordering_fields = ['fecha_pago', 'monto']
    ordering = ['-fecha_pago']

    def get_serializer_class(self):
        if self.action == 'list':
            return PagoListSerializer
        return PagoSerializer

    @action(detail=False, methods=['get'])
    def por_usuario(self, request):
        """Obtiene pagos de un usuario específico"""
        usuario_id = request.query_params.get('usuario_id')
        if not usuario_id:
            return Response(
                {'error': 'Se requiere el parámetro usuario_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        pagos = self.get_queryset().filter(usuario_id=usuario_id)
        serializer = self.get_serializer(pagos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Obtiene estadísticas de pagos"""
        queryset = self.get_queryset()
        
        estadisticas = {
            'total_pagos': queryset.count(),
            'pagos_completados': queryset.filter(estado='completado').count(),
            'pagos_pendientes': queryset.filter(estado='pendiente').count(),
            'pagos_fallidos': queryset.filter(estado='fallido').count(),
            'monto_total': queryset.filter(estado='completado').aggregate(
                total=Sum('monto_neto')
            )['total'] or 0,
            'comisiones_totales': queryset.filter(estado='completado').aggregate(
                total=Sum('monto_comision')
            )['total'] or 0,
        }
        
        return Response(estadisticas)

    @action(detail=True, methods=['post'])
    def completar(self, request, pk=None):
        """Marcar pago como completado"""
        pago = self.get_object()
        
        if pago.estado != 'pendiente':
            return Response(
                {'error': 'Solo se pueden completar pagos pendientes'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        pago.marcar_como_completado()
        return Response({'mensaje': 'Pago marcado como completado'})

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancelar pago"""
        pago = self.get_object()
        motivo = request.data.get('motivo', '')
        
        if pago.estado in ['completado', 'cancelado']:
            return Response(
                {'error': 'No se puede cancelar un pago completado o ya cancelado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        pago.cancelar(motivo)
        return Response({'mensaje': 'Pago cancelado'})


class HistorialAccesoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HistorialAcceso.objects.select_related('usuario').all()
    serializer_class = HistorialAccesoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['usuario', 'exitoso']
    search_fields = ['usuario__username', 'ip_address', 'accion']
    ordering_fields = ['fecha_acceso']
    ordering = ['-fecha_acceso']

    @action(detail=False, methods=['get'])
    def por_usuario(self, request):
        """Obtiene historial de acceso de un usuario específico"""
        usuario_id = request.query_params.get('usuario_id')
        if not usuario_id:
            return Response(
                {'error': 'Se requiere el parámetro usuario_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        historial = self.get_queryset().filter(usuario_id=usuario_id)
        serializer = self.get_serializer(historial, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def intentos_fallidos(self, request):
        """Obtiene intentos de acceso fallidos"""
        intentos = self.get_queryset().filter(exitoso=False)
        serializer = self.get_serializer(intentos, many=True)
        return Response(serializer.data)


class ConfiguracionUsuarioViewSet(viewsets.ModelViewSet):
    queryset = ConfiguracionUsuario.objects.select_related('usuario').all()
    serializer_class = ConfiguracionUsuarioSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['tema', 'idioma']

    def get_queryset(self):
        # Solo mostrar la configuración del usuario actual si no es staff
        if not self.request.user.is_staff:
            return self.queryset.filter(usuario=self.request.user)
        return self.queryset
