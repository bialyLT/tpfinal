from decimal import ROUND_HALF_UP, Decimal

from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone

from apps.emails.services import EmailService


class Genero(models.Model):
    id_genero = models.AutoField(primary_key=True)
    genero = models.CharField(max_length=50, unique=True)

    class Meta:
        verbose_name = "Género"
        verbose_name_plural = "Géneros"
        db_table = "genero"
        ordering = ["genero"]

    def __str__(self):
        return self.genero


class TipoDocumento(models.Model):
    id_tipo_documento = models.AutoField(primary_key=True)
    tipo = models.CharField(max_length=50, unique=True)

    class Meta:
        verbose_name = "Tipo de Documento"
        verbose_name_plural = "Tipos de Documento"
        db_table = "tipo_documento"
        ordering = ["tipo"]

    def __str__(self):
        return self.tipo


class Localidad(models.Model):
    id_localidad = models.AutoField(primary_key=True)
    cp = models.CharField(max_length=10, verbose_name="Código Postal")
    nombre_localidad = models.CharField(max_length=100)
    nombre_provincia = models.CharField(max_length=100)
    nombre_pais = models.CharField(max_length=100, default="Argentina")
    latitud = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="Latitud geográfica aproximada",
    )
    longitud = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="Longitud geográfica aproximada",
    )

    class Meta:
        verbose_name = "Localidad"
        verbose_name_plural = "Localidades"
        db_table = "localidad"
        ordering = ["nombre_provincia", "nombre_localidad"]
        indexes = [
            models.Index(fields=["cp"]),
            models.Index(fields=["nombre_provincia"]),
            models.Index(fields=["nombre_pais"]),
        ]

    def __str__(self):
        return f"{self.nombre_localidad}, {self.nombre_provincia}, {self.nombre_pais} (CP: {self.cp})"


class Persona(models.Model):
    id_persona = models.AutoField(primary_key=True)
    user = models.OneToOneField(
        "auth.User",
        on_delete=models.CASCADE,
        related_name="persona",
        null=True,
        blank=True,
    )
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    telefono = models.CharField(
        max_length=20,
        validators=[
            RegexValidator(
                regex=r"^\+?1?\d{9,15}$",
                message="El número de teléfono debe tener entre 9 y 15 dígitos.",
            )
        ],
    )
    calle = models.CharField(max_length=200)
    numero = models.CharField(max_length=10)
    piso = models.CharField(max_length=10, blank=True, null=True)
    dpto = models.CharField(max_length=10, blank=True, null=True)
    nro_documento = models.CharField(max_length=20, unique=True)
    genero = models.ForeignKey(Genero, on_delete=models.PROTECT, related_name="personas")
    tipo_documento = models.ForeignKey(TipoDocumento, on_delete=models.PROTECT, related_name="personas")
    localidad = models.ForeignKey(Localidad, on_delete=models.PROTECT, related_name="personas")
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Persona"
        verbose_name_plural = "Personas"
        db_table = "persona"
        ordering = ["apellido", "nombre"]
        indexes = [
            models.Index(fields=["nro_documento"]),
            models.Index(fields=["email"]),
            models.Index(fields=["apellido", "nombre"]),
        ]

    def __str__(self):
        return f"{self.apellido}, {self.nombre}"


class Cliente(models.Model):
    id_cliente = models.AutoField(primary_key=True)
    persona = models.OneToOneField(Persona, on_delete=models.CASCADE, related_name="cliente")
    fecha_registro = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)
    observaciones = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        db_table = "cliente"
        ordering = ["-fecha_registro"]

    def __str__(self):
        return f"Cliente: {self.persona.apellido}, {self.persona.nombre}"


class Empleado(models.Model):
    id_empleado = models.AutoField(primary_key=True)
    persona = models.OneToOneField(Persona, on_delete=models.CASCADE, related_name="empleado")
    fecha_contratacion = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)
    cargo = models.CharField(max_length=100, blank=True, null=True)
    observaciones = models.TextField(blank=True, null=True)
    puntuacion_acumulada = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Suma de todas las puntuaciones recibidas de encuestas",
    )
    puntuacion_cantidad = models.PositiveIntegerField(
        default=0,
        help_text="Cantidad de respuestas de encuesta consideradas para la puntuación",
    )
    puntuacion_promedio = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Promedio de puntuación acumulada (formato 0.00)",
    )
    fecha_ultima_puntuacion = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Última vez que se actualizó la puntuación desde una encuesta",
    )
    evaluaciones_bajas_consecutivas = models.PositiveIntegerField(
        default=0,
        help_text="Cantidad de evaluaciones consecutivas con puntaje menor a 7",
    )
    fecha_baja_automatica = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha en la que el sistema desactivó automáticamente al empleado",
    )
    motivo_baja_automatica = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Motivo registrado para la baja automática del empleado",
    )

    class Meta:
        verbose_name = "Empleado"
        verbose_name_plural = "Empleados"
        db_table = "empleado"
        ordering = ["-fecha_contratacion"]

    def __str__(self):
        return f"Empleado: {self.persona.apellido}, {self.persona.nombre}"

    def registrar_resultado_encuesta(self, puntuacion_total: Decimal, cantidad_items: int, timestamp=None):
        """Actualiza la puntuación del empleado y ejecuta alertas automáticas."""
        if cantidad_items <= 0:
            return

        if not isinstance(puntuacion_total, Decimal):
            puntuacion_total = Decimal(puntuacion_total)

        if cantidad_items:
            promedio_encuesta = (puntuacion_total / Decimal(cantidad_items)).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        else:
            promedio_encuesta = Decimal("0.00")

        promedio_anterior = self.puntuacion_promedio or Decimal("0.00")
        timestamp = timestamp or timezone.now()

        self.puntuacion_acumulada = (self.puntuacion_acumulada or Decimal("0")) + puntuacion_total
        self.puntuacion_cantidad += int(cantidad_items)

        if self.puntuacion_cantidad > 0:
            promedio = self.puntuacion_acumulada / Decimal(self.puntuacion_cantidad)
            self.puntuacion_promedio = promedio.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        else:
            self.puntuacion_promedio = Decimal("0.00")

        if promedio_encuesta < Decimal("7.00"):
            self.evaluaciones_bajas_consecutivas = (self.evaluaciones_bajas_consecutivas or 0) + 1
        else:
            self.evaluaciones_bajas_consecutivas = 0

        self.fecha_ultima_puntuacion = timestamp

        alert_triggered = False
        motivo_baja = None
        motivo_promedio = "Promedio general descendió por debajo de 7"
        motivo_consecutivas = "Recibió 3 calificaciones consecutivas menores a 7"
        umbral = Decimal("7.00")

        if self.activo:
            if promedio_anterior >= umbral and self.puntuacion_promedio < umbral:
                alert_triggered = True
                motivo_baja = motivo_promedio
            elif self.evaluaciones_bajas_consecutivas >= 3:
                alert_triggered = True
                motivo_baja = motivo_consecutivas

        fields_to_update = [
            "puntuacion_acumulada",
            "puntuacion_cantidad",
            "puntuacion_promedio",
            "fecha_ultima_puntuacion",
            "evaluaciones_bajas_consecutivas",
        ]

        if alert_triggered:
            self.activo = False
            self.fecha_baja_automatica = timestamp
            self.motivo_baja_automatica = motivo_baja
            fields_to_update.extend(["activo", "fecha_baja_automatica", "motivo_baja_automatica"])

        self.save(update_fields=fields_to_update)

        if alert_triggered:
            user_to_deactivate = getattr(self.persona, "user", None)
            if user_to_deactivate and user_to_deactivate.is_active:
                user_to_deactivate.is_active = False
                user_to_deactivate.save(update_fields=["is_active"])

            EmailService.send_employee_deactivation_alert(
                empleado=self,
                motivo=motivo_baja,
                promedio_actual=self.puntuacion_promedio,
                evaluaciones_bajas=self.evaluaciones_bajas_consecutivas,
            )


class Proveedor(models.Model):
    id_proveedor = models.AutoField(primary_key=True)
    razon_social = models.CharField(max_length=200)
    cuit = models.CharField(max_length=13, unique=True)

    # Datos de contacto
    nombre_contacto = models.CharField(max_length=200, help_text="Nombre de la persona de contacto")
    email = models.EmailField()
    telefono = models.CharField(max_length=20)

    # Dirección
    direccion = models.CharField(max_length=300, help_text="Dirección completa del proveedor")

    # Metadatos
    fecha_alta = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)
    observaciones = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Proveedor"
        verbose_name_plural = "Proveedores"
        db_table = "proveedor"
        ordering = ["razon_social"]
        indexes = [
            models.Index(fields=["cuit"]),
            models.Index(fields=["razon_social"]),
            models.Index(fields=["email"]),
        ]

    def __str__(self):
        return f"{self.razon_social} (CUIT: {self.cuit})"
