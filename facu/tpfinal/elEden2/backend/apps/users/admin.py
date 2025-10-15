from django.contrib import admin
from .models import Genero, TipoDocumento, Localidad, Persona, Cliente, Proveedor


@admin.register(Genero)
class GeneroAdmin(admin.ModelAdmin):
    list_display = ('id_genero', 'genero')
    search_fields = ('genero',)
    ordering = ('genero',)


@admin.register(TipoDocumento)
class TipoDocumentoAdmin(admin.ModelAdmin):
    list_display = ('id_tipo_documento', 'tipo')
    search_fields = ('tipo',)
    ordering = ('tipo',)


@admin.register(Localidad)
class LocalidadAdmin(admin.ModelAdmin):
    list_display = ('id_localidad', 'cp', 'nombre_localidad', 'nombre_provincia')
    list_filter = ('nombre_provincia',)
    search_fields = ('cp', 'nombre_localidad', 'nombre_provincia')
    ordering = ('nombre_provincia', 'nombre_localidad')


@admin.register(Persona)
class PersonaAdmin(admin.ModelAdmin):
    list_display = ('id_persona', 'nombre', 'apellido', 'nro_documento', 'email', 'telefono')
    list_filter = ('genero', 'tipo_documento', 'localidad__nombre_provincia')
    search_fields = ('nombre', 'apellido', 'nro_documento', 'email', 'telefono')
    ordering = ('apellido', 'nombre')
    
    fieldsets = (
        ('Informacion Personal', {
            'fields': ('nombre', 'apellido', 'genero')
        }),
        ('Documentacion', {
            'fields': ('tipo_documento', 'nro_documento')
        }),
        ('Contacto', {
            'fields': ('email', 'telefono')
        }),
        ('Direccion', {
            'fields': ('calle', 'numero', 'piso', 'dpto', 'localidad')
        }),
    )


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ('id_cliente', 'get_nombre_completo', 'get_email', 'fecha_registro', 'activo')
    list_filter = ('activo', 'fecha_registro')
    search_fields = ('persona__nombre', 'persona__apellido', 'persona__email')
    ordering = ('-fecha_registro',)
    
    def get_nombre_completo(self, obj):
        return f"{obj.persona.apellido}, {obj.persona.nombre}"
    get_nombre_completo.short_description = 'Nombre'
    
    def get_email(self, obj):
        return obj.persona.email
    get_email.short_description = 'Email'


@admin.register(Proveedor)
class ProveedorAdmin(admin.ModelAdmin):
    list_display = ('id_proveedor', 'razon_social', 'cuit', 'get_nombre_contacto', 'fecha_alta', 'activo')
    list_filter = ('activo', 'fecha_alta')
    search_fields = ('razon_social', 'cuit', 'persona__nombre', 'persona__apellido')
    ordering = ('razon_social',)
    
    def get_nombre_contacto(self, obj):
        return f"{obj.persona.apellido}, {obj.persona.nombre}"
    get_nombre_contacto.short_description = 'Contacto'
