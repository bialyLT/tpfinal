from django.contrib import admin
from .models import (
    TipoServicio, SolicitudServicio, ImagenSolicitud, PropuestaDiseño,
    Servicio, EmpleadoDisponibilidad, AsignacionEmpleado, 
    ServicioProducto, ActualizacionServicio
)


@admin.register(TipoServicio)
class TipoServicioAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'precio_base', 'duracion_estimada_horas', 'requiere_diseño', 'activo')
    list_filter = ('categoria', 'requiere_diseño', 'activo')
    search_fields = ('nombre', 'descripcion')
    ordering = ('categoria', 'nombre')


class ImagenSolicitudInline(admin.TabularInline):
    model = ImagenSolicitud
    extra = 1


@admin.register(SolicitudServicio)
class SolicitudServicioAdmin(admin.ModelAdmin):
    list_display = ('numero_solicitud', 'cliente', 'tipo_servicio', 'estado', 'prioridad', 'fecha_solicitud')
    list_filter = ('estado', 'prioridad', 'tipo_servicio', 'fecha_solicitud')
    search_fields = ('numero_solicitud', 'titulo', 'cliente__username', 'descripcion')
    ordering = ('-fecha_solicitud',)
    
    inlines = [ImagenSolicitudInline]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('numero_solicitud', 'cliente', 'tipo_servicio', 'titulo', 'descripcion')
        }),
        ('Detalles del Proyecto', {
            'fields': ('area_aproximada', 'presupuesto_maximo', 'observaciones_cliente')
        }),
        ('Ubicación', {
            'fields': ('direccion_servicio', 'ciudad_servicio', 'provincia_servicio')
        }),
        ('Gestión', {
            'fields': ('estado', 'prioridad', 'diseñador_asignado', 'fecha_limite_diseño')
        }),
        ('Observaciones Internas', {
            'fields': ('observaciones_internas',),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('numero_solicitud', 'fecha_solicitud', 'fecha_asignacion', 'fecha_actualizacion')


@admin.register(PropuestaDiseño)
class PropuestaDiseñoAdmin(admin.ModelAdmin):
    list_display = ('solicitud', 'diseñador', 'version', 'estado', 'presupuesto_estimado', 'fecha_creacion')
    list_filter = ('estado', 'diseñador', 'fecha_creacion')
    search_fields = ('solicitud__numero_solicitud', 'titulo', 'descripcion_diseño')
    ordering = ('-fecha_creacion',)
    
    readonly_fields = ('version', 'fecha_creacion', 'fecha_envio', 'fecha_respuesta_cliente')


class AsignacionEmpleadoInline(admin.TabularInline):
    model = AsignacionEmpleado
    extra = 1


class ServicioProductoInline(admin.TabularInline):
    model = ServicioProducto
    extra = 1
    readonly_fields = ('costo_total',)


@admin.register(Servicio)
class ServicioAdmin(admin.ModelAdmin):
    list_display = ('numero_servicio', 'cliente', 'estado', 'fecha_programada', 'progreso_porcentaje')
    list_filter = ('estado', 'fecha_programada')
    search_fields = ('numero_servicio', 'cliente__username', 'solicitud__titulo')
    ordering = ('-fecha_programada',)
    
    inlines = [AsignacionEmpleadoInline, ServicioProductoInline]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('numero_servicio', 'cliente', 'solicitud', 'propuesta_aprobada')
        }),
        ('Programación', {
            'fields': ('fecha_programada', 'fecha_inicio_real', 'fecha_finalizacion_real')
        }),
        ('Estado', {
            'fields': ('estado', 'progreso_porcentaje')
        }),
        ('Pago', {
            'fields': ('pago',)
        }),
        ('Observaciones', {
            'fields': ('observaciones_ejecucion', 'observaciones_finalizacion'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('numero_servicio', 'fecha_creacion', 'fecha_actualizacion')


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
