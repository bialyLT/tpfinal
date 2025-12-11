from django.contrib import admin

from .models import Categoria, Marca, Producto, Stock


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ("id_categoria", "nombre_categoria")
    search_fields = ("nombre_categoria",)
    ordering = ("nombre_categoria",)


@admin.register(Marca)
class MarcaAdmin(admin.ModelAdmin):
    list_display = ("id_marca", "nombre_marca")
    search_fields = ("nombre_marca",)
    ordering = ("nombre_marca",)


class StockInline(admin.TabularInline):
    model = Stock
    extra = 0
    fields = ("cantidad", "cantidad_minima")
    readonly_fields = ("cantidad",)


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = (
        "id_producto",
        "nombre",
        "categoria",
        "marca",
        "precio",
        "get_stock",
    )
    list_filter = ("categoria", "marca")
    search_fields = ("nombre", "descripcion")
    ordering = ("nombre",)
    inlines = [StockInline]

    def get_stock(self, obj):
        try:
            return obj.stock.cantidad
        except Stock.DoesNotExist:
            return "Sin stock"

    get_stock.short_description = "Stock"


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ("id_stock", "get_producto_nombre", "cantidad", "cantidad_minima")
    list_filter = ("cantidad_minima",)
    search_fields = ("producto__nombre",)
    ordering = ("producto__nombre",)

    def get_producto_nombre(self, obj):
        return obj.producto.nombre

    get_producto_nombre.short_description = "Producto"
