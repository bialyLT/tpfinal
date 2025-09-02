from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class TipoEncuesta(models.Model):
    """Tipos de encuestas disponibles"""
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField()
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Tipo de Encuesta'
        verbose_name_plural = 'Tipos de Encuesta'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Encuesta(models.Model):
    """Encuestas de satisfacción del cliente"""
    ESTADO_CHOICES = [
        ('enviada', 'Enviada'),
        ('respondida', 'Respondida'),
        ('expirada', 'Expirada'),
    ]

    # Relaciones
    tipo_encuesta = models.ForeignKey(TipoEncuesta, on_delete=models.CASCADE, related_name='encuestas')
    cliente = models.ForeignKey(User, on_delete=models.CASCADE, related_name='encuestas')
    
    # Información básica
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    
    # Estado y fechas
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='enviada')
    fecha_envio = models.DateTimeField(auto_now_add=True)
    fecha_respuesta = models.DateTimeField(null=True, blank=True)
    fecha_expiracion = models.DateTimeField()
    
    # Configuración
    permite_respuesta_anonima = models.BooleanField(default=False)
    
    # Metadatos
    token_acceso = models.CharField(max_length=100, unique=True, editable=False)
    email_enviado = models.BooleanField(default=False)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Encuesta'
        verbose_name_plural = 'Encuestas'
        ordering = ['-fecha_envio']
        indexes = [
            models.Index(fields=['token_acceso']),
            models.Index(fields=['cliente', 'estado']),
        ]

    def __str__(self):
        return f"{self.titulo} - {self.cliente.username}"

    def save(self, *args, **kwargs):
        if not self.token_acceso:
            import uuid
            self.token_acceso = uuid.uuid4().hex
        super().save(*args, **kwargs)

    @property
    def esta_vigente(self):
        """Verifica si la encuesta está vigente"""
        return timezone.now() < self.fecha_expiracion and self.estado == 'enviada'

    @property
    def dias_para_expiracion(self):
        """Días restantes para expiración"""
        if self.esta_vigente:
            delta = self.fecha_expiracion - timezone.now()
            return delta.days
        return 0

    def marcar_como_respondida(self):
        """Marcar encuesta como respondida"""
        self.estado = 'respondida'
        self.fecha_respuesta = timezone.now()
        self.save()


class Pregunta(models.Model):
    """Preguntas de las encuestas"""
    TIPO_PREGUNTA_CHOICES = [
        ('texto', 'Texto Libre'),
        ('numero', 'Número'),
        ('escala', 'Escala (1-5)'),
        ('boolean', 'Sí/No'),
        ('multiple_choice', 'Opción Múltiple'),
        ('checkbox', 'Casillas de Verificación'),
        ('rating', 'Calificación con Estrellas'),
    ]

    encuesta = models.ForeignKey(Encuesta, on_delete=models.CASCADE, related_name='preguntas')
    texto_pregunta = models.TextField()
    tipo_pregunta = models.CharField(max_length=20, choices=TIPO_PREGUNTA_CHOICES)
    orden = models.IntegerField(default=1)
    obligatoria = models.BooleanField(default=True)
    
    # Configuraciones específicas por tipo
    opciones_json = models.JSONField(
        blank=True, 
        null=True,
        help_text="Opciones para preguntas de opción múltiple o checkbox"
    )
    valor_minimo = models.IntegerField(null=True, blank=True)
    valor_maximo = models.IntegerField(null=True, blank=True)
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Pregunta'
        verbose_name_plural = 'Preguntas'
        ordering = ['encuesta', 'orden']
        unique_together = ['encuesta', 'orden']

    def __str__(self):
        return f"P{self.orden}: {self.texto_pregunta[:50]}..."


class RespuestaEncuesta(models.Model):
    """Respuestas completas a encuestas"""
    encuesta = models.ForeignKey(Encuesta, on_delete=models.CASCADE, related_name='respuestas')
    cliente = models.ForeignKey(User, on_delete=models.CASCADE, related_name='respuestas_encuesta')
    
    # Calificación general
    calificacion_general = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Calificación general del 1 al 5"
    )
    
    # Comentario general
    comentario_general = models.TextField(blank=True, null=True)
    
    # Metadatos
    fecha_respuesta = models.DateTimeField(auto_now_add=True)
    tiempo_respuesta_minutos = models.IntegerField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        verbose_name = 'Respuesta de Encuesta'
        verbose_name_plural = 'Respuestas de Encuesta'
        unique_together = ['encuesta', 'cliente']
        ordering = ['-fecha_respuesta']

    def __str__(self):
        return f"Respuesta de {self.cliente.username} - {self.encuesta.titulo}"

    @property
    def satisfaccion_texto(self):
        """Convierte la calificación numérica a texto"""
        escalas = {
            1: 'Muy Insatisfecho',
            2: 'Insatisfecho', 
            3: 'Neutral',
            4: 'Satisfecho',
            5: 'Muy Satisfecho'
        }
        return escalas.get(self.calificacion_general, 'Sin calificar')


class DetallePregunta(models.Model):
    """Respuestas específicas a cada pregunta"""
    respuesta_encuesta = models.ForeignKey(RespuestaEncuesta, on_delete=models.CASCADE, related_name='detalles')
    pregunta = models.ForeignKey(Pregunta, on_delete=models.CASCADE, related_name='respuestas')
    
    # Campos para diferentes tipos de respuesta
    respuesta_texto = models.TextField(blank=True, null=True)
    respuesta_numero = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    respuesta_boolean = models.BooleanField(null=True, blank=True)
    respuesta_escala = models.IntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    respuesta_multiple = models.JSONField(blank=True, null=True)

    class Meta:
        verbose_name = 'Detalle de Pregunta'
        verbose_name_plural = 'Detalles de Pregunta'
        unique_together = ['respuesta_encuesta', 'pregunta']

    def __str__(self):
        return f"Respuesta a: {self.pregunta.texto_pregunta[:30]}..."

    @property
    def respuesta_formateada(self):
        """Devuelve la respuesta en formato legible"""
        if self.respuesta_texto:
            return self.respuesta_texto
        elif self.respuesta_numero is not None:
            return str(self.respuesta_numero)
        elif self.respuesta_boolean is not None:
            return "Sí" if self.respuesta_boolean else "No"
        elif self.respuesta_escala is not None:
            return f"{self.respuesta_escala}/5"
        elif self.respuesta_multiple:
            return ", ".join(self.respuesta_multiple)
        return "Sin respuesta"


class EncuestaServicio(models.Model):
    """Relación entre encuestas y servicios"""
    encuesta = models.OneToOneField(Encuesta, on_delete=models.CASCADE, related_name='servicio_relacionado')
    servicio_id = models.CharField(max_length=20, help_text="ID del servicio relacionado")
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Encuesta de Servicio'
        verbose_name_plural = 'Encuestas de Servicio'

    def __str__(self):
        return f"Encuesta para servicio {self.servicio_id}"
