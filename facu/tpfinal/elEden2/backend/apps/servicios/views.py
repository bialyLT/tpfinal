from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction

from .models import Servicio, Reserva, Diseno, DisenoProducto, ImagenDiseno, ImagenReserva
from .serializers import (
    ServicioSerializer, ReservaSerializer,
    DisenoSerializer, DisenoDetalleSerializer, CrearDisenoSerializer,
    DisenoProductoSerializer, ImagenDisenoSerializer
)
from apps.users.models import Cliente, Empleado
from apps.productos.models import Producto


class ServicioViewSet(viewsets.ModelViewSet):
    queryset = Servicio.objects.all()
    serializer_class = ServicioSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['activo', 'tipo']
    search_fields = ['nombre', 'descripcion']
    ordering = ['nombre']


class ReservaViewSet(viewsets.ModelViewSet):
    queryset = Reserva.objects.select_related('cliente__persona', 'servicio').all()
    serializer_class = ReservaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['estado', 'servicio']
    search_fields = ['cliente__persona__nombre', 'cliente__persona__apellido', 'servicio__nombre']
    ordering = ['-fecha_solicitud']
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        """
        Filtrar reservas según el tipo de usuario:
        - Clientes: solo ven sus propias reservas
        - Empleados/Staff: ven todas las reservas
        """
        user = self.request.user
        
        # Si es staff o empleado, mostrar todas las reservas
        if user.is_staff:
            return Reserva.objects.select_related('cliente__persona', 'servicio').all()
        
        # Verificar si es empleado
        try:
            Empleado.objects.get(persona__email=user.email)
            return Reserva.objects.select_related('cliente__persona', 'servicio').all()
        except Empleado.DoesNotExist:
            pass
        
        # Si es cliente, filtrar solo sus reservas
        try:
            cliente = Cliente.objects.get(persona__email=user.email)
            return Reserva.objects.select_related('cliente__persona', 'servicio').filter(cliente=cliente)
        except Cliente.DoesNotExist:
            # Si no es cliente ni empleado, no mostrar nada
            return Reserva.objects.none()

    def create(self, request, *args, **kwargs):
        """
        Crear una reserva de un servicio del catálogo
        """
        data = request.data.copy()
        
        # Obtener el cliente actual basado en el email del usuario autenticado
        try:
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
        
        # Verificar que el servicio existe
        servicio_id = data.get('servicio')
        if not servicio_id:
            return Response(
                {'error': 'El campo servicio es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            servicio = Servicio.objects.get(id_servicio=servicio_id, activo=True)
        except Servicio.DoesNotExist:
            return Response(
                {'error': 'El servicio seleccionado no existe o no está disponible'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Asignar automáticamente el cliente autenticado
        data['cliente'] = cliente.id_cliente
        data['servicio'] = servicio.id_servicio
        
        # Asegurar estado inicial
        if 'estado' not in data:
            data['estado'] = 'pendiente'
        
        # Extraer imágenes antes de la serialización
        imagenes_jardin = request.FILES.getlist('imagenes_jardin')
        imagenes_ideas = request.FILES.getlist('imagenes_ideas')
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        reserva = serializer.save()
        
        # Guardar imágenes del jardín
        for imagen in imagenes_jardin:
            ImagenReserva.objects.create(
                reserva=reserva,
                imagen=imagen,
                tipo_imagen='jardin'
            )
        
        # Guardar imágenes de ideas
        for imagen in imagenes_ideas:
            ImagenReserva.objects.create(
                reserva=reserva,
                imagen=imagen,
                tipo_imagen='ideas'
            )
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class DisenoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de diseños/propuestas"""
    queryset = Diseno.objects.select_related('servicio', 'disenador', 'disenador__persona', 'reserva', 'reserva__cliente__persona').prefetch_related('productos', 'imagenes').all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['estado', 'servicio', 'disenador']
    search_fields = ['titulo', 'descripcion']
    ordering = ['-fecha_creacion']
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        """
        Filtrar diseños según el tipo de usuario:
        - Administradores: ven todos los diseños
        - Empleados: solo ven los diseños que ellos crearon
        - Clientes: ven los diseños de sus reservas
        """
        user = self.request.user
        
        # Si es staff/administrador, mostrar todos los diseños
        if user.is_staff:
            return Diseno.objects.select_related(
                'servicio', 'disenador', 'disenador__persona', 
                'reserva', 'reserva__cliente__persona'
            ).prefetch_related('productos', 'imagenes').all()
        
        # Verificar si es empleado
        try:
            empleado = Empleado.objects.get(persona__email=user.email)
            # Empleados solo ven sus propios diseños
            return Diseno.objects.select_related(
                'servicio', 'disenador', 'disenador__persona',
                'reserva', 'reserva__cliente__persona'
            ).prefetch_related('productos', 'imagenes').filter(disenador=empleado)
        except Empleado.DoesNotExist:
            pass
        
        # Verificar si es cliente
        try:
            cliente = Cliente.objects.get(persona__email=user.email)
            # Clientes ven los diseños de sus reservas
            return Diseno.objects.select_related(
                'servicio', 'disenador', 'disenador__persona',
                'reserva', 'reserva__cliente__persona'
            ).prefetch_related('productos', 'imagenes').filter(reserva__cliente=cliente)
        except Cliente.DoesNotExist:
            pass
        
        # Si no es ninguno de los anteriores, no mostrar ningún diseño
        return Diseno.objects.none()
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return DisenoDetalleSerializer
        elif self.action == 'crear_diseno_completo':
            return CrearDisenoSerializer
        return DisenoSerializer
    
    @action(detail=False, methods=['post'], url_path='crear-completo')
    @transaction.atomic
    def crear_diseno_completo(self, request):
        """
        Crear un diseño completo con productos e imágenes
        POST /api/v1/servicios/disenos/crear-completo/
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # Log para debug
        logger.warning(f"🔍 Datos recibidos en crear_diseno_completo:")
        logger.warning(f"   - servicio_id: {request.data.get('servicio_id')}")
        logger.warning(f"   - reserva_id: {request.data.get('reserva_id')}")
        logger.warning(f"   - titulo: {request.data.get('titulo')}")
        
        # Obtener datos del formulario y convertir tipos
        data = {
            'titulo': request.data.get('titulo'),
            'descripcion': request.data.get('descripcion'),
            'presupuesto': float(request.data.get('presupuesto', 0)),
            'servicio_id': int(request.data.get('servicio_id')),
            'notas_internas': request.data.get('notas_internas', ''),
        }
        
        # Agregar reserva_id si existe
        if request.data.get('reserva_id'):
            data['reserva_id'] = int(request.data.get('reserva_id'))
        
        # Agregar fecha_propuesta si existe
        if request.data.get('fecha_propuesta'):
            data['fecha_propuesta'] = request.data.get('fecha_propuesta')
        
        # Intentar obtener el empleado actual
        try:
            empleado = Empleado.objects.get(persona__email=request.user.email)
            data['disenador_id'] = empleado.id_empleado
        except Empleado.DoesNotExist:
            pass  # No es empleado, puede ser admin
        
        # Validar datos básicos
        serializer = CrearDisenoSerializer(data=data)
        if not serializer.is_valid():
            logger.error(f"Errores de validación: {serializer.errors}")
        serializer.is_valid(raise_exception=True)
        
        # Crear el diseño
        diseno = Diseno.objects.create(
            titulo=serializer.validated_data['titulo'],
            descripcion=serializer.validated_data['descripcion'],
            presupuesto=serializer.validated_data['presupuesto'],
            reserva_id=serializer.validated_data.get('reserva_id'),
            servicio_id=serializer.validated_data['servicio_id'],
            disenador_id=serializer.validated_data.get('disenador_id'),
            notas_internas=serializer.validated_data.get('notas_internas', ''),
            fecha_propuesta=serializer.validated_data.get('fecha_propuesta'),
            estado='borrador'
        )
        
        # Si hay reserva asociada, cambiar su estado a 'confirmada'
        if diseno.reserva:
            diseno.reserva.estado = 'confirmada'
            diseno.reserva.save()
        
        # Procesar productos si vienen como JSON string
        import json
        from apps.productos.models import Stock
        
        productos_data = request.data.get('productos')
        if productos_data:
            if isinstance(productos_data, str):
                productos_data = json.loads(productos_data)
            
            # Primero validar stock disponible
            for prod in productos_data:
                producto = Producto.objects.get(id_producto=prod['producto_id'])
                cantidad_solicitada = int(prod['cantidad'])
                
                # Obtener stock del producto
                try:
                    stock = Stock.objects.get(producto=producto)
                    if stock.cantidad < cantidad_solicitada:
                        return Response(
                            {
                                'error': f'Stock insuficiente para {producto.nombre}',
                                'detail': f'Stock disponible: {stock.cantidad}, solicitado: {cantidad_solicitada}'
                            },
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except Stock.DoesNotExist:
                    return Response(
                        {
                            'error': f'El producto {producto.nombre} no tiene stock registrado',
                            'detail': 'Por favor, contacte al administrador'
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Si todo está bien, crear los productos del diseño
            for prod in productos_data:
                producto = Producto.objects.get(id_producto=prod['producto_id'])
                DisenoProducto.objects.create(
                    diseno=diseno,
                    producto=producto,
                    cantidad=prod['cantidad'],
                    precio_unitario=prod['precio_unitario'],
                    notas=prod.get('notas', '')
                )
        
        # Procesar imágenes
        imagenes = request.FILES.getlist('imagenes_diseño')
        for idx, imagen in enumerate(imagenes):
            ImagenDiseno.objects.create(
                diseno=diseno,
                imagen=imagen,
                orden=idx,
                descripcion=f"Imagen {idx + 1}"
            )
        
        # Retornar el diseño creado con todos sus detalles
        output_serializer = DisenoDetalleSerializer(diseno, context={'request': request})
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def presentar(self, request, pk=None):
        """Presentar el diseño al cliente"""
        diseno = self.get_object()
        diseno.presentar()
        serializer = self.get_serializer(diseno)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def aceptar(self, request, pk=None):
        """Aceptar el diseño (acción del cliente)"""
        diseno = self.get_object()
        observaciones = request.data.get('observaciones')
        diseno.aceptar(observaciones)
        serializer = self.get_serializer(diseno)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def aceptar_cliente(self, request, pk=None):
        """
        Aceptar el diseño desde el cliente.
        - Cambia estado del diseño a 'aceptado'
        - Cambia estado de la reserva a 'en_curso'
        - Descuenta el stock de los productos
        """
        from apps.productos.models import Stock
        
        diseno = self.get_object()
        
        # Verificar que el diseño esté presentado
        if diseno.estado != 'presentado':
            return Response(
                {'error': 'El diseño debe estar en estado "presentado" para ser aceptado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar stock antes de descontar
        productos_diseno = diseno.productos.all()
        stock_insuficiente = []
        
        for dp in productos_diseno:
            try:
                stock = Stock.objects.get(producto=dp.producto)
                if stock.cantidad < dp.cantidad:
                    stock_insuficiente.append({
                        'producto': dp.producto.nombre,
                        'disponible': stock.cantidad,
                        'requerido': dp.cantidad
                    })
            except Stock.DoesNotExist:
                stock_insuficiente.append({
                    'producto': dp.producto.nombre,
                    'disponible': 0,
                    'requerido': dp.cantidad
                })
        
        if stock_insuficiente:
            return Response(
                {
                    'error': 'Stock insuficiente para algunos productos',
                    'productos': stock_insuficiente
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Si hay stock suficiente, descontar
        for dp in productos_diseno:
            stock = Stock.objects.get(producto=dp.producto)
            stock.cantidad -= dp.cantidad
            stock.save()
        
        # Aceptar el diseño
        observaciones = request.data.get('observaciones', '')
        diseno.aceptar(observaciones)
        
        # Cambiar estado de la reserva a 'en_curso'
        if diseno.reserva:
            diseno.reserva.estado = 'en_curso'
            diseno.reserva.save()
        
        serializer = self.get_serializer(diseno)
        return Response({
            'message': 'Diseño aceptado exitosamente. Stock descontado.',
            'diseno': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def rechazar_cliente(self, request, pk=None):
        """
        Rechazar el diseño desde el cliente.
        - Cambia estado del diseño a 'rechazado'
        - Cambia estado de la reserva a 'pendiente'
        - Guarda feedback del cliente (por ahora solo en observaciones)
        """
        diseno = self.get_object()
        
        # Verificar que el diseño esté presentado
        if diseno.estado != 'presentado':
            return Response(
                {'error': 'El diseño debe estar en estado "presentado" para ser rechazado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener feedback del cliente
        feedback = request.data.get('feedback', '')
        
        # Rechazar el diseño con el feedback
        diseno.rechazar(feedback)
        
        # Cambiar estado de la reserva a 'pendiente'
        if diseno.reserva:
            diseno.reserva.estado = 'pendiente'
            diseno.reserva.save()
        
        serializer = self.get_serializer(diseno)
        return Response({
            'message': 'Diseño rechazado. La reserva volvió a estado pendiente.',
            'diseno': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def rechazar(self, request, pk=None):
        """Rechazar el diseño (acción del empleado/admin)"""
        diseno = self.get_object()
        observaciones = request.data.get('observaciones')
        diseno.rechazar(observaciones)
        serializer = self.get_serializer(diseno)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def solicitar_revision(self, request, pk=None):
        """Solicitar revisión del diseño (acción del cliente)"""
        diseno = self.get_object()
        observaciones = request.data.get('observaciones')
        if not observaciones:
            return Response(
                {'error': 'Las observaciones son requeridas para solicitar una revisión'},
                status=status.HTTP_400_BAD_REQUEST
            )
        diseno.solicitar_revision(observaciones)
        serializer = self.get_serializer(diseno)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def por_servicio(self, request, servicio_id=None):
        """Obtener todos los diseños de un servicio específico"""
        disenos = self.queryset.filter(servicio_id=servicio_id)
        serializer = self.get_serializer(disenos, many=True)
        return Response(serializer.data)
