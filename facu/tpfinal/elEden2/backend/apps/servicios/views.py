from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q, Sum, Count
from django.utils import timezone

from .models import (
    TipoServicio, SolicitudServicio, PropuestaDiseño,
    Servicio, EmpleadoDisponibilidad, ActualizacionServicio
)
from .serializers import (
    TipoServicioSerializer, SolicitudServicioSerializer,
    PropuestaDiseñoSerializer, ServicioSerializer,
    EmpleadoDisponibilidadSerializer, ActualizacionServicioSerializer
)


class TipoServicioViewSet(viewsets.ModelViewSet):
    queryset = TipoServicio.objects.filter(activo=True)
    serializer_class = TipoServicioSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['categoria', 'requiere_diseño', 'activo']
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['categoria', 'nombre', 'precio_base']
    ordering = ['categoria', 'nombre']


class SolicitudServicioViewSet(viewsets.ModelViewSet):
    queryset = SolicitudServicio.objects.select_related('cliente__perfil', 'tipo_servicio')
    serializer_class = SolicitudServicioSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['estado', 'tipo_servicio', 'prioridad']
    search_fields = ['titulo', 'descripcion', 'cliente__username', 'cliente__first_name']
    ordering_fields = ['fecha_solicitud', 'fecha_limite_diseño', 'presupuesto_maximo']
    ordering = ['-fecha_solicitud']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Si es cliente, solo ver sus propias solicitudes
        if hasattr(user, 'perfil') and user.perfil.tipo_usuario == 'cliente':
            return queryset.filter(cliente=user)
        # Si es empleado/diseñador, ver todas las solicitudes
        return queryset

    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """Cambiar estado de la solicitud"""
        solicitud = self.get_object()
        nuevo_estado = request.data.get('estado')

        if nuevo_estado not in dict(SolicitudServicio.ESTADO_CHOICES):
            return Response(
                {'error': 'Estado no válido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        solicitud.estado = nuevo_estado
        solicitud.save()

        return Response({'mensaje': f'Estado cambiado a {nuevo_estado}'})


class PropuestaDiseñoViewSet(viewsets.ModelViewSet):
    queryset = PropuestaDiseño.objects.select_related('solicitud__cliente', 'diseñador__perfil')
    serializer_class = PropuestaDiseñoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['estado', 'solicitud', 'diseñador']
    search_fields = ['titulo', 'descripcion']
    ordering_fields = ['fecha_creacion', 'fecha_envio', 'costo_estimado']
    ordering = ['-fecha_creacion']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Si es cliente, solo ver propuestas de sus solicitudes
        if hasattr(user, 'perfil') and user.perfil.tipo_usuario == 'cliente':
            return queryset.filter(solicitud__cliente=user)
        # Si es diseñador, ver sus propias propuestas
        elif hasattr(user, 'perfil') and user.perfil.tipo_usuario == 'diseñador':
            return queryset.filter(diseñador=user)
        return queryset

    @action(detail=True, methods=['post'])
    def enviar_propuesta(self, request, pk=None):
        """Marcar propuesta como enviada"""
        propuesta = self.get_object()
        propuesta.estado = 'enviada'
        propuesta.fecha_envio = timezone.now()
        propuesta.save()

        return Response({'mensaje': 'Propuesta enviada al cliente'})

    @action(detail=True, methods=['post'])
    def aprobar_propuesta(self, request, pk=None):
        """Aprobar propuesta y crear servicio"""
        propuesta = self.get_object()
        if propuesta.estado != 'enviada':
            return Response(
                {'error': 'La propuesta debe estar enviada para ser aprobada'},
                status=status.HTTP_400_BAD_REQUEST
            )

        propuesta.estado = 'aprobada'
        propuesta.save()

        # Crear servicio basado en la propuesta aprobada
        servicio = Servicio.objects.create(
            solicitud=propuesta.solicitud,
            diseñador=propuesta.diseñador,
            costo_total=propuesta.costo_estimado,
            descripcion=f"Servicio basado en propuesta: {propuesta.titulo}"
        )

        return Response({
            'mensaje': 'Propuesta aprobada',
            'servicio_id': servicio.id
        })


class ServicioViewSet(viewsets.ModelViewSet):
    queryset = Servicio.objects.select_related('solicitud__cliente', 'propuesta_aprobada__diseñador', 'cliente')
    serializer_class = ServicioSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['estado', 'solicitud', 'cliente']
    search_fields = ['descripcion', 'solicitud__titulo', 'numero_servicio']
    ordering_fields = ['fecha_programada', 'fecha_inicio_real', 'fecha_creacion']
    ordering = ['-fecha_programada']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Si es cliente, solo ver sus propios servicios
        if hasattr(user, 'perfilusuario') and user.perfilusuario.persona:
            # Filtrar por cliente directamente
            return queryset.filter(cliente=user)
        # Si es diseñador, ver servicios donde sea el diseñador de la propuesta aprobada
        elif user.groups.filter(name='Diseñadores').exists():
            return queryset.filter(propuesta_aprobada__diseñador=user)
        return queryset

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
        user = self.request.user

        # Si es empleado, solo ver su propia disponibilidad
        if hasattr(user, 'perfil') and user.perfil.es_empleado:
            return queryset.filter(empleado=user)
        return queryset


class ActualizacionServicioViewSet(viewsets.ModelViewSet):
    queryset = ActualizacionServicio.objects.select_related('servicio__solicitud__cliente', 'creado_por__perfil')
    serializer_class = ActualizacionServicioSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['servicio', 'tipo', 'creado_por']
    search_fields = ['titulo', 'descripcion']
    ordering_fields = ['fecha_creacion', 'tipo']
    ordering = ['-fecha_creacion']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Si es cliente, solo ver actualizaciones de sus servicios
        if hasattr(user, 'perfil') and user.perfil.tipo_usuario == 'cliente':
            return queryset.filter(servicio__solicitud__cliente=user)
        return queryset

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)
