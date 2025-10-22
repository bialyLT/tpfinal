from django.contrib import admin
from .models import Servicio, Reserva, Diseno, DisenoProducto, ImagenDiseno, ImagenReserva, ReservaEmpleado


class ReservaEmpleadoInline(admin.TabularInline):
    model = ReservaEmpleado
    extra = 1
    fields = ('empleado', 'rol', 'notas')
    raw_id_fields = ['empleado']  # Usar raw_id en lugar de autocomplete


class ImagenReservaInline(admin.TabularInline):
    model = ImagenReserva
    extra = 1
    fields = ('imagen', 'tipo_imagen', 'descripcion')
    readonly_fields = ['fecha_subida']


class DisenoProductoInline(admin.TabularInline):
    model = DisenoProducto
    extra = 1
    fields = ('producto', 'cantidad', 'precio_unitario', 'notas')
    autocomplete_fields = ['producto']


class ImagenDisenoInline(admin.TabularInline):
    model = ImagenDiseno
    extra = 1
    fields = ('imagen', 'descripcion', 'orden')


@admin.register(Servicio)
class ServicioAdmin(admin.ModelAdmin):
    list_display = ('id_servicio', 'nombre', 'tipo', 'precio', 'duracion_estimada', 'activo')
    list_filter = ('activo', 'tipo')
    search_fields = ('nombre', 'descripcion')
    ordering = ('nombre',)
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('nombre', 'tipo', 'descripcion')
        }),
        ('Detalles', {
            'fields': ('duracion_estimada', 'precio', 'activo')
        }),
    )


@admin.register(Reserva)
class ReservaAdmin(admin.ModelAdmin):
    list_display = ('id_reserva', 'cliente', 'servicio', 'fecha_reserva', 'fecha_solicitud', 'estado')
    list_filter = ('estado', 'fecha_reserva', 'fecha_solicitud')
    search_fields = ('cliente__persona__nombre', 'cliente__persona__apellido', 'servicio__nombre')
    ordering = ('-fecha_solicitud',)
    inlines = [ImagenReservaInline, ReservaEmpleadoInline]
    
    fieldsets = (
        ('Reserva', {
            'fields': ('cliente', 'servicio', 'fecha_reserva')
        }),
        ('Estado', {
            'fields': ('estado', 'observaciones')
        }),
        ('Fechas', {
            'fields': ('fecha_solicitud',),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('fecha_solicitud',)
    
    actions = ['confirmar_reservas', 'cancelar_reservas']
    
    def confirmar_reservas(self, request, queryset):
        for reserva in queryset:
            reserva.confirmar()
        self.message_user(request, f'{queryset.count()} reserva(s) confirmada(s).')
    confirmar_reservas.short_description = 'Confirmar reservas seleccionadas'
    
    def cancelar_reservas(self, request, queryset):
        for reserva in queryset:
            reserva.cancelar()
        self.message_user(request, f'{queryset.count()} reserva(s) cancelada(s).')
    cancelar_reservas.short_description = 'Cancelar reservas seleccionadas'


@admin.register(Diseno)
class DisenoAdmin(admin.ModelAdmin):
    list_display = ('id_diseno', 'titulo', 'servicio', 'disenador', 'presupuesto', 'estado', 'fecha_creacion')
    list_filter = ('estado', 'fecha_creacion', 'fecha_presentacion')
    search_fields = ('titulo', 'descripcion', 'servicio__nombre')
    ordering = ('-fecha_creacion',)
    inlines = [DisenoProductoInline, ImagenDisenoInline]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('titulo', 'descripcion', 'servicio', 'disenador')
        }),
        ('Presupuesto y Estado', {
            'fields': ('presupuesto', 'estado')
        }),
        ('Observaciones', {
            'fields': ('observaciones_cliente', 'notas_internas'),
            'classes': ('collapse',)
        }),
        ('Fechas', {
            'fields': ('fecha_creacion', 'fecha_presentacion', 'fecha_respuesta'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('fecha_creacion', 'fecha_presentacion', 'fecha_respuesta')
    
    actions = ['presentar_disenos', 'marcar_aceptados']
    
    def presentar_disenos(self, request, queryset):
        for diseno in queryset:
            diseno.presentar()
        self.message_user(request, f'{queryset.count()} diseño(s) presentado(s).')
    presentar_disenos.short_description = 'Presentar diseños seleccionados'
    
    def marcar_aceptados(self, request, queryset):
        for diseno in queryset:
            diseno.aceptar()
        self.message_user(request, f'{queryset.count()} diseño(s) aceptado(s).')
    marcar_aceptados.short_description = 'Marcar diseños como aceptados'


@admin.register(ImagenDiseno)
class ImagenDisenoAdmin(admin.ModelAdmin):
    list_display = ('id_imagen_diseno', 'diseno', 'descripcion', 'orden', 'fecha_subida')
    list_filter = ('fecha_subida',)
    search_fields = ('diseno__titulo', 'descripcion')
    ordering = ('diseno', 'orden')
