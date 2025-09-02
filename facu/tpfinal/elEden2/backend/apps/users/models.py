from django.db import models
from django.contrib.auth.models import AbstractUser, Group, User
from django.core.validators import MinValueValidator, RegexValidator
from django.utils import timezone


class Persona(models.Model):
    """Modelo para información personal básica"""
    TIPO_DOCUMENTO_CHOICES = [
        ('dni', 'DNI'),
        ('cuit', 'CUIT'),
        ('cuil', 'CUIL'),
        ('pasaporte', 'Pasaporte'),
        ('cedula', 'Cédula'),
    ]

    GENERO_CHOICES = [
        ('M', 'Masculino'),
        ('F', 'Femenino'),
        ('O', 'Otro'),
        ('N', 'Prefiero no decir'),
    ]

    # Información personal
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    genero = models.CharField(max_length=1, choices=GENERO_CHOICES, blank=True, null=True)
    
    # Documentación
    tipo_documento = models.CharField(max_length=20, choices=TIPO_DOCUMENTO_CHOICES)
    numero_documento = models.CharField(max_length=20, unique=True)
    
    # Contacto
    telefono = models.CharField(
        max_length=20, 
        blank=True, 
        null=True,
        validators=[RegexValidator(
            regex=r'^\+?1?\d{9,15}$',
            message="El número de teléfono debe tener entre 9 y 15 dígitos."
        )]
    )
    telefono_alternativo = models.CharField(
        max_length=20, 
        blank=True, 
        null=True,
        validators=[RegexValidator(
            regex=r'^\+?1?\d{9,15}$',
            message="El número de teléfono debe tener entre 9 y 15 dígitos."
        )]
    )
    
    # Dirección
    direccion = models.CharField(max_length=200, blank=True, null=True)
    ciudad = models.CharField(max_length=100, blank=True, null=True)
    provincia = models.CharField(max_length=100, blank=True, null=True)
    codigo_postal = models.CharField(max_length=10, blank=True, null=True)
    pais = models.CharField(max_length=100, default='Argentina')
    
    # Metadatos
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    observaciones = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = 'Persona'
        verbose_name_plural = 'Personas'
        ordering = ['apellidos', 'nombres']
        indexes = [
            models.Index(fields=['numero_documento']),
            models.Index(fields=['apellidos', 'nombres']),
        ]

    def __str__(self):
        return f"{self.apellidos}, {self.nombres}"

    @property
    def nombre_completo(self):
        return f"{self.nombres} {self.apellidos}"

    @property
    def edad(self):
        if self.fecha_nacimiento:
            from datetime import date
            today = date.today()
            return today.year - self.fecha_nacimiento.year - (
                (today.month, today.day) < (self.fecha_nacimiento.month, self.fecha_nacimiento.day)
            )
        return None


class Rol(models.Model):
    """Modelo para roles de usuario (basado en grupos de Django)"""
    grupo = models.OneToOneField(Group, on_delete=models.CASCADE, related_name='rol_extendido')
    descripcion = models.TextField(blank=True, null=True)
    permisos_especiales = models.JSONField(default=dict, blank=True)
    nivel_acceso = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Nivel de acceso (1=básico, 10=administrador)"
    )
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'
        ordering = ['nivel_acceso', 'grupo__name']

    def __str__(self):
        return self.grupo.name

    @property
    def nombre(self):
        return self.grupo.name


class PerfilUsuario(models.Model):
    """Perfil extendido para usuarios del sistema"""
    ESTADO_CHOICES = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
        ('suspendido', 'Suspendido'),
        ('bloqueado', 'Bloqueado'),
    ]

    TIPO_USUARIO_CHOICES = [
        ('cliente', 'Cliente'),
        ('empleado', 'Empleado'),
        ('diseñador', 'Diseñador'),
        ('administrador', 'Administrador'),
    ]

    # Relación uno a uno con User de Django
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    persona = models.ForeignKey(
        Persona, 
        on_delete=models.CASCADE, 
        related_name='perfiles_usuario',
        help_text="Información personal del usuario"
    )
    
    # Información del usuario
    tipo_usuario = models.CharField(max_length=20, choices=TIPO_USUARIO_CHOICES, default='cliente')
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='activo')
    
    # Configuración de cuenta
    debe_cambiar_password = models.BooleanField(default=False)
    fecha_ultimo_acceso = models.DateTimeField(null=True, blank=True)
    intentos_fallidos_login = models.IntegerField(default=0)
    fecha_bloqueo = models.DateTimeField(null=True, blank=True)
    
    # Configuración de notificaciones
    recibir_notificaciones_email = models.BooleanField(default=True)
    recibir_notificaciones_sistema = models.BooleanField(default=True)
    
    # Metadatos adicionales
    notas_internas = models.TextField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Perfil de Usuario'
        verbose_name_plural = 'Perfiles de Usuario'
        ordering = ['persona__apellidos', 'persona__nombres']

    def __str__(self):
        return f"{self.user.username} ({self.persona.nombre_completo})"

    @property
    def nombre_completo(self):
        return self.persona.nombre_completo

    @property
    def roles_nombres(self):
        return [grupo.name for grupo in self.user.groups.all()]

    @property
    def es_administrador(self):
        return self.user.is_superuser or self.user.groups.filter(rol_extendido__nivel_acceso__gte=8).exists()

    @property
    def es_diseñador(self):
        return self.tipo_usuario == 'diseñador' or self.user.groups.filter(name__icontains='diseñador').exists()

    @property
    def es_empleado(self):
        return self.tipo_usuario in ['empleado', 'diseñador'] or self.user.is_staff

    @property
    def puede_acceder(self):
        return self.estado == 'activo' and self.user.is_active

    def agregar_intento_fallido(self):
        """Incrementar contador de intentos fallidos"""
        self.intentos_fallidos_login += 1
        if self.intentos_fallidos_login >= 5:
            self.estado = 'bloqueado'
            self.fecha_bloqueo = timezone.now()
        self.save()

    def resetear_intentos_fallidos(self):
        """Resetear contador de intentos fallidos"""
        self.intentos_fallidos_login = 0
        if self.estado == 'bloqueado':
            self.estado = 'activo'
            self.fecha_bloqueo = None
        self.save()


class MetodoPago(models.Model):
    """Modelo para métodos de pago"""
    TIPO_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('tarjeta_debito', 'Tarjeta de Débito'),
        ('tarjeta_credito', 'Tarjeta de Crédito'),
        ('transferencia', 'Transferencia Bancaria'),
        ('cheque', 'Cheque'),
        ('mercado_pago', 'Mercado Pago'),
        ('paypal', 'PayPal'),
        ('crypto', 'Criptomoneda'),
        ('vale', 'Vale/Cupón'),
        ('otro', 'Otro'),
    ]

    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    descripcion = models.TextField(blank=True, null=True)
    comision_porcentaje = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Porcentaje de comisión (0-100)"
    )
    comision_fija = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Comisión fija por transacción"
    )
    activo = models.BooleanField(default=True)
    requiere_autorizacion = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Método de Pago'
        verbose_name_plural = 'Métodos de Pago'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} ({self.get_tipo_display()})"

    @property
    def costo_total_porcentaje(self):
        """Calcula el costo total en porcentaje"""
        return self.comision_porcentaje

    def calcular_comision(self, monto):
        """Calcula la comisión total para un monto dado"""
        comision_porcentual = (monto * self.comision_porcentaje) / 100
        return comision_porcentual + self.comision_fija


class Pago(models.Model):
    """Modelo para pagos realizados por usuarios"""
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('procesando', 'Procesando'),
        ('completado', 'Completado'),
        ('fallido', 'Fallido'),
        ('cancelado', 'Cancelado'),
        ('reembolsado', 'Reembolsado'),
    ]

    TIPO_TRANSACCION_CHOICES = [
        ('servicio', 'Pago de Servicio'),
        ('diseño', 'Pago de Diseño'),
        ('devolucion', 'Devolución'),
        ('reembolso', 'Reembolso'),
        ('ajuste', 'Ajuste'),
        ('comision', 'Comisión'),
        ('otro', 'Otro'),
    ]

    # Identificación del pago
    numero_transaccion = models.CharField(max_length=50, unique=True, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pagos')
    metodo_pago = models.ForeignKey(MetodoPago, on_delete=models.PROTECT, related_name='pagos')
    
    # Información del pago
    tipo_transaccion = models.CharField(max_length=20, choices=TIPO_TRANSACCION_CHOICES, default='servicio')
    monto = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    monto_comision = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    monto_neto = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    
    # Estado y fechas
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    fecha_pago = models.DateTimeField(default=timezone.now)
    fecha_procesamiento = models.DateTimeField(null=True, blank=True)
    fecha_completado = models.DateTimeField(null=True, blank=True)
    
    # Información adicional
    referencia_externa = models.CharField(max_length=100, blank=True, null=True)
    descripcion = models.TextField(blank=True, null=True)
    observaciones = models.TextField(blank=True, null=True)
    
    # Metadatos
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'
        ordering = ['-fecha_pago']
        indexes = [
            models.Index(fields=['numero_transaccion']),
            models.Index(fields=['user', 'fecha_pago']),
            models.Index(fields=['estado']),
        ]

    def __str__(self):
        return f"Pago {self.numero_transaccion} - {self.user.username} ({self.monto})"

    def save(self, *args, **kwargs):
        # Generar número de transacción único
        if not self.numero_transaccion:
            import uuid
            self.numero_transaccion = f"PAY-{uuid.uuid4().hex[:10].upper()}"
        
        # Calcular comisión y monto neto
        if self.metodo_pago_id:
            self.monto_comision = self.metodo_pago.calcular_comision(self.monto)
            self.monto_neto = self.monto - self.monto_comision
        
        # Actualizar fechas según estado
        if self.estado == 'procesando' and not self.fecha_procesamiento:
            self.fecha_procesamiento = timezone.now()
        elif self.estado == 'completado' and not self.fecha_completado:
            self.fecha_completado = timezone.now()
        
        super().save(*args, **kwargs)

    @property
    def duracion_procesamiento(self):
        """Calcula la duración del procesamiento en minutos"""
        if self.fecha_procesamiento and self.fecha_completado:
            delta = self.fecha_completado - self.fecha_procesamiento
            return delta.total_seconds() / 60
        return None

    def marcar_como_completado(self):
        """Marca el pago como completado"""
        self.estado = 'completado'
        self.fecha_completado = timezone.now()
        self.save()

    def cancelar(self, motivo=None):
        """Cancela el pago"""
        self.estado = 'cancelado'
        if motivo:
            self.observaciones = f"Cancelado: {motivo}"
        self.save()


class HistorialAcceso(models.Model):
    """Modelo para registrar accesos de usuario"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='historial_accesos')
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True, null=True)
    fecha_acceso = models.DateTimeField(auto_now_add=True)
    accion = models.CharField(max_length=100, blank=True, null=True)
    exitoso = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = 'Historial de Acceso'
        verbose_name_plural = 'Historiales de Acceso'
        ordering = ['-fecha_acceso']
        indexes = [
            models.Index(fields=['user', 'fecha_acceso']),
            models.Index(fields=['ip_address']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.fecha_acceso} - {self.ip_address}"


class ConfiguracionUsuario(models.Model):
    """Modelo para configuraciones específicas del usuario"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='configuracion')
    
    # Configuraciones de interfaz
    tema = models.CharField(max_length=20, default='claro', choices=[
        ('claro', 'Claro'),
        ('oscuro', 'Oscuro'),
        ('auto', 'Automático'),
    ])
    idioma = models.CharField(max_length=10, default='es', choices=[
        ('es', 'Español'),
        ('en', 'Inglés'),
    ])
    zona_horaria = models.CharField(max_length=50, default='America/Argentina/Buenos_Aires')
    
    # Configuraciones de notificaciones
    notif_stock_bajo = models.BooleanField(default=True)
    notif_nuevos_productos = models.BooleanField(default=False)
    notif_cambios_precios = models.BooleanField(default=False)
    
    # Configuraciones de trabajo
    productos_por_pagina = models.IntegerField(default=25, validators=[MinValueValidator(1)])
    mostrar_precios_compra = models.BooleanField(default=False)
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Configuración de Usuario'
        verbose_name_plural = 'Configuraciones de Usuario'

    def __str__(self):
        return f"Configuración de {self.user.username}"


class DetallePago(models.Model):
    """Modelo para detalles/items de un pago"""
    pago = models.ForeignKey(Pago, on_delete=models.CASCADE, related_name='detalles_pago')
    producto = models.ForeignKey('productos.Producto', on_delete=models.PROTECT, related_name='detalles_pago')
    
    # Cantidad y precios
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)])
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    descuento = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    
    # Información adicional
    descripcion = models.TextField(blank=True, null=True)
    observaciones = models.TextField(blank=True, null=True)
    
    # Metadatos
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Detalle de Pago'
        verbose_name_plural = 'Detalles de Pago'
        ordering = ['fecha_creacion']
        unique_together = ['pago', 'producto']

    def __str__(self):
        return f"{self.producto.nombre} - {self.cantidad} x {self.precio_unitario}"

    def save(self, *args, **kwargs):
        # Calcular subtotal
        self.subtotal = (self.cantidad * self.precio_unitario) - self.descuento
        super().save(*args, **kwargs)

    @property
    def total_con_descuento(self):
        """Calcula el total con descuento aplicado"""
        return self.subtotal
