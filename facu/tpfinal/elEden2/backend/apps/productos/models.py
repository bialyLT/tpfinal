from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone


class Categoria(models.Model):
    """Modelo para categorías de productos según diagrama ER"""
    id_categoria = models.AutoField(primary_key=True)
    nombre_categoria = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = 'Categoría'
        verbose_name_plural = 'Categorías'
        db_table = 'categoria'
        ordering = ['nombre_categoria']

    def __str__(self):
        return self.nombre_categoria


class Marca(models.Model):
    """Modelo para marcas de productos según diagrama ER"""
    id_marca = models.AutoField(primary_key=True)
    nombre_marca = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = 'Marca'
        verbose_name_plural = 'Marcas'
        db_table = 'marca'
        ordering = ['nombre_marca']

    def __str__(self):
        return self.nombre_marca


class Producto(models.Model):
    """Modelo para productos según diagrama ER
    
    El precio se calcula dinámicamente desde las compras realizadas.
    Se toma el precio unitario más alto de todas las compras del producto.
    """
    id_producto = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    precio = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(0)],
        blank=True,
        null=True,
        help_text="Precio calculado automáticamente desde las compras"
    )
    imagen = models.ImageField(upload_to='productos/', blank=True, null=True)
    
    # Relaciones según diagrama ER
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name='productos')
    marca = models.ForeignKey(Marca, on_delete=models.PROTECT, related_name='productos')
    
    # Metadatos
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        db_table = 'producto'
        ordering = ['nombre']
        indexes = [
            models.Index(fields=['nombre']),
            models.Index(fields=['categoria']),
            models.Index(fields=['marca']),
        ]

    def __str__(self):
        return f"{self.nombre} - {self.marca.nombre_marca}"

    def calcular_precio_desde_compras(self):
        """
        Calcula y actualiza el precio del producto basado en el precio unitario
        más alto de todas las compras realizadas.
        
        Returns:
            Decimal: El precio unitario más alto, o 0 si no hay compras
        """
        from apps.ventas.models import DetalleCompra
        
        detalle_max = DetalleCompra.objects.filter(
            producto=self
        ).order_by('-precio_unitario').first()
        
        nuevo_precio = detalle_max.precio_unitario if detalle_max else 0
        
        # Actualizar el precio en la base de datos
        if self.precio != nuevo_precio:
            self.precio = nuevo_precio
            self.save(update_fields=['precio'])
        
        return nuevo_precio

    @property
    def precio_actual(self):
        """
        Obtiene el precio actual del producto.
        Si no tiene precio guardado, lo calcula desde las compras.
        
        Returns:
            Decimal: El precio actual del producto
        """
        if self.precio is None or self.precio == 0:
            return self.calcular_precio_desde_compras()
        return self.precio

    @property
    def stock_actual(self):
        """Obtiene el stock actual del producto"""
        if hasattr(self, 'stock') and self.stock:
            return self.stock.cantidad
        return 0


class Stock(models.Model):
    """Modelo para control de stock de productos según diagrama ER"""
    id_stock = models.AutoField(primary_key=True)
    producto = models.OneToOneField(Producto, on_delete=models.CASCADE, related_name='stock')
    cantidad = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    cantidad_minima = models.IntegerField(
        default=0, 
        validators=[MinValueValidator(0)],
        help_text="Stock mínimo para alertas"
    )
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Stock'
        verbose_name_plural = 'Stocks'
        db_table = 'stock'

    def __str__(self):
        return f"Stock de {self.producto.nombre}: {self.cantidad}"

    @property
    def necesita_reposicion(self):
        """Indica si el stock está por debajo del mínimo"""
        return self.cantidad <= self.cantidad_minima

    @property
    def estado_stock(self):
        """Devuelve el estado del stock"""
        if self.cantidad <= 0:
            return 'sin_stock'
        elif self.cantidad <= self.cantidad_minima:
            return 'critico'
        elif self.cantidad <= (self.cantidad_minima * 1.5):
            return 'bajo'
        return 'normal'
