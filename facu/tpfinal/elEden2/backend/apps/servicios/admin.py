from django.contrib import admin
from .models import (
    TipoServicio,
    Servicio, 
    Diseño,
    ImagenServicio,
    EmpleadoDisponibilidad, 
    AsignacionEmpleado, 
    ServicioProducto, 
    ActualizacionServicio
)


@admin.register(TipoServicio)
class TipoServicioAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'precio_base', 'duracion_estimada_horas', 'requiere_diseño', 'activo')
    list_filter = ('categoria', 'requiere_diseño', 'activo')
    search_fields = ('nombre', 'descripcion')
    ordering = ('categoria', 'nombre')


class AsignacionEmpleadoInline(admin.TabularInline):
    model = AsignacionEmpleado
    extra = 1


class ServicioProductoInline(admin.TabularInline):
    model = ServicioProducto
    extra = 1
    readonly_fields = ('costo_total',)


class ImagenServicioInline(admin.TabularInline):
    model = ImagenServicio
    extra = 1
    fields = ('tipo_imagen', 'imagen', 'descripcion')


@admin.register(Diseño)
class DiseñoAdmin(admin.ModelAdmin):
    list_display = ('servicio', 'diseñador_asignado', 'presupuesto', 'fecha_creacion', 'fecha_actualizacion')
    list_filter = ('fecha_creacion', 'fecha_actualizacion', 'diseñador_asignado')
    search_fields = ('servicio__numero_servicio', 'diseñador_asignado__username', 'descripcion')
    ordering = ('-fecha_creacion',)
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('servicio', 'diseñador_asignado', 'descripcion')
        }),
        ('Presupuesto', {
            'fields': ('presupuesto',)
        }),
        ('Rechazo', {
            'fields': ('motivo_rechazo',),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('fecha_creacion', 'fecha_actualizacion')


@admin.register(Servicio)
class ServicioAdmin(admin.ModelAdmin):
    list_display = ('numero_servicio', 'cliente', 'estado', 'fecha_preferida', 'fecha_inicio', 'precio_final')
    list_filter = ('estado', 'fecha_preferida', 'fecha_inicio', 'tipo_servicio')
    search_fields = ('numero_servicio', 'cliente__username', 'cliente__first_name', 'cliente__last_name')
    ordering = ('-fecha_solicitud',)
    
    inlines = [ImagenServicioInline, AsignacionEmpleadoInline, ServicioProductoInline]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('numero_servicio', 'cliente', 'tipo_servicio', 'notas_adicionales')
        }),
        ('Ubicación', {
            'fields': ('direccion_servicio',)
        }),
        ('Fechas', {
            'fields': ('fecha_preferida', 'fecha_inicio', 'fecha_finalizacion')
        }),
        ('Estado y Precio', {
            'fields': ('estado', 'precio_final')
        }),
        ('Pago', {
            'fields': ('pago',)
        }),
    )
    
    readonly_fields = ('numero_servicio', 'fecha_solicitud', 'fecha_actualizacion', 'fecha_inicio', 'fecha_finalizacion')


@admin.register(EmpleadoDisponibilidad)
class EmpleadoDisponibilidadAdmin(admin.ModelAdmin):
    list_display = ('empleado', 'fecha', 'estado', 'horas_disponibles')
    list_filter = ('estado', 'fecha')
    search_fields = ('empleado__username', 'empleado__first_name', 'empleado__last_name')
    ordering = ('-fecha', 'empleado__username')
    
    date_hierarchy = 'fecha'


@admin.register(ActualizacionServicio)
class ActualizacionServicioAdmin(admin.ModelAdmin):
    list_display = ('servicio', 'empleado', 'progreso_nuevo', 'fecha_actualizacion')
    list_filter = ('fecha_actualizacion',)
    search_fields = ('servicio__numero_servicio', 'empleado__username', 'descripcion')
    ordering = ('-fecha_actualizacion',)
