from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone


class Servicio(models.Model):
    """Modelo para servicios según diagrama ER"""
    TIPO_CHOICES = [
        ('diseno', 'Diseño de jardines'),
        ('mantenimiento', 'Mantenimiento'),
    ]
    
    id_servicio = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=200)
    tipo = models.CharField(
        max_length=20,
        choices=TIPO_CHOICES,
        default='diseno',
        help_text="Tipo de servicio ofrecido"
    )
    descripcion = models.TextField(blank=True, null=True)
    duracion_estimada = models.IntegerField(
        validators=[MinValueValidator(1)],
        help_text="Duración estimada en horas"
    )
    precio = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
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
