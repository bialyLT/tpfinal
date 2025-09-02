from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q, Avg, Count
from django.utils import timezone

from .models import Encuesta, Pregunta, RespuestaEncuesta
from .serializers import (
    EncuestaSerializer, PreguntaSerializer, 
    RespuestaEncuestaSerializer, EncuestaPublicaSerializer
)


class EncuestaViewSet(viewsets.ModelViewSet):
    queryset = Encuesta.objects.select_related('servicio__solicitud__cliente')
    serializer_class = EncuestaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['estado', 'servicio', 'puntuacion_general']
    search_fields = ['servicio__solicitud__titulo']
    ordering_fields = ['fecha_creacion', 'fecha_envio', 'fecha_completada', 'puntuacion_general']
    ordering = ['-fecha_creacion']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Si es cliente, solo ver sus propias encuestas
        if hasattr(user, 'perfil') and user.perfil.tipo_usuario == 'cliente':
            return queryset.filter(servicio__solicitud__cliente=user)
        return queryset

    @action(detail=False, methods=['get'])
    def publicas(self, request):
        """Endpoint público para acceder a encuestas por token"""
        token = request.query_params.get('token')
        if not token:
            return Response(
                {'error': 'Token requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            encuesta = Encuesta.objects.get(token_publico=token)
            serializer = EncuestaPublicaSerializer(encuesta)
            return Response(serializer.data)
        except Encuesta.DoesNotExist:
            return Response(
                {'error': 'Encuesta no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def enviar_encuesta(self, request, pk=None):
        """Enviar encuesta por email"""
        encuesta = self.get_object()
        if encuesta.estado != 'pendiente':
            return Response(
                {'error': 'La encuesta ya fue enviada'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Aquí iría la lógica de envío de email
        encuesta.estado = 'enviada'
        encuesta.fecha_envio = timezone.now()
        encuesta.save()

        return Response({'mensaje': 'Encuesta enviada por email'})

    @action(detail=True, methods=['post'])
    def completar_encuesta(self, request, pk=None):
        """Marcar encuesta como completada"""
        encuesta = self.get_object()
        respuestas_data = request.data.get('respuestas', [])

        # Procesar respuestas
        for respuesta_data in respuestas_data:
            RespuestaEncuesta.objects.update_or_create(
                encuesta=encuesta,
                pregunta_id=respuesta_data['pregunta_id'],
                defaults={
                    'respuesta_texto': respuesta_data.get('respuesta_texto'),
                    'puntuacion': respuesta_data.get('puntuacion')
                }
            )

        # Calcular puntuación promedio
        puntuaciones = RespuestaEncuesta.objects.filter(
            encuesta=encuesta, 
            puntuacion__isnull=False
        ).aggregate(promedio=Avg('puntuacion'))

        encuesta.puntuacion_general = puntuaciones['promedio'] or 0
        encuesta.estado = 'completada'
        encuesta.fecha_completada = timezone.now()
        encuesta.save()

        return Response({'mensaje': 'Encuesta completada'})


class PreguntaViewSet(viewsets.ModelViewSet):
    queryset = Pregunta.objects.all()
    serializer_class = PreguntaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['tipo_pregunta', 'obligatoria', 'encuesta']
    search_fields = ['texto_pregunta']
    ordering_fields = ['orden', 'fecha_creacion']
    ordering = ['orden']


class RespuestaEncuestaViewSet(viewsets.ModelViewSet):
    queryset = RespuestaEncuesta.objects.select_related('encuesta', 'pregunta')
    serializer_class = RespuestaEncuestaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['encuesta', 'pregunta', 'puntuacion']
    search_fields = ['respuesta_texto']
    ordering_fields = ['fecha_respuesta', 'puntuacion']
    ordering = ['-fecha_respuesta']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Si es cliente, solo ver respuestas de sus encuestas
        if hasattr(user, 'perfil') and user.perfil.tipo_usuario == 'cliente':
            return queryset.filter(encuesta__servicio__solicitud__cliente=user)
        return queryset
