from django.core.validators import MinValueValidator
from django.db import models


class Categoria(models.Model):
    """Modelo para categorías de productos según diagrama ER"""

    id_categoria = models.AutoField(primary_key=True)
    nombre_categoria = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Categoría"
        verbose_name_plural = "Categorías"
        db_table = "categoria"
        ordering = ["nombre_categoria"]

    def __str__(self):
        return self.nombre_categoria


class Marca(models.Model):
    """Modelo para marcas de productos según diagrama ER"""

    id_marca = models.AutoField(primary_key=True)
    nombre_marca = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Marca"
        verbose_name_plural = "Marcas"
        db_table = "marca"
        ordering = ["nombre_marca"]

    def __str__(self):
        return self.nombre_marca


class Especie(models.Model):
    """Modelo para especies de plantas.

    Es equivalente a Marca, pero para productos tipo planta.
    """

    id_especie = models.AutoField(primary_key=True)
    nombre_especie = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Especie"
        verbose_name_plural = "Especies"
        db_table = "especie"
        ordering = ["nombre_especie"]

    def __str__(self):
        return self.nombre_especie


class Tarea(models.Model):
    """Modelo para tareas asociables a productos.

    - duracion_base: duración estimada base (en minutos)
    - cantidad_personal_minimo: personal mínimo requerido
    """

    id_tarea = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=150, unique=True)
    duracion_base = models.PositiveIntegerField(validators=[MinValueValidator(0)])
    cantidad_personal_minimo = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    class Meta:
        verbose_name = "Tarea"
        verbose_name_plural = "Tareas"
        db_table = "tarea"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


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
        help_text="Precio calculado automáticamente desde las compras",
    )
    imagen = models.ImageField(upload_to="productos/", blank=True, null=True)

    # Tipo de producto: True = insumo, False = planta
    # db_column mantiene el nombre solicitado en la tabla.
    tipo_producto = models.BooleanField(default=True, db_column="tipoProducto")

    # Relaciones según diagrama ER
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name="productos")
    marca = models.ForeignKey(Marca, on_delete=models.PROTECT, related_name="productos", null=True, blank=True)
    especie = models.ForeignKey(
        Especie,
        on_delete=models.PROTECT,
        related_name="productos",
        null=True,
        blank=True,
    )

    tareas = models.ManyToManyField(Tarea, through="ProductoTarea", related_name="productos", blank=True)

    # Metadatos
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Producto"
        verbose_name_plural = "Productos"
        db_table = "producto"
        ordering = ["nombre"]
        indexes = [
            models.Index(fields=["nombre"]),
            models.Index(fields=["categoria"]),
            models.Index(fields=["marca"]),
            models.Index(fields=["especie"]),
            models.Index(fields=["tipo_producto"]),
        ]

    def __str__(self):
        if self.tipo_producto:
            marca = self.marca.nombre_marca if self.marca else "Sin marca"
            return f"{self.nombre} - {marca}"
        especie = self.especie.nombre_especie if self.especie else "Sin especie"
        return f"{self.nombre} - {especie}"

    def calcular_precio_desde_compras(self, porcentaje_ganancia=None):
        """Calcula y actualiza el precio del producto desde las compras.

        Toma el precio unitario más alto de las compras del producto.
        Si se proporciona porcentaje_ganancia, aplica: precio_venta = precio_compra * (1 + porcentaje/100)
        """

        from apps.ventas.models import DetalleCompra

        detalle_max = DetalleCompra.objects.filter(producto=self).order_by("-precio_unitario").first()

        if not detalle_max:
            nuevo_precio = 0
        else:
            precio_compra = detalle_max.precio_unitario
            if porcentaje_ganancia is not None and porcentaje_ganancia > 0:
                nuevo_precio = precio_compra * (1 + porcentaje_ganancia / 100)
            else:
                nuevo_precio = precio_compra

        if self.precio != nuevo_precio:
            self.precio = nuevo_precio
            self.save(update_fields=["precio"])

        return nuevo_precio

    @property
    def precio_actual(self):
        """Obtiene el precio actual del producto.

        Si no tiene precio guardado, lo calcula desde las compras.
        """

        if self.precio is None or self.precio == 0:
            return self.calcular_precio_desde_compras()
        return self.precio

    @property
    def stock_actual(self):
        """Obtiene el stock actual del producto (si existe registro de stock)."""

        if hasattr(self, "stock") and self.stock:
            return self.stock.cantidad
        return 0


class ProductoTarea(models.Model):
    """Tabla intermedia Producto <-> Tarea (relación muchos a muchos)."""

    id_producto_tarea = models.AutoField(primary_key=True)
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name="producto_tareas")
    tarea = models.ForeignKey(Tarea, on_delete=models.CASCADE, related_name="tarea_productos")

    class Meta:
        verbose_name = "Producto-Tarea"
        verbose_name_plural = "Productos-Tareas"
        db_table = "producto_tarea"
        unique_together = ("producto", "tarea")

    def __str__(self):
        return f"{self.producto_id} - {self.tarea_id}"


class Stock(models.Model):
    """Modelo para control de stock de productos"""

    id_stock = models.AutoField(primary_key=True)
    producto = models.OneToOneField(Producto, on_delete=models.CASCADE, related_name="stock")
    cantidad = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    cantidad_minima = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Stock mínimo para alertas",
    )
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Stock"
        verbose_name_plural = "Stocks"
        db_table = "stock"

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
            return "sin_stock"
        elif self.cantidad <= self.cantidad_minima:
            return "critico"
        elif self.cantidad <= (self.cantidad_minima * 1.5):
            return "bajo"
        return "normal"
