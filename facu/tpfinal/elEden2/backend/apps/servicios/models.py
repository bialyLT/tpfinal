from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal
import uuid


class ConfiguracionPago(models.Model):
    """Configuración del monto de seña para reservas"""
    monto_sena = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('50.00'),
        validators=[MinValueValidator(Decimal('0'))],
        help_text='Monto de seña requerido para realizar una reserva'
    )
    porcentaje_sena = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        help_text='Porcentaje de seña sobre el total (0 para usar monto fijo)'
    )
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    actualizado_por = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='configuraciones_pago'
    )
    
    class Meta:
        verbose_name = 'Configuración de Pago'
        verbose_name_plural = 'Configuraciones de Pago'
        db_table = 'configuracion_pago'
    
    def __str__(self):
        if self.porcentaje_sena > 0:
            return f"Seña: {self.porcentaje_sena}% del total"
        return f"Seña: ${self.monto_sena}"
    
    @classmethod
    def obtener_configuracion(cls):
        """Obtiene la configuración activa o crea una por defecto"""
        config, created = cls.objects.get_or_create(
            pk=1,
            defaults={'monto_sena': Decimal('50.00')}
        )
        return config
    
    def calcular_sena(self, monto_total=None):
        """
        Calcula el monto de seña según configuración.
        - Si no hay monto_total (reserva inicial): usa monto fijo
        - Si hay monto_total y porcentaje_sena > 0: calcula porcentaje
        - Si hay monto_total y porcentaje_sena = 0: usa monto fijo
        """
        if self.porcentaje_sena > 0 and monto_total and monto_total > 0:
            return (monto_total * self.porcentaje_sena / Decimal('100')).quantize(Decimal('0.01'))
        return self.monto_sena


class Servicio(models.Model):
    """Modelo para servicios según diagrama ER"""
    
    id_servicio = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    reprogramable_por_clima = models.BooleanField(
        default=True,
        help_text='Indica si este servicio puede reagendarse automáticamente ante mal clima'
    )

    class Meta:
        verbose_name = 'Servicio'
        verbose_name_plural = 'Servicios'
        db_table = 'servicio'
        ordering = ['nombre']
        indexes = [
            models.Index(fields=['nombre']),
            models.Index(fields=['activo']),
        ]

    def __str__(self):
        return self.nombre


class Reserva(models.Model):
    """Modelo para reservas de servicios según diagrama ER"""
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('confirmada', 'Confirmada'),
        ('en_curso', 'En Curso'),
        ('completada', 'Completada'),
        ('cancelada', 'Cancelada'),
    ]
    
    ESTADO_PAGO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('pendiente_pago_sena', 'Pendiente de Pago de Seña'),  # Reserva creada pero sin pago
        ('sena_pagada', 'Seña Pagada'),
        ('pagado', 'Pagado Completamente'),
        ('rechazado', 'Rechazado'),
        ('cancelado', 'Cancelado'),
    ]

    # Nuevas opciones para el flujo de solicitud mejorado
    TIPO_SERVICIO_SOLICITADO_CHOICES = [
        ('diseno_completo', 'Diseño Completo de Jardín'),
        ('consulta_express', 'Consulta Express / Idea Preliminar'),
    ]

    OBJETIVO_DISENO_CHOICES = [
        ('bajo_mantenimiento', 'Bajo Mantenimiento'),
        ('mucho_color', 'Mucho Color'),
        ('selvatico', 'Estilo Selvático'),
        ('minimalista', 'Estilo Minimalista'),
        ('mascotas', 'Espacio para Mascotas'),
        ('ninos', 'Espacio para Niños'),
        ('huerta', 'Huerta'),
        ('otro', 'Otro'),
    ]

    NIVEL_INTERVENCION_CHOICES = [
        ('remodelacion', 'Remodelación Parcial'),
        ('desde_cero', 'Diseño Completo desde Cero'),
    ]

    PRESUPUESTO_CHOICES = [
        ('bajo', 'Económico / Ajustado'),
        ('medio', 'Intermedio / Flexible'),
        ('alto', 'Premium / Sin Restricciones'),
    ]

    id_reserva = models.AutoField(primary_key=True)
    fecha_reserva = models.DateTimeField()
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    observaciones = models.TextField(blank=True, null=True)
    direccion = models.CharField(max_length=500, blank=True, null=True, help_text='Dirección donde se realizará el servicio')
    
    # Nuevos campos estructurados para la solicitud
    tipo_servicio_solicitado = models.CharField(
        max_length=50, 
        choices=TIPO_SERVICIO_SOLICITADO_CHOICES,
        default='consulta_express',
        help_text='Tipo de servicio seleccionado por el cliente'
    )
    superficie_aproximada = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text='Superficie aproximada en m2'
    )
    objetivo_diseno = models.CharField(
        max_length=50,
        choices=OBJETIVO_DISENO_CHOICES,
        null=True,
        blank=True,
        help_text='Objetivo principal del diseño'
    )
    nivel_intervencion = models.CharField(
        max_length=50,
        choices=NIVEL_INTERVENCION_CHOICES,
        null=True,
        blank=True,
        help_text='Nivel de intervención requerido'
    )
    presupuesto_aproximado = models.CharField(
        max_length=50,
        choices=PRESUPUESTO_CHOICES,
        null=True,
        blank=True,
        help_text='Rango de presupuesto estimado por el cliente'
    )
    
    # Campos de pago simplificados - MercadoPago.js manejará el frontend
    monto_sena = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        help_text='Monto de seña para confirmar la reserva'
    )
    estado_pago_sena = models.CharField(
        max_length=20,
        choices=ESTADO_PAGO_CHOICES,
        default='pendiente',
        help_text='Estado del pago de seña'
    )
    payment_id_sena = models.CharField(
        max_length=200, 
        blank=True, 
        null=True,
        help_text='ID de pago de MercadoPago para la seña'
    )
    fecha_pago_sena = models.DateTimeField(blank=True, null=True)
    
    # Campos de pago final
    monto_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        help_text='Monto total del servicio'
    )
    monto_final = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        help_text='Monto final a pagar (total - seña)'
    )
    estado_pago_final = models.CharField(
        max_length=20,
        choices=ESTADO_PAGO_CHOICES,
        default='pendiente',
        help_text='Estado del pago final'
    )
    payment_id_final = models.CharField(
        max_length=200, 
        blank=True, 
        null=True,
        help_text='ID de pago de MercadoPago para el pago final'
    )
    fecha_pago_final = models.DateTimeField(blank=True, null=True)
    
    # Campo de pago general (para compatibilidad)
    estado_pago = models.CharField(max_length=20, choices=ESTADO_PAGO_CHOICES, default='pendiente')
    
    # Relaciones según diagrama ER
    cliente = models.ForeignKey(
        'users.Cliente',
        on_delete=models.PROTECT,
        related_name='reservas'
    )
    servicio = models.ForeignKey(
        Servicio,
        on_delete=models.PROTECT,
        related_name='reservas'
    )
    empleados = models.ManyToManyField(
        'users.Empleado',
        through='ReservaEmpleado',
        related_name='reservas_asignadas',
        blank=True
    )
    weather_alert = models.ForeignKey(
        'weather.WeatherAlert',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reservas_afectadas'
    )
    localidad_servicio = models.ForeignKey(
        'users.Localidad',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reservas_programadas',
        help_text='Localidad donde se realizará el servicio'
    )
    requiere_reprogramacion = models.BooleanField(default=False)
    motivo_reprogramacion = models.CharField(max_length=255, blank=True, null=True)
    fecha_reprogramada_sugerida = models.DateTimeField(null=True, blank=True)
    fecha_reprogramada_confirmada = models.DateTimeField(null=True, blank=True)
    alerta_clima_payload = models.JSONField(default=dict, blank=True)
    reprogramacion_fuente = models.CharField(max_length=50, blank=True, null=True)
    
    # Metadatos
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    # Token único para acceso público a encuesta de satisfacción (link por email)
    # Token único para acceso público a encuesta de satisfacción (link por email)
    encuesta_token = models.UUIDField(unique=True, null=True, blank=True, help_text='Token público para responder la encuesta de la reserva')
    
    # Fecha real de finalización del servicio
    fecha_realizacion = models.DateTimeField(null=True, blank=True, help_text='Fecha y hora real en que se completó el servicio')

    class Meta:
        verbose_name = 'Reserva'
        verbose_name_plural = 'Reservas'
        db_table = 'reserva'
        ordering = ['-fecha_reserva']
        indexes = [
            models.Index(fields=['fecha_reserva']),
            models.Index(fields=['estado']),
            models.Index(fields=['cliente']),
        ]

    def __str__(self):
        return f"Reserva {self.id_reserva} - {self.cliente.persona.nombre_completo} - {self.servicio.nombre}"
    
    def calcular_monto_final(self):
        """Calcula el monto final a pagar (total - seña)"""
        if self.monto_total > 0:
            self.monto_final = max(Decimal('0'), self.monto_total - self.monto_sena)
        else:
            self.monto_final = Decimal('0')
        return self.monto_final
    
    def asignar_sena(self):
        """
        Asigna el monto de seña según configuración.
        - En creación de reserva (sin monto_total): usa monto fijo
        - Cuando se define monto_total: recalcula si es porcentaje
        """
        config = ConfiguracionPago.obtener_configuracion()
        # Si no hay monto_total o es 0, siempre usa monto fijo
        if not self.monto_total or self.monto_total == 0:
            self.monto_sena = config.monto_sena
        else:
            # Si hay monto_total, usa calcular_sena (que puede ser fijo o porcentaje)
            self.monto_sena = config.calcular_sena(self.monto_total)
        self.calcular_monto_final()

    def confirmar(self):
        """Confirmar la reserva"""
        self.estado = 'confirmada'
        self.save()

    def cancelar(self):
        """Cancelar la reserva"""
        self.estado = 'cancelada'
        self.save()

    def iniciar(self):
        """Marcar reserva como en curso"""
        self.estado = 'en_curso'
        self.save()

    def completar(self):
        """Marcar reserva como completada"""
        self.estado = 'completada'
        self.save()

    def generate_encuesta_token(self, force: bool = False) -> uuid.UUID:
        """
        Genera y asigna un token único para la encuesta si no existe o si force=True.
        Devuelve el token asignado.
        """
        if force or not self.encuesta_token:
            self.encuesta_token = uuid.uuid4()
            # Guardamos solo este campo para no modificar otros timestamps innecesariamente
            self.save(update_fields=['encuesta_token'])
        return self.encuesta_token

    def marcar_alerta_climatica(self, alerta, sugerencia=None):
        self.weather_alert = alerta
        self.alerta_clima_payload = alerta.payload or {}
        if self.servicio.reprogramable_por_clima:
            self.requiere_reprogramacion = True
            self.motivo_reprogramacion = 'Clima: lluvia pronosticada'
            self.fecha_reprogramada_sugerida = sugerencia
            self.reprogramacion_fuente = 'clima'
        self.save(update_fields=[
            'weather_alert',
            'alerta_clima_payload',
            'requiere_reprogramacion',
            'motivo_reprogramacion',
            'fecha_reprogramada_sugerida',
            'reprogramacion_fuente'
        ])

    def aplicar_reprogramacion(self, nueva_fecha, motivo='clima', confirmar=False):
        update_fields = ['fecha_reprogramada_sugerida', 'requiere_reprogramacion', 'motivo_reprogramacion', 'reprogramacion_fuente']
        self.fecha_reprogramada_sugerida = nueva_fecha
        self.reprogramacion_fuente = motivo
        self.motivo_reprogramacion = motivo

        if confirmar:
            self.fecha_reserva = nueva_fecha
            self.fecha_reprogramada_confirmada = nueva_fecha
            self.requiere_reprogramacion = False
            update_fields.extend(['fecha_reserva', 'fecha_reprogramada_confirmada'])
        else:
            self.fecha_reprogramada_confirmada = None
            self.requiere_reprogramacion = True
            update_fields.append('fecha_reprogramada_confirmada')

        self.save(update_fields=update_fields)


class ReservaEmpleado(models.Model):
    """Tabla intermedia para asignar empleados a reservas (relación muchos a muchos)"""
    ROL_CHOICES = [
        ('responsable', 'Responsable'),
        ('operador', 'Operador'),
        ('diseñador', 'Diseñador'),
        ('asistente', 'Asistente'),
    ]
    
    id_reserva_empleado = models.AutoField(primary_key=True)
    reserva = models.ForeignKey(
        Reserva,
        on_delete=models.CASCADE,
        related_name='asignaciones'
    )
    empleado = models.ForeignKey(
        'users.Empleado',
        on_delete=models.CASCADE,
        related_name='asignaciones_servicios'
    )
    rol = models.CharField(
        max_length=20,
        choices=ROL_CHOICES,
        default='asistente',
        help_text="Rol del empleado en esta reserva"
    )
    fecha_asignacion = models.DateTimeField(auto_now_add=True)
    notas = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Asignación de Empleado'
        verbose_name_plural = 'Asignaciones de Empleados'
        db_table = 'reserva_empleado'
        unique_together = [['reserva', 'empleado']]  # Un empleado no puede estar asignado dos veces a la misma reserva
        ordering = ['-fecha_asignacion']
    
    def __str__(self):
        return f"{self.empleado.persona.nombre_completo} - {self.reserva.servicio.nombre} ({self.rol})"


class FormaTerreno(models.Model):
    """Formas de terreno configurables en admin"""
    id_forma = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name = 'Forma de Terreno'
        verbose_name_plural = 'Formas de Terreno'
        db_table = 'forma_terreno'

    def __str__(self):
        return self.nombre


class Jardin(models.Model):
    """Jardín asociado a una reserva"""
    id_jardin = models.AutoField(primary_key=True)
    reserva = models.OneToOneField(Reserva, on_delete=models.CASCADE, related_name='jardin')
    descripcion = models.TextField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Jardín'
        verbose_name_plural = 'Jardines'
        db_table = 'jardin'
        indexes = [models.Index(fields=['reserva'])]

    def __str__(self):
        return f"Jardín Reserva #{self.reserva.id_reserva}"


class ZonaJardin(models.Model):
    """Zonas dentro de un jardín e.g., 'Cantero', 'Verde', 'Huerta'"""
    id_zona = models.AutoField(primary_key=True)
    jardin = models.ForeignKey(Jardin, on_delete=models.CASCADE, related_name='zonas')
    nombre = models.CharField(max_length=120, blank=True, null=True)
    ancho = models.DecimalField(max_digits=8, decimal_places=2)
    largo = models.DecimalField(max_digits=8, decimal_places=2)
    forma = models.ForeignKey(FormaTerreno, on_delete=models.SET_NULL, null=True, blank=True, related_name='zonas')
    notas = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = 'Zona de Jardín'
        verbose_name_plural = 'Zonas de Jardín'
        db_table = 'zona_jardin'
        indexes = [models.Index(fields=['jardin']), models.Index(fields=['nombre'])]

    def __str__(self):
        return self.nombre or f"Zona #{self.id_zona} - Jardín {self.jardin.id_jardin}"


class ImagenZona(models.Model):
    """Imágenes asociadas a una zona específica del jardín"""
    id_imagen_zona = models.AutoField(primary_key=True)
    zona = models.ForeignKey(ZonaJardin, on_delete=models.CASCADE, related_name='imagenes')
    imagen = models.ImageField(upload_to='zonas/%Y/%m/', help_text='Imagen de la zona')
    descripcion = models.CharField(max_length=200, blank=True, null=True, help_text='Descripción de la imagen')
    orden = models.IntegerField(default=0, help_text='Orden de visualización de la imagen')
    fecha_subida = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Imagen de Zona'
        verbose_name_plural = 'Imágenes de Zona'
        db_table = 'imagen_zona'
        indexes = [models.Index(fields=['zona']), models.Index(fields=['orden'])]

    def __str__(self):
        return f"Imagen {self.orden} - Zona {self.zona.id_zona}"


class Diseno(models.Model):
    """Modelo para diseños/propuestas de jardines"""
    ESTADO_CHOICES = [
        ('borrador', 'Borrador'),
        ('presentado', 'Presentado al cliente'),
        ('aceptado', 'Aceptado'),
        ('rechazado', 'Rechazado'),
        ('revision', 'En revisión'),
    ]
    
    id_diseno = models.AutoField(primary_key=True)
    titulo = models.CharField(max_length=200, help_text="Título del diseño")
    descripcion = models.TextField(blank=True, null=True, help_text="Descripción detallada del diseño propuesto")
    presupuesto = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Presupuesto total del diseño"
    )
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='borrador'
    )
    
    # Relaciones
    reserva = models.ForeignKey(
        Reserva,
        on_delete=models.CASCADE,
        related_name='disenos',
        help_text="Reserva a la que pertenece este diseño",
        null=True,
        blank=True
    )
    servicio = models.ForeignKey(
        Servicio,
        on_delete=models.CASCADE,
        related_name='disenos',
        help_text="Servicio al que pertenece este diseño"
    )
    disenador = models.ForeignKey(
        'users.Empleado',
        on_delete=models.PROTECT,
        related_name='disenos_creados',
        help_text="Empleado/diseñador que creó el diseño",
        null=True,
        blank=True
    )
    
    # Fechas
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_presentacion = models.DateTimeField(null=True, blank=True)
    fecha_respuesta = models.DateTimeField(null=True, blank=True)
    fecha_propuesta = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha propuesta para realizar el servicio"
    )
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    # Observaciones
    observaciones_cliente = models.TextField(
        blank=True,
        null=True,
        help_text="Comentarios del cliente sobre el diseño"
    )
    notas_internas = models.TextField(
        blank=True,
        null=True,
        help_text="Notas internas del diseñador"
    )
    
    class Meta:
        verbose_name = 'Diseño'
        verbose_name_plural = 'Diseños'
        db_table = 'diseno'
        ordering = ['-fecha_creacion']
        indexes = [
            models.Index(fields=['estado']),
            models.Index(fields=['servicio']),
            models.Index(fields=['fecha_creacion']),
        ]
    
    def __str__(self):
        return f"{self.titulo} - {self.get_estado_display()}"
    
    def presentar(self):
        """Marcar el diseño como presentado al cliente"""
        self.estado = 'presentado'
        self.fecha_presentacion = timezone.now()
        self.save()
        
        # Actualizar estado de la reserva si existe
        if self.reserva:
            self.reserva.estado = 'confirmada'
            self.reserva.save()
    
    def aceptar(self, observaciones=None):
        """
        Aceptar el diseño.
        Al aceptar, el cliente deberá pagar el monto final (total - seña).
        """
        self.estado = 'aceptado'
        self.fecha_respuesta = timezone.now()
        if observaciones:
            self.observaciones_cliente = observaciones
        self.save()
        
        # Actualizar reserva si existe
        if self.reserva:
            # Asignar el monto total del presupuesto a la reserva
            if self.presupuesto and self.presupuesto > 0:
                self.reserva.monto_total = self.presupuesto
                self.reserva.calcular_monto_final()
                self.reserva.save()
            
            # El pago final se procesará cuando el cliente haga el pago
            # La reserva se confirmará cuando el pago final sea aprobado
    
    def rechazar(self, observaciones=None):
        """Rechazar el diseño"""
        self.estado = 'rechazado'
        self.fecha_respuesta = timezone.now()
        if observaciones:
            self.observaciones_cliente = observaciones
        self.save()
    
    def solicitar_revision(self, observaciones):
        """Solicitar revisión del diseño"""
        self.estado = 'revision'
        self.observaciones_cliente = observaciones
        self.save()


class DisenoProducto(models.Model):
    """Tabla intermedia para productos incluidos en un diseño"""
    id_diseno_producto = models.AutoField(primary_key=True)
    
    diseno = models.ForeignKey(
        Diseno,
        on_delete=models.CASCADE,
        related_name='productos'
    )
    producto = models.ForeignKey(
        'productos.Producto',
        on_delete=models.PROTECT,
        related_name='disenos'
    )
    cantidad = models.IntegerField(
        validators=[MinValueValidator(1)],
        default=1,
        help_text="Cantidad del producto en el diseño"
    )
    precio_unitario = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Precio unitario del producto al momento de crear el diseño"
    )
    notas = models.TextField(
        blank=True,
        null=True,
        help_text="Notas sobre el uso del producto en el diseño"
    )
    
    class Meta:
        verbose_name = 'Producto del Diseño'
        verbose_name_plural = 'Productos del Diseño'
        db_table = 'diseno_producto'
        unique_together = ['diseno', 'producto']
        indexes = [
            models.Index(fields=['diseno']),
            models.Index(fields=['producto']),
        ]
    
    def __str__(self):
        return f"{self.producto.nombre} x{self.cantidad} - {self.diseno.titulo}"
    
    @property
    def subtotal(self):
        """Calcular subtotal del producto"""
        return self.cantidad * self.precio_unitario


class ImagenDiseno(models.Model):
    """Modelo para las imágenes de un diseño"""
    id_imagen_diseno = models.AutoField(primary_key=True)
    
    diseno = models.ForeignKey(
        Diseno,
        on_delete=models.CASCADE,
        related_name='imagenes'
    )
    imagen = models.ImageField(
        upload_to='disenos/%Y/%m/',
        help_text="Imagen del diseño"
    )
    descripcion = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="Descripción de la imagen"
    )
    orden = models.IntegerField(
        default=0,
        help_text="Orden de visualización de la imagen"
    )
    fecha_subida = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Imagen de Diseño'
        verbose_name_plural = 'Imágenes de Diseño'
        db_table = 'imagen_diseno'
        ordering = ['orden', 'fecha_subida']
        indexes = [
            models.Index(fields=['diseno']),
            models.Index(fields=['orden']),
        ]
    
    def __str__(self):
        return f"Imagen {self.orden} - {self.diseno.titulo}"


class ImagenReserva(models.Model):
    """Modelo para las imágenes asociadas a una reserva (jardín e ideas)"""
    TIPO_IMAGEN_CHOICES = [
        ('jardin', 'Jardín Actual'),
        ('ideas', 'Ideas y Referencias'),
    ]
    
    id_imagen_reserva = models.AutoField(primary_key=True)
    
    reserva = models.ForeignKey(
        Reserva,
        on_delete=models.CASCADE,
        related_name='imagenes'
    )
    imagen = models.ImageField(
        upload_to='reservas/%Y/%m/',
        help_text="Imagen del jardín o idea de referencia"
    )
    tipo_imagen = models.CharField(
        max_length=20,
        choices=TIPO_IMAGEN_CHOICES,
        default='jardin',
        help_text="Tipo de imagen: jardín actual o ideas"
    )
    descripcion = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="Descripción de la imagen"
    )
    fecha_subida = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Imagen de Reserva'
        verbose_name_plural = 'Imágenes de Reserva'
        db_table = 'imagen_reserva'
        ordering = ['fecha_subida']
        indexes = [
            models.Index(fields=['reserva']),
            models.Index(fields=['tipo_imagen']),
        ]
    
    def __str__(self):
        return f"Imagen {self.tipo_imagen} - Reserva {self.reserva.id_reserva}"
