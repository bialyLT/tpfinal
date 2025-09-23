from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.utils import timezone
from datetime import date, timedelta


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


class Diseño(models.Model):
    """Gestión de diseños para servicios que requieren diseño"""

    # Relación con servicio
    servicio = models.OneToOneField('Servicio', on_delete=models.CASCADE, related_name='diseño')
    
    # Información del diseño
    descripcion_tecnica = models.TextField(blank=True, null=True, help_text="Descripción técnica del diseño propuesto")
    descripcion_deseada = models.TextField(blank=True, null=True, help_text="Descripción deseada por el cliente")
    
    # Diseñador asignado
    diseñador_asignado = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='diseños_asignados',
        limit_choices_to={'perfil__tipo_usuario': 'diseñador'}
    )
    
    # Presupuesto y costos
    presupuesto = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0)]
    )
    
    # Fechas
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    # Retroalimentación del cliente
    motivo_rechazo = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = 'Diseño'
        verbose_name_plural = 'Diseños'
        ordering = ['-fecha_creacion']
        indexes = [
            models.Index(fields=['diseñador_asignado']),
            models.Index(fields=['servicio']),
            models.Index(fields=['fecha_creacion']),
        ]

    def __str__(self):
        return f"Diseño {self.servicio.numero_servicio} - {self.get_estado_display()}"

    def asignar_diseñador(self, diseñador):
        """Asignar diseñador y cambiar estado"""
        self.diseñador_asignado = diseñador
        self.save()


        # Actualizar servicio principal
        self.servicio.estado = 'aprobado'
        self.servicio.precio_final = self.presupuesto_final or self.presupuesto_estimado
        self.servicio.save()
        self.save()


class ImagenDiseño(models.Model):
    """Imágenes específicas para diseños"""

    diseño = models.ForeignKey(Diseño, on_delete=models.CASCADE, related_name='imagenes')
    imagen = models.ImageField(upload_to='diseños/')
    descripcion = models.CharField(max_length=200, blank=True, null=True)
    fecha_subida = models.DateTimeField(auto_now_add=True)
    subida_por = models.ForeignKey(User, on_delete=models.CASCADE, related_name='imagenes_diseño_subidas')

    class Meta:
        verbose_name = 'Imagen de Diseño'
        verbose_name_plural = 'Imágenes de Diseño'
        ordering = ['fecha_subida']

    def __str__(self):
        return f"Imagen de Diseño - Servicio {self.diseño.servicio.numero_servicio}"


class Servicio(models.Model):
    """Servicios desde solicitud hasta finalización"""
    ESTADO_CHOICES = [
        ('solicitud', 'Solicitud Inicial'),
        ('en_revision', 'En Revisión'),
        ('en_diseño', 'En Diseño'),
        ('diseño_enviado', 'Diseño Enviado'),
        ('revision_diseño', 'En Revisión de Diseño'),
        ('aprobado', 'Diseño Aprobado'),
        ('en_curso', 'En Ejecución'),
        ('pausado', 'Pausado'),
        ('completado', 'Completado'),
        ('cancelado', 'Cancelado'),
        ('rechazado', 'Rechazado'),
    ]

    # Información básica
    numero_servicio = models.CharField(max_length=20, unique=True, editable=False)
    cliente = models.ForeignKey(User, on_delete=models.CASCADE, related_name='servicios')
    tipo_servicio = models.ForeignKey(TipoServicio, on_delete=models.PROTECT, related_name='servicios')
    
    # Detalles de la solicitud inicial (solo información básica)
    notas_adicionales = models.TextField(blank=True, null=True, help_text="Notas adicionales del cliente")
    
    # Ubicación del servicio (obligatorio)
    direccion_servicio = models.CharField(max_length=300)
    # ciudad_servicio = models.CharField(max_length=100)
    # provincia_servicio = models.CharField(max_length=100)
    
    # Fecha propuesta por el cliente (debe estar dentro de fechas disponibles)
    fecha_preferida = models.DateTimeField(help_text="Fecha preferida por el cliente")
    fecha_inicio = models.DateTimeField(null=True, blank=True, help_text="Se establece cuando el diseño es aprobado")
    fecha_finalizacion = models.DateTimeField(null=True, blank=True, help_text="Se establece cuando el servicio termina")
    
    # Fechas de seguimiento
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    # Estado y seguimiento
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='solicitud')
    
    # Precio final del servicio
    precio_final = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Relación con pago
    pago = models.OneToOneField('users.Pago', on_delete=models.PROTECT, related_name='servicio', null=True, blank=True)

    class Meta:
        verbose_name = 'Servicio'
        verbose_name_plural = 'Servicios'
        ordering = ['-fecha_solicitud']
        indexes = [
            models.Index(fields=['numero_servicio']),
            models.Index(fields=['cliente', 'estado']),
            models.Index(fields=['fecha_preferida']),
        ]

    def __str__(self):
        return f"{self.numero_servicio} - Cliente: {self.cliente.username}"

    def save(self, *args, **kwargs):
        # Generar número de servicio si no existe
        if not self.numero_servicio:
            import uuid
            self.numero_servicio = f"SER-{uuid.uuid4().hex[:8].upper()}"
        
        # Manejar fechas según cambios de estado
        if self.pk:  # Si ya existe el servicio
            old_servicio = Servicio.objects.get(pk=self.pk)
            
            # Si cambia de 'revision_diseño' a 'aprobado', establecer fecha_inicio
            if old_servicio.estado == 'revision_diseño' and self.estado == 'aprobado':
                self.fecha_inicio = timezone.now()
            
            # Si cambia a estados finales, establecer fecha_finalizacion
            if self.estado in ['completado', 'cancelado', 'rechazado'] and not self.fecha_finalizacion:
                self.fecha_finalizacion = timezone.now()
        
        super().save(*args, **kwargs)
        
        # Crear diseño automáticamente si el tipo de servicio requiere diseño
        if not hasattr(self, 'diseño') and self.tipo_servicio.requiere_diseño:
            Diseño.objects.create(servicio=self)

    def requiere_diseño(self):
        """Verifica si el servicio requiere diseño"""
        return self.tipo_servicio.requiere_diseño

    def crear_diseño(self, descripcion_diseño):
        """Crear un diseño para este servicio"""
        if self.requiere_diseño() and not hasattr(self, 'diseño'):
            return Diseño.objects.create(
                servicio=self,
                descripcion_diseño=descripcion_diseño
            )
        return None

    def asignar_empleados_ejecutores(self, empleados_ids):
        """Asignar empleados ejecutores al servicio cuando se aprueba"""
        if self.estado == 'aprobado':
            for empleado_id in empleados_ids:
                empleado = User.objects.get(id=empleado_id)
                AsignacionEmpleado.objects.get_or_create(
                    servicio=self,
                    empleado=empleado,
                    defaults={'rol_en_servicio': 'Ejecutor'}
                )

    def iniciar_servicio(self, empleados_ejecutores_ids=None):
        """Marcar servicio como iniciado y asignar empleados ejecutores"""
        self.estado = 'en_curso'
        if not self.fecha_inicio:
            self.fecha_inicio = timezone.now()
        self.save()
        
        # Asignar empleados ejecutores si se proporcionan
        if empleados_ejecutores_ids:
            self.asignar_empleados_ejecutores(empleados_ejecutores_ids)

    def get_empleados_ejecutores_asignados(self):
        """Obtener empleados ejecutores asignados activos"""
        return User.objects.filter(
            asignaciones_servicio__servicio=self
        ).distinct()

    def finalizar_servicio(self, observaciones=None):
        """Marcar servicio como completado"""
        self.estado = 'completado'
        self.fecha_finalizacion = timezone.now()
        self.save()
    
    def cancelar_servicio(self, motivo=None):
        """Cancelar servicio"""
        self.estado = 'cancelado'
        self.fecha_finalizacion = timezone.now()
        self.save()

    def rechazar_servicio(self, motivo):
        """Rechazar servicio"""
        self.estado = 'rechazado'
        self.fecha_finalizacion = timezone.now()
        self.save()

    @classmethod
    def get_fechas_disponibles(cls, tipo_servicio_id=None):
        """
        Obtener fechas disponibles para programar servicios considerando 
        solo la disponibilidad de empleados ejecutores
        """
        fechas_disponibles = []
        fecha_actual = date.today()
        
        # Buscar fechas en los próximos 60 días
        for i in range(1, 61):  # Empezar desde mañana
            fecha_check = fecha_actual + timedelta(days=i)
            
            # Excluir fines de semana (opcional)
            if fecha_check.weekday() >= 5:  # 5=Sábado, 6=Domingo
                continue
            
            # Contar empleados EJECUTORES ocupados en servicios en ejecución
            servicios_en_ejecucion = cls.objects.filter(
                fecha_preferida__date=fecha_check,
                estado__in=['aprobado', 'en_curso'],  # Solo servicios en ejecución
                asignaciones__empleado__isnull=False
            ).values_list('asignaciones__empleado', flat=True)
            
            # Total de empleados ejecutores disponibles
            total_empleados_ejecutores = User.objects.filter(
                perfil__tipo_usuario='empleado',  # Solo empleados comunes, no diseñadores
                groups__name='Empleados'
            ).count()
            
            empleados_ocupados_count = len(set(servicios_en_ejecucion))
            
            # Si hay al menos un empleado ejecutor disponible, agregar la fecha
            if total_empleados_ejecutores > empleados_ocupados_count:
                fechas_disponibles.append(fecha_check)
        
        return fechas_disponibles

    def get_empleados_ejecutores_disponibles(self):
        """Obtener empleados EJECUTORES disponibles para la fecha preferida de este servicio"""
        if not self.fecha_preferida:
            return User.objects.filter(
                perfil__tipo_usuario='empleado',
                groups__name='Empleados'
            )
        
        # Empleados ejecutores que NO tienen servicios en ejecución en la fecha preferida
        empleados_ocupados = Servicio.objects.filter(
            fecha_preferida__date=self.fecha_preferida.date(),
            estado__in=['aprobado', 'en_curso'],
            asignaciones__empleado__isnull=False
        ).values_list('asignaciones__empleado', flat=True)
        
        return User.objects.filter(
            perfil__tipo_usuario='empleado',  # Solo empleados comunes
            groups__name='Empleados'
        ).exclude(
            id__in=empleados_ocupados
        )

        
class ImagenServicio(models.Model):
    """Imágenes adjuntas a los servicios (solicitud inicial, progreso y resultado)"""
    TIPO_IMAGEN_CHOICES = [
        ('jardin_actual', 'Imagen del Jardín Actual'),
        ('idea_referencia', 'Imagen de Idea/Referencia')
    ]

    servicio = models.ForeignKey(Servicio, on_delete=models.CASCADE, related_name='imagenes')
    imagen = models.ImageField(upload_to='servicios/')
    tipo_imagen = models.CharField(max_length=20, choices=TIPO_IMAGEN_CHOICES)
    descripcion = models.CharField(max_length=200, blank=True, null=True)
    fecha_subida = models.DateTimeField(auto_now_add=True)
    subida_por = models.ForeignKey(User, on_delete=models.CASCADE, related_name='imagenes_servicio_subidas')

    class Meta:
        verbose_name = 'Imagen de Servicio'
        verbose_name_plural = 'Imágenes de Servicio'
        ordering = ['fecha_subida']

    def __str__(self):
        return f"Imagen {self.get_tipo_imagen_display()} - {self.servicio.numero_servicio}"

    @classmethod
    def get_imagenes_por_tipo(cls, servicio, tipo):
        """Obtener imágenes de un tipo específico para un servicio"""
        return cls.objects.filter(servicio=servicio, tipo_imagen=tipo)

    @classmethod
    def get_imagenes_solicitud(cls, servicio):
        """Obtener imágenes de la solicitud inicial (jardín e ideas)"""
        return cls.objects.filter(
            servicio=servicio, 
            tipo_imagen__in=['jardin_actual', 'idea_referencia']
        )


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
    """Asignación de empleados ejecutores a servicios"""
    servicio = models.ForeignKey(Servicio, on_delete=models.CASCADE, related_name='asignaciones')
    empleado = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='asignaciones_servicio',
        limit_choices_to={'perfil__tipo_usuario': 'empleado'}  # Solo empleados ejecutores
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
