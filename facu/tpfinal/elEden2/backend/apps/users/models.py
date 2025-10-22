from django.db import models
from django.core.validators import RegexValidator


class Genero(models.Model):
    id_genero = models.AutoField(primary_key=True)
    genero = models.CharField(max_length=50, unique=True)

    class Meta:
        verbose_name = 'Género'
        verbose_name_plural = 'Géneros'
        db_table = 'genero'
        ordering = ['genero']

    def __str__(self):
        return self.genero


class TipoDocumento(models.Model):
    id_tipo_documento = models.AutoField(primary_key=True)
    tipo = models.CharField(max_length=50, unique=True)

    class Meta:
        verbose_name = 'Tipo de Documento'
        verbose_name_plural = 'Tipos de Documento'
        db_table = 'tipo_documento'
        ordering = ['tipo']

    def __str__(self):
        return self.tipo


class Localidad(models.Model):
    id_localidad = models.AutoField(primary_key=True)
    cp = models.CharField(max_length=10, verbose_name='Código Postal')
    nombre_localidad = models.CharField(max_length=100)
    nombre_provincia = models.CharField(max_length=100)

    class Meta:
        verbose_name = 'Localidad'
        verbose_name_plural = 'Localidades'
        db_table = 'localidad'
        ordering = ['nombre_provincia', 'nombre_localidad']
        indexes = [
            models.Index(fields=['cp']),
            models.Index(fields=['nombre_provincia']),
        ]

    def __str__(self):
        return f"{self.nombre_localidad}, {self.nombre_provincia} (CP: {self.cp})"


class Persona(models.Model):
    id_persona = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    telefono = models.CharField(
        max_length=20,
        validators=[RegexValidator(
            regex=r'^\+?1?\d{9,15}$',
            message="El número de teléfono debe tener entre 9 y 15 dígitos."
        )]
    )
    calle = models.CharField(max_length=200)
    numero = models.CharField(max_length=10)
    piso = models.CharField(max_length=10, blank=True, null=True)
    dpto = models.CharField(max_length=10, blank=True, null=True)
    nro_documento = models.CharField(max_length=20, unique=True)
    genero = models.ForeignKey(Genero, on_delete=models.PROTECT, related_name='personas')
    tipo_documento = models.ForeignKey(TipoDocumento, on_delete=models.PROTECT, related_name='personas')
    localidad = models.ForeignKey(Localidad, on_delete=models.PROTECT, related_name='personas')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Persona'
        verbose_name_plural = 'Personas'
        db_table = 'persona'
        ordering = ['apellido', 'nombre']
        indexes = [
            models.Index(fields=['nro_documento']),
            models.Index(fields=['email']),
            models.Index(fields=['apellido', 'nombre']),
        ]

    def __str__(self):
        return f"{self.apellido}, {self.nombre}"


class Cliente(models.Model):
    id_cliente = models.AutoField(primary_key=True)
    persona = models.OneToOneField(Persona, on_delete=models.CASCADE, related_name='cliente')
    fecha_registro = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)
    observaciones = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        db_table = 'cliente'
        ordering = ['-fecha_registro']

    def __str__(self):
        return f"Cliente: {self.persona.apellido}, {self.persona.nombre}"


class Empleado(models.Model):
    id_empleado = models.AutoField(primary_key=True)
    persona = models.OneToOneField(Persona, on_delete=models.CASCADE, related_name='empleado')
    fecha_contratacion = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)
    cargo = models.CharField(max_length=100, blank=True, null=True)
    observaciones = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Empleado'
        verbose_name_plural = 'Empleados'
        db_table = 'empleado'
        ordering = ['-fecha_contratacion']

    def __str__(self):
        return f"Empleado: {self.persona.apellido}, {self.persona.nombre}"


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
        verbose_name = 'Proveedor'
        verbose_name_plural = 'Proveedores'
        db_table = 'proveedor'
        ordering = ['razon_social']
        indexes = [
            models.Index(fields=['cuit']),
            models.Index(fields=['razon_social']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return f"{self.razon_social} (CUIT: {self.cuit})"
