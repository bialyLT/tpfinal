from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class Pago(models.Model):
    """Modelo para métodos de pago según diagrama ER"""

    id_pago = models.AutoField(primary_key=True)
    tipo = models.CharField(max_length=50)
    descripcion = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Método de Pago"
        verbose_name_plural = "Métodos de Pago"
        db_table = "pago"
        ordering = ["tipo"]

    def __str__(self):
        return self.tipo


class Compra(models.Model):
    """Modelo para registro de compras a proveedores

    El total se calcula automáticamente desde los detalles de la compra.
    Cuando se agregan productos a la compra, se suman cantidad * precio_unitario.
    """

    id_compra = models.AutoField(primary_key=True)
    fecha = models.DateTimeField(default=timezone.now)
    total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        blank=True,
        null=True,
        editable=False,
        help_text="Total calculado automáticamente desde los detalles",
    )
    observaciones = models.TextField(blank=True, null=True)

    # Relación con proveedor
    proveedor = models.ForeignKey("users.Proveedor", on_delete=models.PROTECT, related_name="compras")

    # Metadatos
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Compra"
        verbose_name_plural = "Compras"
        db_table = "compra"
        ordering = ["-fecha"]
        indexes = [
            models.Index(fields=["fecha"]),
            models.Index(fields=["proveedor"]),
        ]

    def __str__(self):
        total_display = f"${self.total}" if self.total else "$0.00"
        return f"Compra {self.id_compra} - {self.proveedor.razon_social} - {total_display}"

    def calcular_total(self):
        """
        Calcula y actualiza el total de la compra basado en los detalles.
        Suma todos los subtotales (cantidad * precio_unitario) de los detalles.

        Returns:
            Decimal: El total calculado
        """
        from decimal import Decimal

        total = sum((detalle.subtotal for detalle in self.detalles.all()), start=Decimal("0.00"))
        self.total = total
        self.save(update_fields=["total"])
        return total

    @property
    def total_actual(self):
        """
        Obtiene el total actual de la compra.
        Si no tiene total guardado, lo calcula desde los detalles.

        Returns:
            Decimal: El total actual de la compra
        """
        from decimal import Decimal

        if self.total is None or self.total == 0:
            if self.pk:  # Solo si ya está guardada
                return self.calcular_total()
            return Decimal("0.00")
        return self.total


class Venta(models.Model):
    """Modelo para ventas según diagrama ER"""

    id_venta = models.AutoField(primary_key=True)
    fecha = models.DateTimeField(default=timezone.now)
    total = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    observaciones = models.TextField(blank=True, null=True)

    # Relaciones según diagrama ER
    cliente = models.ForeignKey("users.Cliente", on_delete=models.PROTECT, related_name="ventas")
    pago = models.ForeignKey(Pago, on_delete=models.PROTECT, related_name="ventas")

    # Metadatos
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Venta"
        verbose_name_plural = "Ventas"
        db_table = "venta"
        ordering = ["-fecha"]
        indexes = [
            models.Index(fields=["fecha"]),
            models.Index(fields=["cliente"]),
        ]

    def __str__(self):
        return f"Venta {self.id_venta} - {self.cliente.persona.nombre_completo} - ${self.total}"

    def calcular_total(self):
        """Calcula el total de la venta basado en los detalles"""
        total = sum(detalle.subtotal for detalle in self.detalles.all())
        self.total = total
        self.save()
        return total


class DetalleVenta(models.Model):
    """Modelo para detalles de venta según diagrama ER"""

    id_detalle_venta = models.AutoField(primary_key=True)
    cantidad = models.IntegerField(validators=[MinValueValidator(1)])
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        editable=False,
    )

    # Relaciones según diagrama ER
    venta = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name="detalles")
    producto = models.ForeignKey("productos.Producto", on_delete=models.PROTECT, related_name="detalles_venta")

    # Metadatos
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Detalle de Venta"
        verbose_name_plural = "Detalles de Venta"
        db_table = "detalle_venta"
        unique_together = ["venta", "producto"]

    def __str__(self):
        return f"Detalle {self.id_detalle_venta} - {self.producto.nombre} x {self.cantidad}"

    def save(self, *args, **kwargs):
        # Calcular subtotal automáticamente
        self.subtotal = self.cantidad * self.precio_unitario
        super().save(*args, **kwargs)

        # Actualizar total de la venta
        self.venta.calcular_total()

    def delete(self, *args, **kwargs):
        venta = self.venta
        super().delete(*args, **kwargs)
        # Actualizar total de la venta después de eliminar
        venta.calcular_total()


class DetalleCompra(models.Model):
    """Modelo para detalles de compra - Registra productos comprados y actualiza stock"""

    id_detalle_compra = models.AutoField(primary_key=True)
    cantidad = models.IntegerField(validators=[MinValueValidator(1)])
    precio_unitario = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Precio de compra unitario del producto",
    )
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        editable=False,
    )

    # Relaciones
    compra = models.ForeignKey(Compra, on_delete=models.CASCADE, related_name="detalles")
    producto = models.ForeignKey("productos.Producto", on_delete=models.PROTECT, related_name="detalles_compra")

    # Metadatos
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Detalle de Compra"
        verbose_name_plural = "Detalles de Compra"
        db_table = "detalle_compra"
        unique_together = ["compra", "producto"]

    def __str__(self):
        return f"Detalle {self.id_detalle_compra} - {self.producto.nombre} x {self.cantidad}"

    def save(self, *args, **kwargs):
        # Calcular subtotal automáticamente
        self.subtotal = self.cantidad * self.precio_unitario

        # Determinar si es una creación o actualización
        es_nuevo = self.pk is None
        cantidad_anterior = 0

        if not es_nuevo:
            # Obtener la cantidad anterior antes de actualizar
            detalle_anterior = DetalleCompra.objects.get(pk=self.pk)
            cantidad_anterior = detalle_anterior.cantidad

        super().save(*args, **kwargs)

        # Actualizar el stock del producto
        from apps.productos.models import Stock

        stock, created = Stock.objects.get_or_create(
            producto=self.producto, defaults={"cantidad": 0, "cantidad_minima": 10}
        )

        if es_nuevo:
            # Nueva compra: sumar cantidad
            stock.cantidad += self.cantidad
        else:
            # Actualización: ajustar la diferencia
            diferencia = self.cantidad - cantidad_anterior
            stock.cantidad += diferencia

        stock.save()

        # Actualizar el precio del producto basado en el precio de compra
        # El precio del producto siempre será el más alto de todas las compras
        self.producto.calcular_precio_desde_compras()

        # Actualizar total de la compra
        self.compra.calcular_total()

    def delete(self, *args, **kwargs):
        compra = self.compra
        producto = self.producto
        cantidad = self.cantidad

        super().delete(*args, **kwargs)

        # Restar del stock
        from apps.productos.models import Stock

        try:
            stock = Stock.objects.get(producto=producto)
            stock.cantidad -= cantidad
            if stock.cantidad < 0:
                stock.cantidad = 0
            stock.save()
        except Stock.DoesNotExist:
            pass

        # Actualizar total de la compra
        compra.calcular_total()
