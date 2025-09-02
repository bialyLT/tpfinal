from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from .models import (
    Persona, Rol, Pago,
    MetodoPago, HistorialAcceso, ConfiguracionUsuario
)


# Desregistrar el modelo Group por defecto para usar nuestro Rol
admin.site.unregister(Group)


@admin.register(Persona)
class PersonaAdmin(admin.ModelAdmin):
    list_display = ('numero_documento', 'apellidos', 'nombres', 'telefono', 'ciudad', 'activo')
    list_filter = ('tipo_documento', 'genero', 'provincia', 'activo', 'fecha_creacion')
    search_fields = ('nombres', 'apellidos', 'numero_documento', 'telefono')
    ordering = ('apellidos', 'nombres')

    fieldsets = (
        ('Información Personal', {
            'fields': ('nombres', 'apellidos', 'fecha_nacimiento', 'genero')
        }),
        ('Documentación', {
            'fields': ('tipo_documento', 'numero_documento')
        }),
        ('Contacto', {
            'fields': ('telefono', 'telefono_alternativo')
        }),
        ('Dirección', {
            'fields': ('direccion', 'ciudad', 'provincia', 'codigo_postal', 'pais'),
            'classes': ('collapse',)
        }),
        ('Configuración', {
            'fields': ('activo', 'observaciones')
        }),
    )

    readonly_fields = ('fecha_creacion', 'fecha_actualizacion')


@admin.register(Rol)
class RolAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'nivel_acceso', 'activo', 'fecha_creacion')
    list_filter = ('nivel_acceso', 'activo', 'fecha_creacion')
    search_fields = ('grupo__name', 'descripcion')
    ordering = ('nivel_acceso', 'grupo__name')

    readonly_fields = ('fecha_creacion', 'fecha_actualizacion')


class ConfiguracionUsuarioInline(admin.StackedInline):
    model = ConfiguracionUsuario
    extra = 0


@admin.register(MetodoPago)
class MetodoPagoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'tipo', 'comision_porcentaje', 'comision_fija', 'activo')
    list_filter = ('tipo', 'activo', 'requiere_autorizacion')
    search_fields = ('nombre', 'descripcion')
    ordering = ('nombre',)

    readonly_fields = ('fecha_creacion', 'fecha_actualizacion')


@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = ('numero_transaccion', 'user', 'metodo_pago', 'monto', 'estado', 'fecha_pago')
    list_filter = ('estado', 'tipo_transaccion', 'metodo_pago', 'fecha_pago')
    search_fields = ('numero_transaccion', 'user__username', 'user__persona__nombres',
                    'user__persona__apellidos', 'referencia_externa')
    ordering = ('-fecha_pago',)

    fieldsets = (
        ('Información del Pago', {
            'fields': ('numero_transaccion', 'user', 'metodo_pago', 'tipo_transaccion')
        }),
        ('Montos', {
            'fields': ('monto', 'monto_comision', 'monto_neto')
        }),
        ('Estado', {
            'fields': ('estado', 'fecha_pago', 'fecha_procesamiento', 'fecha_completado')
        }),
        ('Información Adicional', {
            'fields': ('referencia_externa', 'descripcion', 'observaciones'),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ('numero_transaccion', 'monto_neto', 'fecha_creacion', 'fecha_actualizacion')


@admin.register(HistorialAcceso)
class HistorialAccesoAdmin(admin.ModelAdmin):
    list_display = ('user', 'ip_address', 'fecha_acceso', 'accion', 'exitoso')
    list_filter = ('exitoso', 'fecha_acceso')
    search_fields = ('user__username', 'ip_address', 'accion')
    ordering = ('-fecha_acceso',)

    readonly_fields = ('fecha_acceso',)


@admin.register(ConfiguracionUsuario)
class ConfiguracionUsuarioAdmin(admin.ModelAdmin):
    list_display = ('user', 'tema', 'idioma', 'productos_por_pagina')
    list_filter = ('tema', 'idioma', 'notif_stock_bajo')
    search_fields = ('user__username',)
    ordering = ('user__username',)

    readonly_fields = ('fecha_creacion', 'fecha_actualizacion')
