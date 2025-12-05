from django.urls import path

from .views import (
    CurrentTemperatureAPIView,
    DismissWeatherAlertAPIView,
    EligibleReservationsAPIView,
    PendingWeatherAlertsAPIView,
    ReservationForecastSummaryAPIView,
    WeatherCheckAPIView,
    WeatherSimulateAPIView,
)

urlpatterns = [
    path('weather/check/', WeatherCheckAPIView.as_view(), name='weather-check'),
    path('weather/simulate/', WeatherSimulateAPIView.as_view(), name='weather-simulate'),
    path('weather/alerts/pending/', PendingWeatherAlertsAPIView.as_view(), name='weather-alerts-pending'),
    path('weather/alerts/<int:alert_id>/dismiss/', DismissWeatherAlertAPIView.as_view(), name='weather-alert-dismiss'),
    path('weather/reservas/eligibles/', EligibleReservationsAPIView.as_view(), name='weather-eligible-reservations'),
    path('weather/current-temperature/', CurrentTemperatureAPIView.as_view(), name='weather-current-temperature'),
    path('weather/reservas/forecast-summary/', ReservationForecastSummaryAPIView.as_view(), name='weather-forecast-summary'),
]
