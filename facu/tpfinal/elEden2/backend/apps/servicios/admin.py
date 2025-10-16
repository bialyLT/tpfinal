from django.contrib import admin
from .models import Servicio, Reserva


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
