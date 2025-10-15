from django.contrib import admin
from .models import Encuesta, Pregunta, EncuestaRespuesta, Respuesta


class PreguntaInline(admin.TabularInline):
    model = Pregunta
    extra = 1
    fields = ('texto', 'tipo', 'orden', 'obligatoria')


@admin.register(Encuesta)
class EncuestaAdmin(admin.ModelAdmin):
    list_display = ('id_encuesta', 'titulo', 'activa', 'fecha_creacion')
    list_filter = ('activa', 'fecha_creacion')
    search_fields = ('titulo', 'descripcion')
    ordering = ('-fecha_creacion',)
    inlines = [PreguntaInline]


@admin.register(Pregunta)
class PreguntaAdmin(admin.ModelAdmin):
    list_display = ('id_pregunta', 'encuesta', 'texto_corto', 'tipo', 'orden', 'obligatoria')
    list_filter = ('tipo', 'obligatoria', 'encuesta')
    search_fields = ('texto',)
    ordering = ('encuesta', 'orden')
    
    def texto_corto(self, obj):
        return obj.texto[:50] + '...' if len(obj.texto) > 50 else obj.texto
    texto_corto.short_description = 'Texto'


class RespuestaInline(admin.TabularInline):
    model = Respuesta
    extra = 0
    readonly_fields = ('pregunta', 'valor_texto', 'valor_numerico', 'valor_boolean')
    can_delete = False


@admin.register(EncuestaRespuesta)
class EncuestaRespuestaAdmin(admin.ModelAdmin):
    list_display = ('id_encuesta_respuesta', 'cliente', 'encuesta', 'estado', 'fecha_inicio', 'fecha_completada')
    list_filter = ('estado', 'fecha_inicio', 'encuesta')
    search_fields = ('cliente__persona__nombre', 'cliente__persona__apellido', 'encuesta__titulo')
    ordering = ('-fecha_inicio',)
    inlines = [RespuestaInline]
    readonly_fields = ('fecha_inicio',)
    
    actions = ['completar_encuestas']
    
    def completar_encuestas(self, request, queryset):
        for encuesta_resp in queryset:
            if encuesta_resp.estado == 'iniciada':
                encuesta_resp.completar()
        self.message_user(request, f'{queryset.count()} encuesta(s) completada(s).')
    completar_encuestas.short_description = 'Completar encuestas seleccionadas'


@admin.register(Respuesta)
class RespuestaAdmin(admin.ModelAdmin):
    list_display = ('id_respuesta', 'encuesta_respuesta', 'pregunta_texto', 'valor_respuesta')
    list_filter = ('pregunta__tipo', 'fecha_creacion')
    search_fields = ('pregunta__texto', 'valor_texto')
    ordering = ('-fecha_creacion',)
    readonly_fields = ('fecha_creacion',)
    
    def pregunta_texto(self, obj):
        return obj.pregunta.texto[:50] + '...' if len(obj.pregunta.texto) > 50 else obj.pregunta.texto
    pregunta_texto.short_description = 'Pregunta'
    
    def valor_respuesta(self, obj):
        return obj.get_valor()
    valor_respuesta.short_description = 'Respuesta'
