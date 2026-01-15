from django.contrib import admin

from .models import Compra, DetalleCompra, Pago


@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = ("id_pago", "tipo", "descripcion")
    search_fields = ("tipo",)
    ordering = ("tipo",)


class DetalleCompraInline(admin.TabularInline):
    model = DetalleCompra
    extra = 1
    fields = ("producto", "cantidad", "precio_unitario", "subtotal")
    readonly_fields = ("subtotal",)


@admin.register(Compra)
class CompraAdmin(admin.ModelAdmin):
    list_display = ("id_compra", "proveedor", "fecha", "total")
    list_filter = ("proveedor", "fecha")
    search_fields = ("proveedor__razon_social", "observaciones")
    ordering = ("-fecha",)
    readonly_fields = ("total", "fecha_creacion", "fecha_actualizacion")
    inlines = [DetalleCompraInline]


@admin.register(DetalleCompra)
class DetalleCompraAdmin(admin.ModelAdmin):
    list_display = (
        "id_detalle_compra",
        "compra",
        "producto",
        "cantidad",
        "precio_unitario",
        "subtotal",
    )
    list_filter = ("compra__fecha",)
    search_fields = ("compra__id_compra", "producto__nombre")
    ordering = ("-fecha_creacion",)
    readonly_fields = ("subtotal", "fecha_creacion")
