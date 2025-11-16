from django.contrib import admin
from .models import (
    Servicio, Reserva, Diseno, DisenoProducto, ImagenDiseno, 
    ImagenReserva, ReservaEmpleado, ConfiguracionPago
)


@admin.register(ConfiguracionPago)
class ConfiguracionPagoAdmin(admin.ModelAdmin):
    list_display = ('id', 'monto_sena', 'porcentaje_sena', 'fecha_actualizacion', 'actualizado_por')
    readonly_fields = ('fecha_actualizacion',)
    
    fieldsets = (
        ('Configuración de Seña', {
            'fields': ('monto_sena', 'porcentaje_sena'),
            'description': 'Configure el monto de seña requerido para las reservas. Use monto fijo O porcentaje (no ambos).'
        }),
        ('Información', {
            'fields': ('actualizado_por', 'fecha_actualizacion'),
        }),
    )
    
    def save_model(self, request, obj, form, change):
        obj.actualizado_por = request.user
        super().save_model(request, obj, form, change)
    
    def has_add_permission(self, request):
        # Solo permitir una configuración
        return not ConfiguracionPago.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # No permitir eliminar la configuración
        return False


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
    list_display = ('id_servicio', 'nombre', 'activo', 'reprogramable_por_clima', 'fecha_creacion')
    list_filter = ('activo', 'reprogramable_por_clima')
    search_fields = ('nombre', 'descripcion')
    ordering = ('nombre',)
    readonly_fields = ('fecha_creacion', 'fecha_actualizacion')
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('nombre', 'descripcion', 'activo', 'reprogramable_por_clima')
        }),
        ('Fechas', {
            'fields': ('fecha_creacion', 'fecha_actualizacion'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Reserva)
class ReservaAdmin(admin.ModelAdmin):
    list_display = ('id_reserva', 'cliente', 'servicio', 'fecha_reserva', 'estado', 'estado_pago_sena', 'estado_pago_final')
    list_filter = ('estado', 'estado_pago_sena', 'estado_pago_final', 'fecha_reserva', 'fecha_solicitud')
    search_fields = ('cliente__persona__nombre', 'cliente__persona__apellido', 'servicio__nombre')
    ordering = ('-fecha_solicitud',)
    inlines = [ImagenReservaInline, ReservaEmpleadoInline]
    
    fieldsets = (
        ('Reserva', {
            'fields': ('cliente', 'servicio', 'fecha_reserva', 'direccion')
        }),
        ('Estado', {
            'fields': ('estado', 'observaciones')
        }),
        ('💰 Pago Inicial (Seña)', {
            'fields': ('monto_sena', 'estado_pago_sena', 'fecha_pago_sena', 'payment_id_sena'),
            'classes': ('collapse',),
            'description': 'Pago inicial requerido para confirmar la solicitud de servicio'
        }),
        ('💰 Pago Final', {
            'fields': ('monto_total', 'monto_final', 'estado_pago_final', 'fecha_pago_final', 'payment_id_final'),
            'classes': ('collapse',),
            'description': 'Pago final al aceptar la propuesta de diseño (total - seña)'
        }),
        ('⚠️ Estado General', {
            'fields': ('estado_pago',),
            'classes': ('collapse',),
            'description': 'Estado general de pago'
        }),
        ('Fechas', {
            'fields': ('fecha_solicitud', 'fecha_creacion', 'fecha_actualizacion'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('fecha_solicitud', 'fecha_creacion', 'fecha_actualizacion', 
                      'monto_final', 'payment_id_sena', 'payment_id_final')
    
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
