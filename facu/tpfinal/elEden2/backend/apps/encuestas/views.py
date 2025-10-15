from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Encuesta, Pregunta, EncuestaRespuesta, Respuesta
from .serializers import (
    EncuestaSerializer,
    PreguntaSerializer,
    EncuestaRespuestaSerializer,
    RespuestaSerializer
)


class EncuestaViewSet(viewsets.ModelViewSet):
    queryset = Encuesta.objects.all()
    serializer_class = EncuestaSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['activa']
    search_fields = ['titulo', 'descripcion']
    ordering_fields = ['fecha_creacion', 'titulo']
    ordering = ['-fecha_creacion']


class PreguntaViewSet(viewsets.ModelViewSet):
    queryset = Pregunta.objects.select_related('encuesta').all()
    serializer_class = PreguntaSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['encuesta', 'tipo', 'obligatoria']
    search_fields = ['texto']
    ordering_fields = ['orden', 'texto']
    ordering = ['orden']


class EncuestaRespuestaViewSet(viewsets.ModelViewSet):
    queryset = EncuestaRespuesta.objects.select_related('cliente', 'encuesta').all()
    serializer_class = EncuestaRespuestaSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['estado', 'cliente', 'encuesta']
    search_fields = ['cliente__persona__nombre', 'cliente__persona__apellido', 'encuesta__titulo']
    ordering_fields = ['fecha_inicio', 'fecha_completada']
    ordering = ['-fecha_inicio']


class RespuestaViewSet(viewsets.ModelViewSet):
    queryset = Respuesta.objects.select_related('encuesta_respuesta', 'pregunta').all()
    serializer_class = RespuestaSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['encuesta_respuesta', 'pregunta']
    search_fields = ['valor_texto']
    ordering_fields = ['pregunta__orden']
    ordering = ['pregunta__orden']
