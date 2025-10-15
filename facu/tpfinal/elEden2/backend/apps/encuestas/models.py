﻿from django.db import models
from apps.users.models import Cliente


class Encuesta(models.Model):
    """
    Modelo para encuestas según diagrama ER.
    Representa una encuesta que puede ser respondida por clientes.
    """
    id_encuesta = models.AutoField(primary_key=True)
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    activa = models.BooleanField(default=True)

    class Meta:
        db_table = 'encuesta'
        verbose_name = 'Encuesta'
        verbose_name_plural = 'Encuestas'
        ordering = ['-fecha_creacion']

    def __str__(self):
        return self.titulo


class Pregunta(models.Model):
    """
    Modelo para preguntas de encuestas según diagrama ER.
    Cada pregunta pertenece a una encuesta.
    """
    TIPO_CHOICES = [
        ('texto', 'Texto Libre'),
        ('numero', 'Número'),
        ('escala', 'Escala (1-5)'),
        ('si_no', 'Sí/No'),
        ('multiple', 'Opción Múltiple'),
    ]

    id_pregunta = models.AutoField(primary_key=True)
    texto = models.TextField()
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='texto')
    orden = models.IntegerField(default=0)
    obligatoria = models.BooleanField(default=True)
    opciones = models.JSONField(
        blank=True,
        null=True,
        help_text='Opciones para preguntas de tipo múltiple (formato JSON)'
    )
    
    # Relación con Encuesta
    encuesta = models.ForeignKey(
        Encuesta,
        on_delete=models.CASCADE,
        related_name='preguntas'
    )

    class Meta:
        db_table = 'pregunta'
        verbose_name = 'Pregunta'
        verbose_name_plural = 'Preguntas'
        ordering = ['encuesta', 'orden']
        indexes = [
            models.Index(fields=['encuesta', 'orden']),
        ]

    def __str__(self):
        return f'{self.encuesta.titulo} - Pregunta {self.orden}: {self.texto[:50]}'


class EncuestaRespuesta(models.Model):
    """
    Modelo para respuestas de encuestas por cliente según diagrama ER.
    Representa una encuesta respondida por un cliente específico.
    """
    ESTADO_CHOICES = [
        ('iniciada', 'Iniciada'),
        ('completada', 'Completada'),
    ]

    id_encuesta_respuesta = models.AutoField(primary_key=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='iniciada')
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_completada = models.DateTimeField(null=True, blank=True)
    
    # Relaciones según diagrama ER
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='encuestas_respondidas'
    )
    encuesta = models.ForeignKey(
        Encuesta,
        on_delete=models.CASCADE,
        related_name='respuestas_clientes'
    )

    class Meta:
        db_table = 'encuesta_respuesta'
        verbose_name = 'Encuesta Respondida'
        verbose_name_plural = 'Encuestas Respondidas'
        unique_together = ['cliente', 'encuesta']
        ordering = ['-fecha_inicio']
        indexes = [
            models.Index(fields=['cliente', 'encuesta']),
            models.Index(fields=['estado']),
        ]

    def __str__(self):
        return f'{self.cliente} - {self.encuesta.titulo}'
    
    def completar(self):
        """Marca la encuesta como completada"""
        from django.utils import timezone
        self.estado = 'completada'
        self.fecha_completada = timezone.now()
        self.save()


class Respuesta(models.Model):
    """
    Modelo para respuestas individuales a preguntas según diagrama ER.
    Cada respuesta está asociada a una pregunta específica y a la encuesta respondida.
    """
    id_respuesta = models.AutoField(primary_key=True)
    valor_texto = models.TextField(blank=True, null=True)
    valor_numerico = models.IntegerField(blank=True, null=True)
    valor_boolean = models.BooleanField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    # Relaciones según diagrama ER
    encuesta_respuesta = models.ForeignKey(
        EncuestaRespuesta,
        on_delete=models.CASCADE,
        related_name='respuestas'
    )
    pregunta = models.ForeignKey(
        Pregunta,
        on_delete=models.CASCADE,
        related_name='respuestas'
    )

    class Meta:
        db_table = 'respuesta'
        verbose_name = 'Respuesta'
        verbose_name_plural = 'Respuestas'
        unique_together = ['encuesta_respuesta', 'pregunta']
        ordering = ['encuesta_respuesta', 'pregunta__orden']

    def __str__(self):
        valor = self.valor_texto or self.valor_numerico or self.valor_boolean
        return f'Respuesta a {self.pregunta.texto[:30]}: {valor}'
    
    def get_valor(self):
        """Obtiene el valor de la respuesta según el tipo de pregunta"""
        if self.pregunta.tipo == 'texto':
            return self.valor_texto
        elif self.pregunta.tipo in ['numero', 'escala']:
            return self.valor_numerico
        elif self.pregunta.tipo == 'si_no':
            return self.valor_boolean
        elif self.pregunta.tipo == 'multiple':
            return self.valor_texto
        return None
