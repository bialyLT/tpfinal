from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q, Avg, Count
from django.utils import timezone

from .models import (
    Encuesta, TipoEncuesta, Pregunta, RespuestaEncuesta, 
    DetallePregunta, EncuestaServicio
)
from .serializers import (
    EncuestaSerializer, TipoEncuestaSerializer, PreguntaSerializer, 
    RespuestaEncuestaSerializer, EncuestaPublicaSerializer
)


class EncuestaViewSet(viewsets.ModelViewSet):
    queryset = Encuesta.objects.select_related('cliente', 'tipo_encuesta').prefetch_related('respuestas')
    serializer_class = EncuestaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['estado', 'tipo_encuesta', 'cliente']
    search_fields = ['titulo', 'descripcion']
    ordering_fields = ['fecha_envio', 'fecha_respuesta', 'fecha_expiracion']
    ordering = ['-fecha_envio']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Si es cliente, solo ver sus propias encuestas
        if hasattr(user, 'perfil') and user.perfil.tipo_usuario == 'cliente':
            return queryset.filter(cliente=user)
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
            encuesta = Encuesta.objects.get(token_acceso=token)
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
        if encuesta.estado != 'enviada':
            return Response(
                {'error': 'La encuesta ya fue procesada'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Aquí iría la lógica de envío de email
        encuesta.email_enviado = True
        encuesta.save()

        return Response({'mensaje': 'Encuesta enviada por email'})

    @action(detail=True, methods=['post'])
    def completar_encuesta(self, request, pk=None):
        """Completar encuesta con respuestas"""
        encuesta = self.get_object()
        
        if encuesta.estado != 'enviada':
            return Response(
                {'error': 'Esta encuesta no puede ser completada'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Datos de la respuesta general
        calificacion_general = request.data.get('calificacion_general')
        comentario_general = request.data.get('comentario_general', '')
        respuestas_detalles = request.data.get('respuestas', [])

        if not calificacion_general:
            return Response(
                {'error': 'La calificación general es requerida'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Crear la respuesta principal
        respuesta_encuesta, created = RespuestaEncuesta.objects.get_or_create(
            encuesta=encuesta,
            cliente=request.user,
            defaults={
                'calificacion_general': calificacion_general,
                'comentario_general': comentario_general
            }
        )

        if not created:
            # Actualizar si ya existe
            respuesta_encuesta.calificacion_general = calificacion_general
            respuesta_encuesta.comentario_general = comentario_general
            respuesta_encuesta.save()

        # Procesar respuestas de preguntas específicas
        for respuesta_data in respuestas_detalles:
            pregunta_id = respuesta_data.get('pregunta_id')
            if not pregunta_id:
                continue

            try:
                pregunta = Pregunta.objects.get(id=pregunta_id, encuesta=encuesta)
                
                DetallePregunta.objects.update_or_create(
                    respuesta_encuesta=respuesta_encuesta,
                    pregunta=pregunta,
                    defaults={
                        'respuesta_texto': respuesta_data.get('respuesta_texto'),
                        'respuesta_numero': respuesta_data.get('respuesta_numero'),
                        'respuesta_boolean': respuesta_data.get('respuesta_boolean'),
                        'respuesta_escala': respuesta_data.get('respuesta_escala'),
                        'respuesta_multiple': respuesta_data.get('respuesta_multiple')
                    }
                )
            except Pregunta.DoesNotExist:
                continue

        # Marcar encuesta como respondida
        encuesta.marcar_como_respondida()

        return Response({
            'mensaje': 'Encuesta completada exitosamente',
            'respuesta_id': respuesta_encuesta.id
        })


class TipoEncuestaViewSet(viewsets.ModelViewSet):
    queryset = TipoEncuesta.objects.all()
    serializer_class = TipoEncuestaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['activo']
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['nombre', 'fecha_creacion']
    ordering = ['nombre']


class PreguntaViewSet(viewsets.ModelViewSet):
    queryset = Pregunta.objects.all()
    serializer_class = PreguntaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['tipo_pregunta', 'obligatoria', 'encuesta']
    search_fields = ['texto_pregunta']
    ordering_fields = ['orden', 'fecha_creacion']
    ordering = ['orden']


class RespuestaEncuestaViewSet(viewsets.ModelViewSet):
    queryset = RespuestaEncuesta.objects.select_related('encuesta', 'cliente').prefetch_related('detalles')
    serializer_class = RespuestaEncuestaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['encuesta', 'cliente', 'calificacion_general']
    search_fields = ['comentario_general']
    ordering_fields = ['fecha_respuesta', 'calificacion_general']
    ordering = ['-fecha_respuesta']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Si es cliente, solo ver sus propias respuestas
        if hasattr(user, 'perfil') and user.perfil.tipo_usuario == 'cliente':
            return queryset.filter(cliente=user)
        return queryset
