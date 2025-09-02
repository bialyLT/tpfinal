from django.contrib import admin
from .models import (
    TipoEncuesta, Encuesta, Pregunta, RespuestaEncuesta,
    DetallePregunta, EncuestaServicio
)


@admin.register(TipoEncuesta)
class TipoEncuestaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'activo', 'fecha_creacion')
    list_filter = ('activo', 'fecha_creacion')
    search_fields = ('nombre', 'descripcion')
    ordering = ('nombre',)


class PreguntaInline(admin.TabularInline):
    model = Pregunta
    extra = 1
    ordering = ('orden',)


@admin.register(Encuesta)
class EncuestaAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'cliente', 'tipo_encuesta', 'estado', 'fecha_envio', 'fecha_expiracion')
    list_filter = ('estado', 'tipo_encuesta', 'fecha_envio', 'email_enviado')
    search_fields = ('titulo', 'cliente__username', 'cliente__email')
    ordering = ('-fecha_envio',)
    
    inlines = [PreguntaInline]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('tipo_encuesta', 'cliente', 'titulo', 'descripcion')
        }),
        ('Configuración', {
            'fields': ('fecha_expiracion', 'permite_respuesta_anonima')
        }),
        ('Estado', {
            'fields': ('estado', 'email_enviado', 'token_acceso')
        }),
    )
    
    readonly_fields = ('token_acceso', 'fecha_envio', 'fecha_respuesta', 'fecha_actualizacion')


class DetallePreguntaInline(admin.TabularInline):
    model = DetallePregunta
    extra = 0
    readonly_fields = ('respuesta_formateada',)


@admin.register(RespuestaEncuesta)
class RespuestaEncuestaAdmin(admin.ModelAdmin):
    list_display = ('encuesta', 'cliente', 'calificacion_general', 'satisfaccion_texto', 'fecha_respuesta')
    list_filter = ('calificacion_general', 'fecha_respuesta')
    search_fields = ('encuesta__titulo', 'cliente__username', 'comentario_general')
    ordering = ('-fecha_respuesta',)
    
    inlines = [DetallePreguntaInline]
    
    readonly_fields = ('fecha_respuesta', 'tiempo_respuesta_minutos', 'satisfaccion_texto')


@admin.register(EncuestaServicio)
class EncuestaServicioAdmin(admin.ModelAdmin):
    list_display = ('encuesta', 'servicio_id', 'fecha_creacion')
    search_fields = ('encuesta__titulo', 'servicio_id')
    ordering = ('-fecha_creacion',)
