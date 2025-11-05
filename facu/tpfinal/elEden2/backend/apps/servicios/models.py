from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone


class Servicio(models.Model):
    """Modelo para servicios según diagrama ER"""
    
    id_servicio = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

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

    id_reserva = models.AutoField(primary_key=True)
    fecha_reserva = models.DateTimeField()
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    observaciones = models.TextField(blank=True, null=True)
    direccion = models.CharField(max_length=500, blank=True, null=True, help_text='Dirección donde se realizará el servicio')
    
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
    
    # Metadatos
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

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
    descripcion = models.TextField(help_text="Descripción detallada del diseño propuesto")
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
        """Aceptar el diseño"""
        self.estado = 'aceptado'
        self.fecha_respuesta = timezone.now()
        if observaciones:
            self.observaciones_cliente = observaciones
        self.save()
        
        # Actualizar estado de la reserva si existe
        if self.reserva:
            self.reserva.estado = 'confirmada'
            self.reserva.save()
    
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
