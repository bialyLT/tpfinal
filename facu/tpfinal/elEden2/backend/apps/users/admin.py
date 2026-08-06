from django.contrib import admin
from django.shortcuts import get_object_or_404
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils.html import format_html

from apps.encuestas.models import Respuesta

from .models import Cliente, Empleado, Genero, Localidad, Persona, Proveedor, TipoDocumento


@admin.register(Genero)
class GeneroAdmin(admin.ModelAdmin):
    list_display = ("id_genero", "genero")
    search_fields = ("genero",)
    ordering = ("genero",)


@admin.register(TipoDocumento)
class TipoDocumentoAdmin(admin.ModelAdmin):
    list_display = ("id_tipo_documento", "tipo")
    search_fields = ("tipo",)
    ordering = ("tipo",)


@admin.register(Localidad)
class LocalidadAdmin(admin.ModelAdmin):
    list_display = ("id_localidad", "cp", "nombre_localidad", "nombre_provincia")
    list_filter = ("nombre_provincia",)
    search_fields = ("cp", "nombre_localidad", "nombre_provincia")
    ordering = ("nombre_provincia", "nombre_localidad")


@admin.register(Persona)
class PersonaAdmin(admin.ModelAdmin):
    list_display = (
        "id_persona",
        "nombre",
        "apellido",
        "nro_documento",
        "email",
        "telefono",
    )
    list_filter = ("genero", "tipo_documento", "localidad__nombre_provincia")
    search_fields = ("nombre", "apellido", "nro_documento", "email", "telefono")
    ordering = ("apellido", "nombre")

    fieldsets = (
        ("Informacion Personal", {"fields": ("nombre", "apellido", "genero")}),
        ("Documentacion", {"fields": ("tipo_documento", "nro_documento")}),
        ("Contacto", {"fields": ("email", "telefono")}),
        ("Direccion", {"fields": ("calle", "numero", "piso", "dpto", "localidad")}),
    )


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = (
        "id_cliente",
        "get_nombre_completo",
        "get_email",
        "fecha_registro",
        "activo",
    )
    list_filter = ("activo", "fecha_registro")
    search_fields = ("persona__nombre", "persona__apellido", "persona__email")
    ordering = ("-fecha_registro",)

    def get_nombre_completo(self, obj):
        return f"{obj.persona.apellido}, {obj.persona.nombre}"

    get_nombre_completo.short_description = "Nombre"

    def get_email(self, obj):
        return obj.persona.email

    get_email.short_description = "Email"


@admin.register(Proveedor)
class ProveedorAdmin(admin.ModelAdmin):
    list_display = (
        "id_proveedor",
        "razon_social",
        "cuit",
        "get_nombre_contacto",
        "fecha_alta",
        "activo",
    )
    list_filter = ("activo", "fecha_alta")
    search_fields = ("razon_social", "cuit", "persona__nombre", "persona__apellido")
    ordering = ("razon_social",)

    def get_nombre_contacto(self, obj):
        return f"{obj.persona.apellido}, {obj.persona.nombre}"

    get_nombre_contacto.short_description = "Contacto"


@admin.register(Empleado)
class EmpleadoAdmin(admin.ModelAdmin):
    list_display = (
        "id_empleado",
        "get_nombre_completo",
        "get_email",
        "puntuacion_promedio",
        "puntuacion_cantidad",
        "activo",
        "ver_calificaciones",
    )
    list_filter = ("activo", "cargo")
    search_fields = ("persona__nombre", "persona__apellido", "persona__email", "cargo")
    ordering = ("-fecha_contratacion",)
    readonly_fields = (
        "puntuacion_acumulada",
        "puntuacion_cantidad",
        "puntuacion_promedio",
        "fecha_ultima_puntuacion",
        "evaluaciones_bajas_consecutivas",
        "fecha_baja_automatica",
        "motivo_baja_automatica",
    )

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "<path:empleado_id>/calificaciones/",
                self.admin_site.admin_view(self.calificaciones_view),
                name="users_empleado_calificaciones",
            ),
        ]
        return custom_urls + urls

    def get_nombre_completo(self, obj):
        return f"{obj.persona.apellido}, {obj.persona.nombre}"

    get_nombre_completo.short_description = "Nombre"

    def get_email(self, obj):
        return obj.persona.email

    get_email.short_description = "Email"

    def ver_calificaciones(self, obj):
        url = reverse("admin:users_empleado_calificaciones", args=[obj.pk])
        return format_html('<a class="button" href="{}">Ver calificaciones</a>', url)

    ver_calificaciones.short_description = "Calificaciones"

    def calificaciones_view(self, request, empleado_id):
        empleado = get_object_or_404(Empleado.objects.select_related("persona"), pk=empleado_id)
        respuestas = (
            Respuesta.objects.select_related(
                "pregunta",
                "encuesta_respuesta__encuesta",
                "encuesta_respuesta__cliente__persona",
                "encuesta_respuesta__reserva",
            )
            .filter(
                pregunta__impacta_puntuacion=True,
                pregunta__tipo="escala",
                valor_numerico__lt=10,
                valor_numerico__isnull=False,
                encuesta_respuesta__estado="completada",
                encuesta_respuesta__reserva__empleados=empleado,
                encuesta_respuesta__reserva__isnull=False,
            )
            .order_by("-encuesta_respuesta__fecha_realizacion", "pregunta__id_pregunta")
        )

        context = {
            **self.admin_site.each_context(request),
            "title": f"Calificaciones de {empleado.persona.apellido}, {empleado.persona.nombre}",
            "empleado": empleado,
            "respuestas": respuestas,
            "detalle_url": reverse("admin:users_empleado_change", args=[empleado.pk]),
            "total_respuestas": respuestas.count(),
        }
        return TemplateResponse(request, "admin/users/empleado/calificaciones.html", context)
