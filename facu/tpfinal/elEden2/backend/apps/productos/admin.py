from django.contrib import admin
from .models import Categoria, Marca, Unidad, Producto, Stock, MovimientoStock


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'activo', 'fecha_creacion')
    list_filter = ('activo', 'fecha_creacion')
    search_fields = ('nombre', 'descripcion')
    ordering = ('nombre',)


@admin.register(Marca)
class MarcaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'activo', 'fecha_creacion')
    list_filter = ('activo', 'fecha_creacion')
    search_fields = ('nombre', 'descripcion')
    ordering = ('nombre',)


@admin.register(Unidad)
class UnidadAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'abreviatura', 'activo', 'fecha_creacion')
    list_filter = ('activo', 'fecha_creacion')
    search_fields = ('nombre', 'abreviatura', 'descripcion')
    ordering = ('nombre',)


class StockInline(admin.TabularInline):
    model = Stock
    extra = 0
    readonly_fields = ('fecha_ultima_entrada', 'fecha_ultima_salida', 'fecha_actualizacion')


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nombre', 'tipo_producto', 'categoria', 'marca', 'precio_cliente', 'estado', 'stock_actual')
    list_filter = ('estado', 'tipo_producto', 'categoria', 'marca', 'requiere_stock', 'es_perecedero')
    search_fields = ('codigo', 'nombre', 'descripcion', 'codigo_barras')
    ordering = ('nombre',)
    inlines = [StockInline]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('codigo', 'nombre', 'descripcion', 'tipo_producto', 'categoria', 'marca', 'unidad')
        }),
        ('Precios', {
            'fields': ('precio_costo', 'precio_cliente')
        }),
        ('Características de Jardinería', {
            'fields': ('es_perecedero', 'requiere_refrigeracion', 'epoca_siembra', 'cuidados_especiales')
        }),
        ('Características Físicas', {
            'fields': ('peso', 'dimensiones', 'imagen'),
            'classes': ('collapse',)
        }),
        ('Configuración', {
            'fields': ('estado', 'requiere_stock', 'codigo_barras')
        }),
    )
    
    readonly_fields = ('fecha_creacion', 'fecha_actualizacion')

    def stock_actual(self, obj):
        return obj.stock_actual
    stock_actual.short_description = 'Stock'


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ('producto', 'cantidad_actual', 'cantidad_minima', 'estado_stock', 'ubicacion')
    list_filter = ('fecha_ultima_entrada', 'fecha_ultima_salida')
    search_fields = ('producto__nombre', 'producto__codigo', 'ubicacion')
    ordering = ('producto__nombre',)
    
    readonly_fields = ('fecha_ultima_entrada', 'fecha_ultima_salida', 'fecha_actualizacion')

    def estado_stock(self, obj):
        estado = obj.estado_stock
        colors = {
            'sin_stock': 'red',
            'critico': 'orange',
            'bajo': 'yellow',
            'normal': 'green',
            'exceso': 'blue'
        }
        return f'<span style="color: {colors.get(estado, "black")}">{estado.replace("_", " ").title()}</span>'
    estado_stock.allow_tags = True
    estado_stock.short_description = 'Estado'


@admin.register(MovimientoStock)
class MovimientoStockAdmin(admin.ModelAdmin):
    list_display = ('producto', 'tipo', 'motivo', 'cantidad', 'fecha_movimiento', 'numero_documento')
    list_filter = ('tipo', 'motivo', 'fecha_movimiento')
    search_fields = ('producto__nombre', 'producto__codigo', 'observaciones', 'numero_documento')
    ordering = ('-fecha_movimiento',)
    
    readonly_fields = ('stock_anterior', 'stock_posterior', 'fecha_creacion')
    
    fieldsets = (
        ('Movimiento', {
            'fields': ('producto', 'tipo', 'motivo', 'cantidad')
        }),
        ('Detalles', {
            'fields': ('observaciones', 'numero_documento', 'fecha_movimiento')
        }),
        ('Stock', {
            'fields': ('stock_anterior', 'stock_posterior'),
            'classes': ('collapse',)
        }),
    )
