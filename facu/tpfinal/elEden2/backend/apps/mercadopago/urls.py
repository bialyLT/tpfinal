"""
URLs para la app de MercadoPago
"""

from django.urls import path

from . import views

app_name = "mercadopago"

urlpatterns = [
    # Pago de seña para reservas existentes
    path(
        "reservas/<int:reserva_id>/crear-pago-sena/",
        views.crear_preferencia_pago_sena,
        name="crear_pago_sena",
    ),
    path(
        "reservas/<int:reserva_id>/confirmar-pago-sena/",
        views.confirmar_pago_sena,
        name="confirmar_pago_sena",
    ),
    path(
        "reservas/<int:reserva_id>/buscar-pago-por-preferencia/",
        views.buscar_pago_por_preferencia,
        name="buscar_pago_por_preferencia",
    ),
    # Pago final para reservas existentes
    path(
        "reservas/<int:reserva_id>/crear-pago-final/",
        views.crear_preferencia_pago_final,
        name="crear_pago_final",
    ),
    path(
        "reservas/<int:reserva_id>/confirmar-pago-final/",
        views.confirmar_pago_final,
        name="confirmar_pago_final",
    ),
    # Verificar estado de pago
    path(
        "reservas/<int:reserva_id>/verificar-pago/",
        views.verificar_pago,
        name="verificar_pago",
    ),
    # Nuevo flujo: Pago primero, reserva después
    path(
        "crear-preferencia-prereserva/",
        views.crear_preferencia_prereserva,
        name="crear_preferencia_prereserva",
    ),
    path(
        "crear-reserva-con-pago/",
        views.crear_reserva_con_pago,
        name="crear_reserva_con_pago",
    ),
    # Pago de prueba (solo para desarrollo)
    path("pago-prueba/", views.crear_pago_prueba, name="pago_prueba"),
    # Endpoint deprecado (mantener por compatibilidad)
    path(
        "reservas/<int:reserva_id>/crear-pago/",
        views.crear_preferencia_pago,
        name="crear_preferencia_pago_deprecated",
    ),
]
