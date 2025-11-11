from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Encuesta, Pregunta, EncuestaRespuesta, Respuesta
from .serializers import (
    EncuestaSerializer,
    EncuestaDetalleSerializer,
    EncuestaCreateUpdateSerializer,
    PreguntaSerializer,
    EncuestaRespuestaSerializer,
    RespuestaSerializer
)


class EncuestaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de encuestas.
    Solo administradores pueden gestionar encuestas.
    """
    queryset = Encuesta.objects.prefetch_related('preguntas').all()
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['activa']
    search_fields = ['titulo', 'descripcion']
    ordering_fields = ['fecha_creacion', 'titulo']
    ordering = ['-fecha_creacion']

    def get_serializer_class(self):
        """Usar diferentes serializers según la acción"""
        if self.action == 'retrieve':
            return EncuestaDetalleSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return EncuestaCreateUpdateSerializer
        return EncuestaSerializer

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
    def toggle_activa(self, request, pk=None):
        """Activar/desactivar una encuesta"""
        encuesta = self.get_object()
        encuesta.activa = not encuesta.activa
        encuesta.save()
        serializer = self.get_serializer(encuesta)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def estadisticas(self, request, pk=None):
        """Obtener estadísticas de una encuesta"""
        encuesta = self.get_object()
        total_respuestas = encuesta.respuestas_clientes.count()
        completadas = encuesta.respuestas_clientes.filter(estado='completada').count()
        iniciadas = encuesta.respuestas_clientes.filter(estado='iniciada').count()
        
        return Response({
            'total_respuestas': total_respuestas,
            'completadas': completadas,
            'iniciadas': iniciadas,
            'total_preguntas': encuesta.preguntas.count()
        })


class PreguntaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de preguntas.
    Las preguntas se gestionan principalmente a través de EncuestaViewSet (nested).
    """
    queryset = Pregunta.objects.select_related('encuesta').all()
    serializer_class = PreguntaSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['encuesta', 'tipo', 'obligatoria']
    search_fields = ['texto']
    ordering_fields = ['orden', 'texto']
    ordering = ['orden']


class EncuestaRespuestaViewSet(viewsets.ModelViewSet):
    queryset = EncuestaRespuesta.objects.select_related('cliente', 'encuesta').all()
    serializer_class = EncuestaRespuestaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['estado', 'cliente', 'encuesta']
    search_fields = ['cliente__persona__nombre', 'cliente__persona__apellido', 'encuesta__titulo']
    ordering_fields = ['fecha_inicio', 'fecha_completada']
    ordering = ['-fecha_inicio']


class RespuestaViewSet(viewsets.ModelViewSet):
    queryset = Respuesta.objects.select_related('encuesta_respuesta', 'pregunta').all()
    serializer_class = RespuestaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['encuesta_respuesta', 'pregunta']
    search_fields = ['valor_texto']
    ordering_fields = ['pregunta__orden']
    ordering = ['pregunta__orden']

    ordering = ['pregunta__orden']
