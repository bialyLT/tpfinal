from django.urls import path

from .views import (
    AlertasClimaticasPendientesAPIView,
    ChequeoClimaAPIView,
    DescartarAlertaClimaticaAPIView,
    ReservasElegiblesAPIView,
    ResumenPronosticoReservasAPIView,
    SimulacionClimaAPIView,
    TemperaturaActualAPIView,
)

urlpatterns = [
    path("weather/check/", ChequeoClimaAPIView.as_view(), name="weather-check"),
    path("weather/simulate/", SimulacionClimaAPIView.as_view(), name="weather-simulate"),
    path(
        "weather/alerts/pending/",
        AlertasClimaticasPendientesAPIView.as_view(),
        name="weather-alerts-pending",
    ),
    path(
        "weather/alerts/<int:alert_id>/dismiss/",
        DescartarAlertaClimaticaAPIView.as_view(),
        name="weather-alert-dismiss",
    ),
    path(
        "weather/reservas/eligibles/",
        ReservasElegiblesAPIView.as_view(),
        name="weather-eligible-reservations",
    ),
    path(
        "weather/current-temperature/",
        TemperaturaActualAPIView.as_view(),
        name="weather-current-temperature",
    ),
    path(
        "weather/reservas/forecast-summary/",
        ResumenPronosticoReservasAPIView.as_view(),
        name="weather-forecast-summary",
    ),
]
