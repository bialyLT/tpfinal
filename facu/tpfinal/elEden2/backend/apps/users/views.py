from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Genero, TipoDocumento, Localidad, Persona, Cliente, Proveedor
from .serializers import (
    GeneroSerializer, TipoDocumentoSerializer, LocalidadSerializer,
    PersonaSerializer, ClienteSerializer, ProveedorSerializer
)


class CurrentUserView(APIView):
    """Vista para obtener los datos del usuario autenticado actual"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        # Obtener información del perfil si existe
        perfil_data = None
        if hasattr(user, 'perfil'):
            perfil_data = {
                'id_perfil': user.perfil.id_perfil,
                'tipo_usuario': user.perfil.tipo_usuario,
                'foto_perfil': request.build_absolute_uri(user.perfil.foto_perfil.url) if user.perfil.foto_perfil else None
            }
        
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'groups': [group.name for group in user.groups.all()],
            'perfil': perfil_data,
            'last_login': user.last_login
        })


class GeneroViewSet(viewsets.ModelViewSet):
    queryset = Genero.objects.all()
    serializer_class = GeneroSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['genero']
    ordering = ['genero']


class TipoDocumentoViewSet(viewsets.ModelViewSet):
    queryset = TipoDocumento.objects.all()
    serializer_class = TipoDocumentoSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['tipo']
    ordering = ['tipo']


class LocalidadViewSet(viewsets.ModelViewSet):
    queryset = Localidad.objects.all()
    serializer_class = LocalidadSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['nombre_provincia']
    search_fields = ['cp', 'nombre_localidad', 'nombre_provincia']
    ordering = ['nombre_provincia', 'nombre_localidad']


class PersonaViewSet(viewsets.ModelViewSet):
    queryset = Persona.objects.select_related('genero', 'tipo_documento', 'localidad').all()
    serializer_class = PersonaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['genero', 'tipo_documento', 'localidad']
    search_fields = ['nombre', 'apellido', 'documento', 'email', 'telefono']
    ordering_fields = ['apellido', 'nombre']
    ordering = ['apellido', 'nombre']


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.select_related('persona').all()
    serializer_class = ClienteSerializer
    filter_backends = [SearchFilter]
    search_fields = ['persona__nombre', 'persona__apellido', 'persona__documento', 'persona__email']
    ordering = ['persona__apellido', 'persona__nombre']


class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['razon_social', 'cuit', 'nombre_contacto', 'email']
    ordering_fields = ['razon_social', 'nombre_contacto']
    ordering = ['razon_social']
