from datetime import datetime, time

from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.db import transaction
from decimal import Decimal
from .models import Encuesta, Pregunta, EncuestaRespuesta, Respuesta
from apps.users.models import Cliente, Empleado
from .serializers import (
    EncuestaSerializer,
    EncuestaDetalleSerializer,
    EncuestaCreateUpdateSerializer,
    PreguntaSerializer,
    EncuestaRespuestaSerializer,
    RespuestaSerializer,
    RespuestaImpactoSerializer,
)
import logging

logger = logging.getLogger(__name__)


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

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def activa(self, request):
        """Obtener la encuesta activa con sus preguntas"""
        try:
            encuesta_activa = Encuesta.obtener_activa()
            if not encuesta_activa:
                return Response(
                    {'error': 'No hay ninguna encuesta activa en este momento.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = EncuestaDetalleSerializer(encuesta_activa)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error al obtener encuesta activa: {str(e)}")
            return Response(
                {'error': 'Error al obtener la encuesta activa'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def responder(self, request):
        """
        Permite a un cliente responder una encuesta.
        Espera:
        {
            "reserva_id": 123,
            "respuestas": [
                {"pregunta_id": 1, "valor_texto": "Respuesta", "valor_numero": null, ...},
                ...
            ]
        }
        """
        try:
            # Obtener datos de la request
            reserva_id = request.data.get('reserva_id')
            respuestas_data = request.data.get('respuestas', [])
            
            if not reserva_id:
                return Response(
                    {'error': 'El ID de la reserva es requerido'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Verificar que el usuario es un cliente
            try:
                # El cliente se identifica por el email del usuario autenticado
                cliente = Cliente.objects.get(persona__email=request.user.email)
            except Cliente.DoesNotExist:
                return Response(
                    {'error': 'Solo los clientes pueden responder encuestas'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Obtener la encuesta activa
            encuesta_activa = Encuesta.obtener_activa()
            if not encuesta_activa:
                return Response(
                    {'error': 'No hay ninguna encuesta activa en este momento'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Verificar que la reserva pertenece al cliente
            from apps.servicios.models import Reserva
            try:
                reserva = Reserva.objects.get(id_reserva=reserva_id, cliente=cliente)
            except Reserva.DoesNotExist:
                return Response(
                    {'error': 'Reserva no encontrada o no pertenece al cliente'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Verificar si ya respondió esta encuesta para esta reserva
            respuesta_existente = EncuestaRespuesta.objects.filter(
                encuesta=encuesta_activa,
                cliente=cliente,
                reserva=reserva,
                estado='completada'
            ).exists()
            
            if respuesta_existente:
                return Response(
                    {'error': 'Ya has respondido esta encuesta para esta reserva'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Crear o actualizar la EncuestaRespuesta con transacción
            with transaction.atomic():
                encuesta_respuesta, created = EncuestaRespuesta.objects.get_or_create(
                    encuesta=encuesta_activa,
                    cliente=cliente,
                    reserva=reserva,
                    defaults={'fecha_inicio': timezone.now()}
                )
                
                # Eliminar respuestas anteriores si existe (por si quedó incompleta)
                encuesta_respuesta.respuestas.all().delete()
                
                # Validar que todas las preguntas obligatorias estén respondidas
                preguntas_obligatorias = encuesta_activa.preguntas.filter(obligatoria=True)
                preguntas_respondidas = [r.get('pregunta_id') for r in respuestas_data]
                
                for pregunta in preguntas_obligatorias:
                    # Usar el PK correcto del modelo Pregunta
                    if pregunta.id_pregunta not in preguntas_respondidas:
                        return Response(
                            {'error': f'La pregunta "{pregunta.texto}" es obligatoria'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                
                # Crear las respuestas
                for respuesta_data in respuestas_data:
                    pregunta_id = respuesta_data.get('pregunta_id')
                    if pregunta_id is None:
                        pregunta_id = respuesta_data.get('id')
                    if pregunta_id is None:
                        continue
                    try:
                        pregunta = encuesta_activa.preguntas.get(id_pregunta=pregunta_id)
                    except Pregunta.DoesNotExist:
                        continue

                    # Mapear valores a los campos reales del modelo Respuesta
                    valor_texto = respuesta_data.get('valor_texto')
                    # Aceptar varias claves numéricas y normalizarlas a valor_numerico
                    valor_numerico = respuesta_data.get('valor_numerico')
                    if valor_numerico is None:
                        valor_numerico = respuesta_data.get('valor_numero')
                    if valor_numerico is None:
                        valor_numerico = respuesta_data.get('valor_escala')

                    valor_boolean = respuesta_data.get('valor_boolean')
                    # Para múltiples opciones, persistimos en valor_texto (como CSV o texto)
                    if not valor_texto and respuesta_data.get('valor_multiple') is not None:
                        vm = respuesta_data.get('valor_multiple')
                        if isinstance(vm, (list, tuple)):
                            valor_texto = ",".join(map(str, vm))
                        else:
                            valor_texto = str(vm)

                    Respuesta.objects.create(
                        encuesta_respuesta=encuesta_respuesta,
                        pregunta=pregunta,
                        valor_texto=valor_texto,
                        valor_numerico=valor_numerico,
                        valor_boolean=valor_boolean,
                    )
                
                # Marcar como completada
                encuesta_respuesta.estado = 'completada'
                encuesta_respuesta.fecha_completada = timezone.now()
                encuesta_respuesta.save()

                try:
                    respuestas_relevantes = encuesta_respuesta.respuestas.filter(
                        pregunta__impacta_puntuacion=True,
                        pregunta__tipo='escala'
                    )
                    valores_puntuacion = [
                        Decimal(respuesta.valor_numerico)
                        for respuesta in respuestas_relevantes
                        if respuesta.valor_numerico is not None
                    ]

                    if valores_puntuacion:
                        total_puntuacion = sum(valores_puntuacion, Decimal('0'))
                        cantidad_puntuacion = len(valores_puntuacion)
                        timestamp = encuesta_respuesta.fecha_completada
                        empleados_asignados = list(reserva.empleados.all())

                        for empleado in empleados_asignados:
                            empleado.registrar_resultado_encuesta(
                                puntuacion_total=total_puntuacion,
                                cantidad_items=cantidad_puntuacion,
                                timestamp=timestamp
                            )
                except Exception as scoring_error:
                    logger.error(
                        "No se pudo actualizar la puntuación de empleados para la encuesta %s (reserva %s): %s",
                        encuesta_respuesta.pk,
                        reserva.id_reserva,
                        scoring_error,
                        exc_info=True
                    )
                
                logger.info(f"Cliente {cliente.pk} completó encuesta {encuesta_activa.pk} para reserva {reserva_id}")
                
                return Response(
                    {
                        'mensaje': '¡Gracias por completar la encuesta!',
                        'encuesta_respuesta_id': encuesta_respuesta.pk
                    },
                    status=status.HTTP_201_CREATED
                )
                
        except Exception as e:
            logger.error(f"Error al procesar respuesta de encuesta: {str(e)}")
            return Response(
                {'error': 'Error al procesar la encuesta'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    


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
    filterset_fields = ['estado', 'cliente', 'encuesta', 'reserva']
    search_fields = ['cliente__persona__nombre', 'cliente__persona__apellido', 'encuesta__titulo']
    ordering_fields = ['fecha_inicio', 'fecha_completada']
    ordering = ['-fecha_inicio']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if user.is_staff:
            return queryset

        cliente = Cliente.objects.filter(persona__email=user.email).first()
        if not cliente:
            return queryset.none()

        return queryset.filter(cliente=cliente)


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


class EmpleadoImpactoEncuestaAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        empleado = self._get_empleado(request.user)
        if not empleado:
            return Response({'detail': 'Solo los empleados pueden acceder a esta información.'}, status=status.HTTP_403_FORBIDDEN)

        queryset = Respuesta.objects.select_related(
            'pregunta',
            'encuesta_respuesta__encuesta',
            'encuesta_respuesta__cliente__persona',
            'encuesta_respuesta__reserva__servicio'
        ).filter(
            pregunta__impacta_puntuacion=True,
            pregunta__tipo='escala',
            encuesta_respuesta__estado='completada',
            encuesta_respuesta__reserva__empleados=empleado,
            encuesta_respuesta__reserva__isnull=False,
        ).distinct()

        queryset = self._apply_date_filters(request, queryset)

        total = queryset.count()

        queryset = queryset.order_by('-encuesta_respuesta__fecha_completada', 'pregunta__orden')

        limit = self._resolve_limit(request.query_params.get('limit'))
        if limit is not None:
            queryset = queryset[:limit]

        serializer = RespuestaImpactoSerializer(queryset, many=True)
        return Response({'count': total, 'results': serializer.data})

    def _apply_date_filters(self, request, queryset):
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        if start_date_str:
            parsed = parse_date(start_date_str)
            if parsed:
                start_dt = datetime.combine(parsed, time.min)
                if timezone.is_naive(start_dt):
                    start_dt = timezone.make_aware(start_dt, timezone.get_current_timezone())
                queryset = queryset.filter(encuesta_respuesta__fecha_completada__gte=start_dt)

        if end_date_str:
            parsed = parse_date(end_date_str)
            if parsed:
                end_dt = datetime.combine(parsed, time.max.replace(microsecond=0))
                if timezone.is_naive(end_dt):
                    end_dt = timezone.make_aware(end_dt, timezone.get_current_timezone())
                queryset = queryset.filter(encuesta_respuesta__fecha_completada__lte=end_dt)

        return queryset

    def _get_empleado(self, user):
        persona = getattr(user, 'persona', None)
        if persona and hasattr(persona, 'empleado'):
            return persona.empleado
        return Empleado.objects.filter(persona__email=user.email).first()

    def _resolve_limit(self, limit_param):
        if limit_param in (None, '', 'all', 'todos', '*'):
            return None
        try:
            limit_value = int(limit_param)
        except (TypeError, ValueError):
            return 100
        if limit_value <= 0:
            return None
        return min(limit_value, 500)
