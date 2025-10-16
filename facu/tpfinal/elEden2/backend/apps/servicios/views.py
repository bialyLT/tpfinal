from rest_framework import viewsets, status
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Servicio, Reserva
from .serializers import ServicioSerializer, ReservaSerializer
from apps.users.models import Cliente


class ServicioViewSet(viewsets.ModelViewSet):
    queryset = Servicio.objects.all()
    serializer_class = ServicioSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['activo', 'tipo']
    search_fields = ['nombre', 'descripcion']
    ordering = ['nombre']


class ReservaViewSet(viewsets.ModelViewSet):
    queryset = Reserva.objects.select_related('cliente', 'servicio').all()
    serializer_class = ReservaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['estado', 'cliente', 'servicio']
    search_fields = ['cliente__persona__nombre', 'cliente__persona__apellido', 'servicio__nombre']
    ordering = ['-fecha_solicitud']

    def create(self, request, *args, **kwargs):
        """
        Crear una reserva y automáticamente crear el servicio asociado
        basado en la solicitud del cliente
        """
        data = request.data
        
        # Obtener el cliente actual basado en el email del usuario autenticado
        try:
            # Buscar la persona por el email que coincida con el usuario autenticado
            cliente = Cliente.objects.select_related('persona').get(
                persona__email=request.user.email
            )
        except Cliente.DoesNotExist:
            return Response(
                {
                    'error': 'Usuario no está registrado como cliente',
                    'detail': f'No se encontró un cliente con el email: {request.user.email}'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Extraer datos para crear el servicio
        tipo_servicio = data.get('tipo_servicio')
        descripcion = data.get('observaciones', '')
        
        if not tipo_servicio:
            return Response(
                {'error': 'El campo tipo_servicio es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear nombre del servicio basado en el tipo
        tipo_display = dict(Servicio.TIPO_CHOICES).get(tipo_servicio, 'Servicio')
        nombre_servicio = f"Solicitud de {tipo_display} - Cliente {cliente.persona.apellido}"
        
        # Crear el servicio automáticamente
        servicio = Servicio.objects.create(
            nombre=nombre_servicio,
            tipo=tipo_servicio,
            descripcion=descripcion,
            duracion_estimada=1,  # Valor por defecto, se ajustará después
            precio=0,  # Se calculará después de evaluar la solicitud
            activo=False  # Inactivo hasta que se confirme y cotice
        )
        
        # Crear la reserva con el servicio recién creado
        reserva_data = {
            'cliente': cliente.id_cliente,
            'servicio': servicio.id_servicio,
            'fecha_reserva': data.get('fecha_reserva'),
            'observaciones': data.get('observaciones', ''),
            'estado': data.get('estado', 'pendiente')
        }
        
        serializer = self.get_serializer(data=reserva_data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
