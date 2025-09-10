from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.utils import timezone


class TipoServicio(models.Model):
    """Tipos de servicios disponibles"""
    CATEGORIA_CHOICES = [
        ('mantenimiento', 'Mantenimiento'),
        ('consultoria', 'Consultoría'),
    ]

    nombre = models.CharField(max_length=100)
    categoria = models.CharField(max_length=20, choices=CATEGORIA_CHOICES)
    descripcion = models.TextField()
    precio_base = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    duracion_estimada_horas = models.IntegerField(
        validators=[MinValueValidator(1)],
        help_text="Duración estimada en horas"
    )
    requiere_diseño = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Tipo de Servicio'
        verbose_name_plural = 'Tipos de Servicio'
        ordering = ['categoria', 'nombre']

    def __str__(self):
        return f"{self.nombre} ({self.get_categoria_display()})"


class SolicitudServicio(models.Model):
    """Solicitudes de servicio de los clientes"""
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente de Revisión'),
        ('en_diseño', 'En Diseño'),
        ('diseño_enviado', 'Diseño Enviado'),
        ('revision_diseño', 'En Revisión de Diseño'),
        ('aprobado', 'Diseño Aprobado'),
        ('rechazado', 'Diseño Rechazado'),
        ('cancelado', 'Cancelado'),
    ]

    PRIORIDAD_CHOICES = [
        ('baja', 'Baja'),
        ('media', 'Media'),
        ('alta', 'Alta'),
        ('urgente', 'Urgente'),
    ]

    # Información básica
    numero_solicitud = models.CharField(max_length=20, unique=True, editable=False)
    cliente = models.ForeignKey(User, on_delete=models.CASCADE, related_name='solicitudes_servicio')
    tipo_servicio = models.ForeignKey(TipoServicio, on_delete=models.PROTECT, related_name='solicitudes')
    
    # Detalles de la solicitud
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(help_text="Descripción detallada de lo que necesita")
    area_aproximada = models.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Área en metros cuadrados"
    )
    presupuesto_maximo = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0)]
    )
    
    # Ubicación del servicio
    direccion_servicio = models.CharField(max_length=300)
    ciudad_servicio = models.CharField(max_length=100)
    provincia_servicio = models.CharField(max_length=100)
    
    # Estado y seguimiento
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    prioridad = models.CharField(max_length=10, choices=PRIORIDAD_CHOICES, default='media')
    diseñador_asignado = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='solicitudes_asignadas',
        limit_choices_to={'groups__name__icontains': 'diseñador'}
    )
    
    # Fechas importantes
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    fecha_asignacion = models.DateTimeField(null=True, blank=True)
    fecha_limite_diseño = models.DateTimeField(null=True, blank=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    # Observaciones
    observaciones_cliente = models.TextField(blank=True, null=True)
    observaciones_internas = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = 'Solicitud de Servicio'
        verbose_name_plural = 'Solicitudes de Servicio'
        ordering = ['-fecha_solicitud']
        indexes = [
            models.Index(fields=['numero_solicitud']),
            models.Index(fields=['cliente', 'estado']),
            models.Index(fields=['diseñador_asignado']),
        ]

    def __str__(self):
        return f"{self.numero_solicitud} - {self.titulo}"

    def save(self, *args, **kwargs):
        if not self.numero_solicitud:
            import uuid
            self.numero_solicitud = f"SOL-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    @property
    def dias_desde_solicitud(self):
        """Días transcurridos desde la solicitud"""
        return (timezone.now() - self.fecha_solicitud).days

    def asignar_diseñador(self, diseñador):
        """Asignar un diseñador a la solicitud"""
        self.diseñador_asignado = diseñador
        self.fecha_asignacion = timezone.now()
        self.estado = 'en_diseño'
        # Calcular fecha límite (por ejemplo, 5 días hábiles)
        import datetime
        self.fecha_limite_diseño = timezone.now() + datetime.timedelta(days=5)
        self.save()


class ImagenSolicitud(models.Model):
    """Imágenes adjuntas a las solicitudes"""
    solicitud = models.ForeignKey(SolicitudServicio, on_delete=models.CASCADE, related_name='imagenes')
    imagen = models.ImageField(upload_to='solicitudes/')
    descripcion = models.CharField(max_length=200, blank=True, null=True)
    fecha_subida = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Imagen de Solicitud'
        verbose_name_plural = 'Imágenes de Solicitud'
        ordering = ['fecha_subida']

    def __str__(self):
        return f"Imagen de {self.solicitud.numero_solicitud}"


class PropuestaDiseño(models.Model):
    """Propuestas de diseño enviadas por diseñadores"""
    ESTADO_CHOICES = [
        ('borrador', 'Borrador'),
        ('enviado', 'Enviado al Cliente'),
        ('aprobado', 'Aprobado'),
        ('rechazado', 'Rechazado'),
        ('revision', 'En Revisión'),
    ]

    solicitud = models.ForeignKey(SolicitudServicio, on_delete=models.CASCADE, related_name='propuestas')
    diseñador = models.ForeignKey(User, on_delete=models.CASCADE, related_name='propuestas_diseño')
    version = models.IntegerField(default=1)
    
    # Contenido de la propuesta
    titulo = models.CharField(max_length=200)
    descripcion_diseño = models.TextField()
    presupuesto_estimado = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    tiempo_ejecucion_dias = models.IntegerField(validators=[MinValueValidator(1)])
    
    # Archivos de diseño
    archivo_diseño = models.FileField(upload_to='diseños/', blank=True, null=True)
    imagen_renderizado = models.ImageField(upload_to='renderizados/', blank=True, null=True)
    
    # Estado y fechas
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='borrador')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_envio = models.DateTimeField(null=True, blank=True)
    fecha_respuesta_cliente = models.DateTimeField(null=True, blank=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    # Feedback del cliente
    comentarios_cliente = models.TextField(blank=True, null=True)
    motivo_rechazo = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = 'Propuesta de Diseño'
        verbose_name_plural = 'Propuestas de Diseño'
        ordering = ['-fecha_creacion']
        unique_together = ['solicitud', 'version']

    def __str__(self):
        return f"Propuesta v{self.version} - {self.solicitud.numero_solicitud}"

    def enviar_al_cliente(self):
        """Enviar propuesta al cliente"""
        self.estado = 'enviado'
        self.fecha_envio = timezone.now()
        self.solicitud.estado = 'diseño_enviado'
        self.solicitud.save()
        self.save()

    def aprobar(self, comentarios=None):
        """Aprobar propuesta"""
        self.estado = 'aprobado'
        self.fecha_respuesta_cliente = timezone.now()
        if comentarios:
            self.comentarios_cliente = comentarios
        self.solicitud.estado = 'aprobado'
        self.solicitud.save()
        self.save()

    def rechazar(self, motivo):
        """Rechazar propuesta"""
        self.estado = 'rechazado'
        self.fecha_respuesta_cliente = timezone.now()
        self.motivo_rechazo = motivo
        self.solicitud.estado = 'revision_diseño'
        self.solicitud.save()
        self.save()


class Servicio(models.Model):
    """Servicios confirmados y en ejecución"""
    ESTADO_CHOICES = [
        ('programado', 'Programado'),
        ('en_curso', 'En Curso'),
        ('pausado', 'Pausado'),
        ('completado', 'Completado'),
        ('cancelado', 'Cancelado'),
    ]

    # Relaciones principales
    numero_servicio = models.CharField(max_length=20, unique=True, editable=False)
    solicitud = models.OneToOneField(SolicitudServicio, on_delete=models.CASCADE, related_name='servicio')
    propuesta_aprobada = models.ForeignKey(PropuestaDiseño, on_delete=models.PROTECT, related_name='servicios')
    cliente = models.ForeignKey(User, on_delete=models.CASCADE, related_name='servicios')
    pago = models.OneToOneField('users.Pago', on_delete=models.PROTECT, related_name='servicio', null=True, blank=True)
    
    # Información del servicio
    fecha_programada = models.DateTimeField()
    fecha_inicio_real = models.DateTimeField(null=True, blank=True)
    fecha_finalizacion_real = models.DateTimeField(null=True, blank=True)
    
    # Estado y seguimiento
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='programado')
    progreso_porcentaje = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    
    # Observaciones y notas
    observaciones_ejecucion = models.TextField(blank=True, null=True)
    observaciones_finalizacion = models.TextField(blank=True, null=True)
    
    # Metadatos
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Servicio'
        verbose_name_plural = 'Servicios'
        ordering = ['-fecha_programada']
        indexes = [
            models.Index(fields=['numero_servicio']),
            models.Index(fields=['cliente', 'estado']),
            models.Index(fields=['fecha_programada']),
        ]

    def __str__(self):
        return f"{self.numero_servicio} - {self.solicitud.titulo}"

    def save(self, *args, **kwargs):
        if not self.numero_servicio:
            import uuid
            self.numero_servicio = f"SER-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def iniciar_servicio(self):
        """Marcar servicio como iniciado"""
        self.estado = 'en_curso'
        self.fecha_inicio_real = timezone.now()
        self.save()

    def finalizar_servicio(self, observaciones=None):
        """Marcar servicio como completado"""
        self.estado = 'completado'
        self.fecha_finalizacion_real = timezone.now()
        self.progreso_porcentaje = 100
        if observaciones:
            self.observaciones_finalizacion = observaciones
        self.save()

    @property
    def duracion_real(self):
        """Duración real del servicio en horas"""
        if self.fecha_inicio_real and self.fecha_finalizacion_real:
            delta = self.fecha_finalizacion_real - self.fecha_inicio_real
            return delta.total_seconds() / 3600
        return None

    @property
    def esta_atrasado(self):
        """Verifica si el servicio está atrasado"""
        if self.estado not in ['completado', 'cancelado']:
            return timezone.now() > self.fecha_programada
        return False


class EmpleadoDisponibilidad(models.Model):
    """Disponibilidad de empleados para servicios"""
    TIPO_DISPONIBILIDAD_CHOICES = [
        ('disponible', 'Disponible'),
        ('ocupado', 'Ocupado'),
        ('vacaciones', 'Vacaciones'),
        ('licencia', 'Licencia'),
        ('baja_medica', 'Baja Médica'),
    ]

    empleado = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='disponibilidades',
        limit_choices_to={'groups__name__icontains': 'empleado'}
    )
    fecha = models.DateField()
    estado = models.CharField(max_length=20, choices=TIPO_DISPONIBILIDAD_CHOICES, default='disponible')
    horas_disponibles = models.IntegerField(default=8, validators=[MinValueValidator(0)])
    observaciones = models.TextField(blank=True, null=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Disponibilidad de Empleado'
        verbose_name_plural = 'Disponibilidades de Empleados'
        unique_together = ['empleado', 'fecha']
        ordering = ['fecha', 'empleado__username']

    def __str__(self):
        return f"{self.empleado.username} - {self.fecha} ({self.get_estado_display()})"

    @property
    def esta_disponible(self):
        return self.estado == 'disponible' and self.horas_disponibles > 0


class AsignacionEmpleado(models.Model):
    """Asignación de empleados a servicios"""
    servicio = models.ForeignKey(Servicio, on_delete=models.CASCADE, related_name='asignaciones')
    empleado = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='asignaciones_servicio',
        limit_choices_to={'groups__name__icontains': 'empleado'}
    )
    rol_en_servicio = models.CharField(max_length=100, default='Ejecutor')
    fecha_asignacion = models.DateTimeField(auto_now_add=True)
    es_responsable = models.BooleanField(default=False)
    observaciones = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = 'Asignación de Empleado'
        verbose_name_plural = 'Asignaciones de Empleados'
        unique_together = ['servicio', 'empleado']

    def __str__(self):
        return f"{self.empleado.username} - {self.servicio.numero_servicio}"


class ServicioProducto(models.Model):
    """Productos/materiales utilizados en un servicio"""
    servicio = models.ForeignKey(Servicio, on_delete=models.CASCADE, related_name='productos_utilizados')
    producto = models.ForeignKey('productos.Producto', on_delete=models.CASCADE, related_name='servicios_utilizados')
    cantidad_planificada = models.DecimalField(max_digits=10, decimal_places=3, validators=[MinValueValidator(0)])
    cantidad_utilizada = models.DecimalField(
        max_digits=10, 
        decimal_places=3, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    costo_total = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    fecha_asignacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Producto del Servicio'
        verbose_name_plural = 'Productos del Servicio'
        unique_together = ['servicio', 'producto']

    def __str__(self):
        return f"{self.producto.nombre} - {self.servicio.numero_servicio}"

    def save(self, *args, **kwargs):
        self.costo_total = self.cantidad_utilizada * self.precio_unitario
        super().save(*args, **kwargs)

    @property
    def diferencia_cantidad(self):
        """Diferencia entre cantidad planificada y utilizada"""
        return self.cantidad_utilizada - self.cantidad_planificada


class ActualizacionServicio(models.Model):
    """Actualizaciones de progreso del servicio"""
    servicio = models.ForeignKey(Servicio, on_delete=models.CASCADE, related_name='actualizaciones')
    empleado = models.ForeignKey(User, on_delete=models.CASCADE, related_name='actualizaciones_servicio')
    
    progreso_anterior = models.IntegerField()
    progreso_nuevo = models.IntegerField()
    descripcion = models.TextField()
    imagen_progreso = models.ImageField(upload_to='progreso_servicios/', blank=True, null=True)
    
    fecha_actualizacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Actualización de Servicio'
        verbose_name_plural = 'Actualizaciones de Servicio'
        ordering = ['-fecha_actualizacion']

    def __str__(self):
        return f"Actualización {self.servicio.numero_servicio} - {self.progreso_nuevo}%"
