from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone


class Categoria(models.Model):
    """Modelo para categorías de productos"""
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Categoría'
        verbose_name_plural = 'Categorías'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Marca(models.Model):
    """Modelo para marcas de productos"""
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Marca'
        verbose_name_plural = 'Marcas'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Unidad(models.Model):
    """Modelo para unidades de medida"""
    nombre = models.CharField(max_length=50, unique=True)
    abreviatura = models.CharField(max_length=10, unique=True)
    descripcion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Unidad'
        verbose_name_plural = 'Unidades'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} ({self.abreviatura})"


class Producto(models.Model):
    """Modelo para materiales y productos de jardinería"""
    ESTADO_CHOICES = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
        ('descontinuado', 'Descontinuado'),
    ]

    TIPO_PRODUCTO_CHOICES = [
        ('planta', 'Planta'),
        ('semilla', 'Semilla'),
        ('fertilizante', 'Fertilizante'),
        ('herramienta', 'Herramienta'),
        ('equipo', 'Equipo'),
        ('decoracion', 'Decoración'),
        ('sustrato', 'Sustrato'),
        ('maceta', 'Maceta'),
        ('sistema_riego', 'Sistema de Riego'),
        ('otro', 'Otro'),
    ]

    codigo = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    tipo_producto = models.CharField(max_length=20, choices=TIPO_PRODUCTO_CHOICES, default='otro')
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name='productos')
    marca = models.ForeignKey(Marca, on_delete=models.PROTECT, related_name='productos')
    unidad = models.ForeignKey(Unidad, on_delete=models.PROTECT, related_name='productos')
    
    precio_costo = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(0)],
        default=0.00,
        help_text="Precio de costo del producto"
    )
    precio_cliente = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(0)],
        default=0.00,
        null=True,
        blank=True,
        help_text="Precio que se cobra al cliente en servicios"
    )
    
    # Características específicas para jardinería
    es_perecedero = models.BooleanField(default=False, help_text="Indica si el producto es perecedero")
    requiere_refrigeracion = models.BooleanField(default=False)
    epoca_siembra = models.CharField(max_length=100, blank=True, null=True, help_text="Época recomendada de siembra")
    cuidados_especiales = models.TextField(blank=True, null=True)
    
    peso = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True, 
                              validators=[MinValueValidator(0)], help_text="Peso en kilogramos")
    dimensiones = models.CharField(max_length=100, blank=True, null=True, 
                                 help_text="Dimensiones en formato: largo x ancho x alto (cm)")
    
    codigo_barras = models.CharField(max_length=50, blank=True, null=True, unique=True)
    imagen = models.ImageField(upload_to='productos/', blank=True, null=True)
    
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='activo')
    requiere_stock = models.BooleanField(default=True, help_text="Indica si el producto requiere control de stock")
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        ordering = ['nombre']
        indexes = [
            models.Index(fields=['codigo']),
            models.Index(fields=['estado']),
            models.Index(fields=['categoria']),
            models.Index(fields=['tipo_producto']),
        ]

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

    @property
    def margen_ganancia(self):
        """Calcula el margen de ganancia en porcentaje"""
        if self.precio_costo > 0:
            return ((self.precio_cliente - self.precio_costo) / self.precio_costo) * 100
        return 0

    @property
    def stock_actual(self):
        """Obtiene el stock actual del producto"""
        if hasattr(self, 'stock') and self.stock:
            return self.stock.cantidad_actual
        return 0

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.precio_cliente < self.precio_costo:
            raise ValidationError('El precio al cliente no puede ser menor al precio de costo')


class Stock(models.Model):
    """Modelo para control de stock de productos"""
    producto = models.OneToOneField(Producto, on_delete=models.CASCADE, related_name='stock')
    cantidad_actual = models.DecimalField(max_digits=10, decimal_places=3, default=0, 
                                        validators=[MinValueValidator(0)])
    cantidad_minima = models.DecimalField(max_digits=10, decimal_places=3, default=0, 
                                        validators=[MinValueValidator(0)], 
                                        help_text="Stock mínimo para alertas")
    cantidad_maxima = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True, 
                                        validators=[MinValueValidator(0)], 
                                        help_text="Stock máximo recomendado")
    
    ubicacion = models.CharField(max_length=100, blank=True, null=True, 
                               help_text="Ubicación física del producto en almacén")
    
    fecha_ultima_entrada = models.DateTimeField(null=True, blank=True)
    fecha_ultima_salida = models.DateTimeField(null=True, blank=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Stock'
        verbose_name_plural = 'Stocks'

    def __str__(self):
        return f"Stock de {self.producto.nombre}: {self.cantidad_actual} {self.producto.unidad.abreviatura}"

    @property
    def necesita_reposicion(self):
        """Indica si el stock está por debajo del mínimo"""
        return self.cantidad_actual <= self.cantidad_minima

    @property
    def estado_stock(self):
        """Devuelve el estado del stock (crítico, bajo, normal, exceso)"""
        if self.cantidad_actual <= 0:
            return 'sin_stock'
        elif self.cantidad_actual <= self.cantidad_minima:
            return 'critico'
        elif self.cantidad_actual <= (self.cantidad_minima * 1.5):
            return 'bajo'
        elif self.cantidad_maxima and self.cantidad_actual >= self.cantidad_maxima:
            return 'exceso'
        return 'normal'

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.cantidad_maxima and self.cantidad_maxima <= self.cantidad_minima:
            raise ValidationError('La cantidad máxima debe ser mayor a la cantidad mínima')


class MovimientoStock(models.Model):
    """Modelo para registrar movimientos de stock"""
    TIPO_MOVIMIENTO_CHOICES = [
        ('entrada', 'Entrada'),
        ('salida', 'Salida'),
        ('ajuste', 'Ajuste'),
        ('transferencia', 'Transferencia'),
    ]

    MOTIVO_CHOICES = [
        ('compra', 'Compra'),
        ('venta', 'Venta'),
        ('devolucion', 'Devolución'),
        ('ajuste_inventario', 'Ajuste de Inventario'),
        ('merma', 'Merma'),
        ('donacion', 'Donación'),
        ('transferencia', 'Transferencia'),
        ('produccion', 'Producción'),
        ('otro', 'Otro'),
    ]

    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='movimientos_stock')
    tipo = models.CharField(max_length=20, choices=TIPO_MOVIMIENTO_CHOICES)
    motivo = models.CharField(max_length=30, choices=MOTIVO_CHOICES)
    cantidad = models.DecimalField(max_digits=10, decimal_places=3, validators=[MinValueValidator(0)])
    stock_anterior = models.DecimalField(max_digits=10, decimal_places=3)
    stock_posterior = models.DecimalField(max_digits=10, decimal_places=3)
    
    observaciones = models.TextField(blank=True, null=True)
    numero_documento = models.CharField(max_length=50, blank=True, null=True, 
                                      help_text="Número de factura, remito, etc.")
    
    fecha_movimiento = models.DateTimeField(default=timezone.now)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Movimiento de Stock'
        verbose_name_plural = 'Movimientos de Stock'
        ordering = ['-fecha_movimiento']
        indexes = [
            models.Index(fields=['producto', 'fecha_movimiento']),
            models.Index(fields=['tipo']),
        ]

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.producto.nombre} ({self.cantidad})"

    def save(self, *args, **kwargs):
        # Si es un nuevo movimiento, actualizar el stock del producto
        if not self.pk:
            stock = self.producto.stock
            self.stock_anterior = stock.cantidad_actual
            
            if self.tipo == 'entrada':
                stock.cantidad_actual += self.cantidad
                stock.fecha_ultima_entrada = self.fecha_movimiento
            elif self.tipo == 'salida':
                stock.cantidad_actual -= self.cantidad
                stock.fecha_ultima_salida = self.fecha_movimiento
            elif self.tipo == 'ajuste':
                # Para ajustes, la cantidad puede ser positiva o negativa
                stock.cantidad_actual = self.cantidad
            
            self.stock_posterior = stock.cantidad_actual
            stock.save()
        
        super().save(*args, **kwargs)
