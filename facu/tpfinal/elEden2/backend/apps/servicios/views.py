from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.response import Response
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.utils import timezone

from .models import Servicio, Reserva, Diseno, DisenoProducto, ImagenDiseno, ImagenReserva, ReservaEmpleado
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
    
    @action(detail=False, methods=['get'], url_path='empleados-disponibles')
    def empleados_disponibles(self, request):
        """
        Obtener empleados disponibles para una fecha específica
        Query params: fecha (YYYY-MM-DD)
        """
        from datetime import datetime
        from apps.servicios.models import ReservaEmpleado
        
        fecha_str = request.query_params.get('fecha')
        if not fecha_str:
            return Response(
                {'error': 'El parámetro fecha es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Formato de fecha inválido. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener reservas activas en esa fecha
        reservas_en_fecha = Reserva.objects.filter(
            fecha_reserva__date=fecha,
            estado__in=['confirmada', 'en_curso']
        ).values_list('id_reserva', flat=True)
        
        # Obtener empleados asignados como operadores en esas reservas
        empleados_ocupados = ReservaEmpleado.objects.filter(
            reserva__in=reservas_en_fecha,
            rol='operador'
        ).values_list('empleado_id', flat=True)
        
        # Obtener empleados disponibles (no ocupados)
        empleados_disponibles = Empleado.objects.exclude(
            id_empleado__in=empleados_ocupados
        ).select_related('persona')
        
        data = [{
            'id': emp.id_empleado,
            'nombre': emp.persona.nombre,
            'apellido': emp.persona.apellido,
            'email': emp.persona.email,
        } for emp in empleados_disponibles]
        
        return Response({
            'fecha': fecha_str,
            'empleados_disponibles': data,
            'total_disponibles': len(data)
        })
    
    @action(detail=False, methods=['get'], url_path='fechas-disponibles')
    def fechas_disponibles(self, request):
        """
        Verificar si una fecha tiene empleados disponibles
        Query params: fecha_inicio, fecha_fin (opcional)
        """
        from datetime import datetime, timedelta
        from apps.servicios.models import ReservaEmpleado
        
        fecha_inicio_str = request.query_params.get('fecha_inicio')
        fecha_fin_str = request.query_params.get('fecha_fin')
        
        if not fecha_inicio_str:
            return Response(
                {'error': 'El parámetro fecha_inicio es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            fecha_inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d').date()
            if fecha_fin_str:
                fecha_fin = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()
            else:
                fecha_fin = fecha_inicio + timedelta(days=30)  # 30 días por defecto
        except ValueError:
            return Response(
                {'error': 'Formato de fecha inválido. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener total de empleados operadores
        total_empleados = Empleado.objects.count()
        
        # Generar lista de fechas bloqueadas
        fechas_bloqueadas = []
        current_date = fecha_inicio
        
        while current_date <= fecha_fin:
            # Contar reservas activas en esta fecha
            reservas_en_fecha = Reserva.objects.filter(
                fecha_reserva__date=current_date,
                estado__in=['confirmada', 'en_curso']
            ).values_list('id_reserva', flat=True)
            
            # Contar empleados ocupados
            empleados_ocupados = ReservaEmpleado.objects.filter(
                reserva__in=reservas_en_fecha,
                rol='operador'
            ).values('empleado_id').distinct().count()
            
            # Si todos los empleados están ocupados, bloquear la fecha
            if empleados_ocupados >= total_empleados:
                fechas_bloqueadas.append(current_date.strftime('%Y-%m-%d'))
            
            current_date += timedelta(days=1)
        
        return Response({
            'fecha_inicio': fecha_inicio_str,
            'fecha_fin': fecha_fin.strftime('%Y-%m-%d'),
            'fechas_bloqueadas': fechas_bloqueadas,
            'total_empleados': total_empleados
        })
    
    @action(detail=True, methods=['post'], url_path='finalizar-servicio')
    def finalizar_servicio(self, request, pk=None):
        """
        Finalizar un servicio (cambiar estado a completada)
        Solo pueden hacerlo:
        - Administradores
        - Empleados asignados a la reserva
        """
        reserva = self.get_object()
        user = request.user
        
        # Verificar permisos
        es_admin = user.is_staff or user.is_superuser
        
        # Verificar si es empleado asignado
        es_empleado_asignado = False
        if not es_admin:
            try:
                empleado = Empleado.objects.get(persona__email=user.email)
                # Verificar si está asignado a esta reserva
                es_empleado_asignado = ReservaEmpleado.objects.filter(
                    reserva=reserva,
                    empleado=empleado
                ).exists()
            except Empleado.DoesNotExist:
                pass
        
        # Si no es admin ni empleado asignado, denegar acceso
        if not es_admin and not es_empleado_asignado:
            return Response(
                {'error': 'No tiene permisos para finalizar este servicio'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Verificar que el estado actual permita finalizarlo
        if reserva.estado == 'completada':
            return Response(
                {'error': 'El servicio ya está finalizado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if reserva.estado == 'cancelada':
            return Response(
                {'error': 'No se puede finalizar un servicio cancelado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cambiar estado a completada
        reserva.estado = 'completada'
        reserva.save()
        
        serializer = self.get_serializer(reserva)
        return Response({
            'message': 'Servicio finalizado exitosamente',
            'reserva': serializer.data
        })


class DisenoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de diseños/propuestas"""
    queryset = Diseno.objects.select_related('servicio', 'disenador', 'disenador__persona', 'reserva', 'reserva__cliente__persona').prefetch_related('productos', 'imagenes').all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['estado', 'servicio', 'disenador']
    search_fields = ['titulo', 'descripcion']
    ordering = ['-fecha_creacion']
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
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
            
            # Primero validar stock disponible (solo bloquear si no hay stock en absoluto)
            for prod in productos_data:
                producto = Producto.objects.get(id_producto=prod['producto_id'])
                cantidad_solicitada = int(prod['cantidad'])
                
                # Obtener stock del producto
                try:
                    stock = Stock.objects.get(producto=producto)
                    # Solo bloquear si no hay stock disponible (0 o menos)
                    if stock.cantidad < 1:
                        return Response(
                            {
                                'error': f'El producto {producto.nombre} no tiene stock disponible',
                                'detail': f'Stock disponible: {stock.cantidad} unidades. No se pueden crear diseños con productos sin stock.'
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
    
    def _buscar_fecha_con_empleados_disponibles(self, fecha_inicial, empleados_necesarios=2, max_dias_busqueda=30):
        """
        Busca la siguiente fecha disponible donde haya al menos 'empleados_necesarios' empleados libres.
        Comienza desde fecha_inicial + 7 días (para dar tiempo al reabastecimiento).
        """
        from datetime import timedelta
        
        # Empezar a buscar desde 7 días después de la fecha inicial (tiempo mínimo para reabastecer)
        fecha_candidata = fecha_inicial + timedelta(days=7)
        dias_buscados = 0
        
        while dias_buscados < max_dias_busqueda:
            # Obtener reservas activas en esa fecha
            reservas_en_fecha = Reserva.objects.filter(
                fecha_reserva__date=fecha_candidata.date(),
                estado__in=['confirmada', 'en_curso']
            ).values_list('id_reserva', flat=True)
            
            # Obtener empleados ocupados en esa fecha
            empleados_ocupados = ReservaEmpleado.objects.filter(
                reserva__in=reservas_en_fecha,
                rol='operador'
            ).values_list('empleado_id', flat=True)
            
            # Contar empleados disponibles
            empleados_disponibles = Empleado.objects.exclude(
                id_empleado__in=empleados_ocupados
            ).count()
            
            # Si hay suficientes empleados disponibles, retornar esta fecha
            if empleados_disponibles >= empleados_necesarios:
                return fecha_candidata
            
            # Si no, probar el día siguiente
            fecha_candidata += timedelta(days=1)
            dias_buscados += 1
        
        # Si no encuentra fecha disponible en max_dias_busqueda, retornar fecha_inicial + 7 días por defecto
        return fecha_inicial + timedelta(days=7)
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def aceptar_cliente(self, request, pk=None):
        """
        Aceptar el diseño desde el cliente.
        - Verifica stock de productos
        - Si no hay stock y el servicio es en la semana actual, propone reagendar +1 semana
        - Si acepta_reagendamiento=True, reagenda y acepta
        - Si hay stock o acepta reagendamiento, descuenta stock y acepta
        - Cambia estado del diseño a 'aceptado'
        - Cambia estado de la reserva a 'en_curso'
        - Asigna empleados automáticamente
        """
        from apps.productos.models import Stock
        from datetime import datetime, timedelta
        
        diseno = self.get_object()
        
        # Verificar que el diseño esté presentado
        if diseno.estado != 'presentado':
            return Response(
                {'error': 'El diseño debe estar en estado "presentado" para ser aceptado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Si acepta reagendamiento, actualizar las fechas primero
        acepta_reagendamiento = request.data.get('acepta_reagendamiento', False)
        
        if acepta_reagendamiento:
            nueva_fecha_str = request.data.get('nueva_fecha')
            if nueva_fecha_str:
                nueva_fecha = datetime.fromisoformat(nueva_fecha_str.replace('Z', '+00:00'))
                if diseno.fecha_propuesta:
                    diseno.fecha_propuesta = nueva_fecha
                if diseno.reserva:
                    diseno.reserva.fecha_reserva = nueva_fecha
                    diseno.reserva.save()
                diseno.save()
        
        # Verificar stock antes de descontar
        productos_diseno = diseno.productos.all()
        stock_insuficiente = []
        
        for dp in productos_diseno:
            try:
                stock = Stock.objects.get(producto=dp.producto)
                if stock.cantidad < dp.cantidad:
                    stock_insuficiente.append({
                        'producto': dp.producto.nombre,
                        'id_producto': dp.producto.id_producto,
                        'disponible': stock.cantidad,
                        'requerido': dp.cantidad,
                        'faltante': dp.cantidad - stock.cantidad
                    })
            except Stock.DoesNotExist:
                stock_insuficiente.append({
                    'producto': dp.producto.nombre,
                    'id_producto': dp.producto.id_producto,
                    'disponible': 0,
                    'requerido': dp.cantidad,
                    'faltante': dp.cantidad
                })
        
        # Si hay stock insuficiente Y NO acepta reagendamiento
        if stock_insuficiente and not acepta_reagendamiento:
            # Primera vez que se detecta falta de stock
            fecha_servicio = diseno.fecha_propuesta or diseno.reserva.fecha_reserva
            hoy = timezone.now()
            una_semana = hoy + timedelta(days=7)
            
            servicio_en_semana_actual = fecha_servicio <= una_semana
            
            if servicio_en_semana_actual:
                # Buscar la siguiente fecha disponible con empleados libres
                nueva_fecha = self._buscar_fecha_con_empleados_disponibles(fecha_servicio)
                dias_diferencia = (nueva_fecha.date() - fecha_servicio.date()).days
                
                return Response({
                    'requiere_reagendamiento': True,
                    'mensaje': f'Stock insuficiente. El servicio debe reagendarse para dar tiempo al reabastecimiento. La próxima fecha disponible con empleados libres es en {dias_diferencia} días.',
                    'productos_faltantes': stock_insuficiente,
                    'fecha_actual': fecha_servicio.isoformat(),
                    'fecha_propuesta': nueva_fecha.isoformat(),
                    'tiempo_espera_dias': dias_diferencia
                }, status=status.HTTP_409_CONFLICT)
            # Si el servicio NO está en la semana actual, continuar normalmente
            # (hay tiempo para reabastecer, el stock quedará negativo)
        
        # Si llegamos aquí, hay stock suficiente o se aceptó reagendamiento
        # Descontar stock (puede quedar negativo si se aceptó reagendamiento con stock insuficiente)
        for dp in productos_diseno:
            stock = Stock.objects.get(producto=dp.producto)
            stock.cantidad -= dp.cantidad
            stock.save()
        
        # Guardar feedback del cliente
        feedback = request.data.get('feedback', '')
        observaciones = request.data.get('observaciones', '')
        
        if feedback:
            diseno.observaciones_cliente = feedback
        elif observaciones:
            diseno.observaciones_cliente = observaciones
        
        # Aceptar el diseño
        diseno.aceptar(feedback or observaciones)
        
        # Cambiar estado de la reserva a 'en_curso' y asignar empleados automáticamente
        if diseno.reserva:
            from apps.servicios.models import ReservaEmpleado
            
            # Actualizar fecha_reserva con fecha_propuesta si existe
            if diseno.fecha_propuesta:
                diseno.reserva.fecha_reserva = diseno.fecha_propuesta
            
            diseno.reserva.estado = 'en_curso'
            diseno.reserva.save()
            
            # Asignar empleados disponibles automáticamente
            fecha_reserva = diseno.reserva.fecha_reserva.date()
            
            # Obtener reservas activas en esa fecha
            reservas_en_fecha = Reserva.objects.filter(
                fecha_reserva__date=fecha_reserva,
                estado__in=['confirmada', 'en_curso']
            ).exclude(id_reserva=diseno.reserva.id_reserva).values_list('id_reserva', flat=True)
            
            # Obtener empleados ya ocupados en esa fecha
            empleados_ocupados = ReservaEmpleado.objects.filter(
                reserva__in=reservas_en_fecha,
                rol='operador'
            ).values_list('empleado_id', flat=True)
            
            # Obtener empleados disponibles
            empleados_disponibles = Empleado.objects.exclude(
                id_empleado__in=empleados_ocupados
            ).select_related('persona')
            
            # Asignar hasta 2 empleados como operadores
            empleados_asignados = []
            for empleado in empleados_disponibles[:2]:
                asignacion, created = ReservaEmpleado.objects.get_or_create(
                    reserva=diseno.reserva,
                    empleado=empleado,
                    defaults={
                        'rol': 'operador',
                        'notas': 'Asignado automáticamente al aceptar el diseño'
                    }
                )
                if created:
                    empleados_asignados.append({
                        'nombre': f"{empleado.persona.nombre} {empleado.persona.apellido}",
                        'email': empleado.persona.email
                    })
            
            mensaje = 'Diseño aceptado exitosamente. Stock descontado.'
            if empleados_asignados:
                mensaje += f' Se asignaron {len(empleados_asignados)} empleado(s) automáticamente.'
        else:
            mensaje = 'Diseño aceptado exitosamente. Stock descontado.'
            empleados_asignados = []
        
        serializer = self.get_serializer(diseno)
        return Response({
            'message': mensaje,
            'diseno': serializer.data,
            'empleados_asignados': empleados_asignados
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def rechazar_cliente(self, request, pk=None):
        """
        Rechazar el diseño desde el cliente.
        - Cambia estado del diseño a 'rechazado'
        - Cambia estado de la reserva a 'pendiente' o 'cancelada' según lo indique el cliente
        - Guarda feedback del cliente
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
        cancelar_servicio = request.data.get('cancelar_servicio', False)
        
        # Guardar feedback en observaciones_cliente
        if feedback:
            diseno.observaciones_cliente = feedback
        
        # Rechazar el diseño con el feedback
        diseno.rechazar(feedback)
        
        # Cambiar estado de la reserva según lo que decida el cliente
        if diseno.reserva:
            if cancelar_servicio:
                diseno.reserva.estado = 'cancelada'
                mensaje = 'Diseño rechazado y servicio cancelado.'
            else:
                diseno.reserva.estado = 'pendiente'
                mensaje = 'Diseño rechazado. La reserva volvió a estado pendiente para un nuevo diseño.'
            diseno.reserva.save()
        else:
            mensaje = 'Diseño rechazado exitosamente.'
        
        serializer = self.get_serializer(diseno)
        return Response({
            'message': mensaje,
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
