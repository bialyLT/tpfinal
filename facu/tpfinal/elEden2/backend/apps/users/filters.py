import django_filters
from django.db.models import Q

from .models import Pago, Persona, Usuario


class PersonaFilter(django_filters.FilterSet):
    nombre = django_filters.CharFilter(method="filter_nombre")
    edad_min = django_filters.NumberFilter(field_name="fecha_nacimiento", lookup_expr="year__lte")
    edad_max = django_filters.NumberFilter(field_name="fecha_nacimiento", lookup_expr="year__gte")

    class Meta:
        model = Persona
        fields = ["tipo_documento", "genero", "provincia", "activo"]

    def filter_nombre(self, queryset, name, value):
        return queryset.filter(Q(nombres__icontains=value) | Q(apellidos__icontains=value))


class UsuarioFilter(django_filters.FilterSet):
    nombre = django_filters.CharFilter(method="filter_nombre")
    rol = django_filters.CharFilter(field_name="roles__grupo__name", lookup_expr="icontains")
    nivel_acceso_min = django_filters.NumberFilter(field_name="roles__nivel_acceso", lookup_expr="gte")

    class Meta:
        model = Usuario
        fields = ["estado", "is_active", "is_staff"]

    def filter_nombre(self, queryset, name, value):
        return queryset.filter(
            Q(username__icontains=value) | Q(persona__nombres__icontains=value) | Q(persona__apellidos__icontains=value)
        )


class PagoFilter(django_filters.FilterSet):
    fecha_desde = django_filters.DateTimeFilter(field_name="fecha_pago", lookup_expr="gte")
    fecha_hasta = django_filters.DateTimeFilter(field_name="fecha_pago", lookup_expr="lte")
    monto_min = django_filters.NumberFilter(field_name="monto", lookup_expr="gte")
    monto_max = django_filters.NumberFilter(field_name="monto", lookup_expr="lte")
    usuario_nombre = django_filters.CharFilter(method="filter_usuario_nombre")

    class Meta:
        model = Pago
        fields = ["estado", "tipo_transaccion", "metodo_pago"]

    def filter_usuario_nombre(self, queryset, name, value):
        return queryset.filter(
            Q(usuario__username__icontains=value)
            | Q(usuario__persona__nombres__icontains=value)
            | Q(usuario__persona__apellidos__icontains=value)
        )
