from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q, Sum, Count
from django.utils import timezone
from apps.users.permissions import SoloSusRecursos, EsEmpleadoOAdministrador

from .models import (
    TipoServicio, 
    Servicio, 
    Diseño,
    ImagenServicio,
    EmpleadoDisponibilidad, 
    AsignacionEmpleado,
    ServicioProducto,
    ActualizacionServicio
)
from .serializers import (
    TipoServicioSerializer,
    ServicioSerializer,
    DiseñoSerializer,
    ImagenServicioSerializer,
    EmpleadoDisponibilidadSerializer, 
    AsignacionEmpleadoSerializer,
    ServicioProductoSerializer,
    ActualizacionServicioSerializer,
    CrearServicioSerializer
)


class TipoServicioViewSet(viewsets.ModelViewSet):
    queryset = TipoServicio.objects.filter(activo=True)
    serializer_class = TipoServicioSerializer
    permission_classes = [permissions.IsAuthenticated]  # Todos los usuarios autenticados pueden ver tipos de servicio
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['categoria', 'requiere_diseño', 'activo']
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['categoria', 'nombre', 'precio_base']
    ordering = ['categoria', 'nombre']

    def get_permissions(self):
        """
        Los clientes pueden ver y crear, pero no editar/eliminar tipos de servicio
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [EsEmpleadoOAdministrador]
        return [permission() for permission in permission_classes]


class ServicioViewSet(viewsets.ModelViewSet):
    queryset = Servicio.objects.select_related('cliente__perfil').prefetch_related('imagenes', 'empleados_asignados')
    serializer_class = ServicioSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['estado', 'fecha_preferida', 'fecha_inicio']
    search_fields = ['numero_servicio', 'notas_adicionales', 'cliente__username', 'cliente__first_name']
    ordering_fields = ['fecha_solicitud', 'fecha_preferida', 'fecha_inicio']
    ordering = ['-fecha_solicitud']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Si es cliente, solo ver sus propios servicios
        if hasattr(user, 'perfil') and user.perfil.tipo_usuario == 'cliente':
            return queryset.filter(cliente=user)
        # Si es empleado/diseñador/admin, ver todos
        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return CrearServicioSerializer
        return ServicioSerializer

    def get_permissions(self):
        """
        Los clientes pueden crear y ver sus servicios.
        Los empleados pueden ver y actualizar todos los servicios.
        """
        if self.action == 'create':
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [EsEmpleadoOAdministrador]
        return [permission() for permission in permission_classes]

    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """Cambiar estado del servicio"""
        servicio = self.get_object()
        nuevo_estado = request.data.get('estado')

        if nuevo_estado not in dict(Servicio.ESTADO_CHOICES):
            return Response(
                {'error': 'Estado no válido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        servicio.cambiar_estado(nuevo_estado)
        return Response({'mensaje': f'Estado cambiado a {nuevo_estado}'})

    @action(detail=True, methods=['get'])
    def fechas_disponibles(self, request, pk=None):
        """Obtener fechas disponibles para programar el servicio"""
        servicio = self.get_object()
        fechas = servicio.obtener_fechas_disponibles()
        return Response({'fechas_disponibles': fechas})

    @action(detail=True, methods=['post'])
    def asignar_empleados(self, request, pk=None):
        """Asignar empleados ejecutores al servicio"""
        servicio = self.get_object()
        empleados_ids = request.data.get('empleados_ids', [])
        
        if not empleados_ids:
            return Response(
                {'error': 'Debe proporcionar al menos un empleado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        resultado = servicio.asignar_empleados_ejecutores(empleados_ids)
        return Response(resultado)


class DiseñoViewSet(viewsets.ModelViewSet):
    queryset = Diseño.objects.select_related('servicio__cliente', 'diseñador__perfil')
    serializer_class = DiseñoSerializer
    permission_classes = [EsEmpleadoOAdministrador]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['diseñador_asignado', 'servicio']
    search_fields = ['descripcion', 'servicio__numero_servicio']
    ordering_fields = ['fecha_creacion', 'fecha_actualizacion']
    ordering = ['-fecha_creacion']

    @action(detail=True, methods=['post'])
    def actualizar_diseño(self, request, pk=None):
        """Actualizar información del diseño"""
        diseño = self.get_object()
        
        # Actualizar campos permitidos
        if 'descripcion' in request.data:
            diseño.descripcion = request.data['descripcion']
        
        if 'presupuesto' in request.data:
            diseño.presupuesto = request.data['presupuesto']
        
        if 'motivo_rechazo' in request.data:
            diseño.motivo_rechazo = request.data['motivo_rechazo']
        
        diseño.save()
        
        return Response({'mensaje': 'Diseño actualizado correctamente'})


class EmpleadoDisponibilidadViewSet(viewsets.ModelViewSet):
    queryset = EmpleadoDisponibilidad.objects.select_related('empleado__perfil')
    serializer_class = EmpleadoDisponibilidadSerializer
    permission_classes = [EsEmpleadoOAdministrador]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['estado', 'fecha', 'empleado']
    search_fields = ['empleado__username', 'empleado__first_name', 'empleado__last_name']
    ordering_fields = ['fecha', 'empleado__username']
    ordering = ['-fecha']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Si es empleado, solo ver su propia disponibilidad
        if hasattr(user, 'perfil') and user.perfil.tipo_usuario == 'empleado':
            return queryset.filter(empleado=user)
        return queryset


class ActualizacionServicioViewSet(viewsets.ModelViewSet):
    queryset = ActualizacionServicio.objects.select_related('servicio__cliente', 'empleado__perfil')
    serializer_class = ActualizacionServicioSerializer
    permission_classes = [EsEmpleadoOAdministrador]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['servicio', 'empleado']
    search_fields = ['descripcion', 'servicio__numero_servicio']
    ordering_fields = ['fecha_actualizacion']
    ordering = ['-fecha_actualizacion']

    def perform_create(self, serializer):
        serializer.save(empleado=self.request.user)

    @action(detail=True, methods=['post'])
    def iniciar_servicio(self, request, pk=None):
        """Marcar servicio como iniciado"""
        servicio = self.get_object()
        if servicio.estado != 'pendiente':
            return Response(
                {'error': 'El servicio debe estar pendiente para iniciarse'},
                status=status.HTTP_400_BAD_REQUEST
            )

        servicio.estado = 'en_progreso'
        servicio.fecha_inicio_real = timezone.now()
        servicio.save()

        return Response({'mensaje': 'Servicio iniciado'})

    @action(detail=True, methods=['post'])
    def completar_servicio(self, request, pk=None):
        """Marcar servicio como completado"""
        servicio = self.get_object()
        if servicio.estado != 'en_progreso':
            return Response(
                {'error': 'El servicio debe estar en progreso para completarse'},
                status=status.HTTP_400_BAD_REQUEST
            )

        servicio.estado = 'completado'
        servicio.fecha_fin_real = timezone.now()
        servicio.save()

        return Response({'mensaje': 'Servicio completado'})


class EmpleadoDisponibilidadViewSet(viewsets.ModelViewSet):
    queryset = EmpleadoDisponibilidad.objects.select_related('empleado__perfil')
    serializer_class = EmpleadoDisponibilidadSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['empleado', 'dia_semana', 'disponible']
    search_fields = ['empleado__username', 'empleado__first_name']
    ordering_fields = ['dia_semana', 'hora_inicio', 'hora_fin']
    ordering = ['dia_semana', 'hora_inicio']

    def get_queryset(self):
        queryset = super().get_queryset()
    def perform_create(self, serializer):
        serializer.save(empleado=self.request.user)
