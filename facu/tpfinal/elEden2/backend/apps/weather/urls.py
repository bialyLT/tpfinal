from django.urls import path

from .views import (
    CurrentTemperatureAPIView,
    EligibleReservationsAPIView,
    PendingWeatherAlertsAPIView,
    WeatherCheckAPIView,
    WeatherSimulateAPIView,
)

urlpatterns = [
    path('weather/check/', WeatherCheckAPIView.as_view(), name='weather-check'),
    path('weather/simulate/', WeatherSimulateAPIView.as_view(), name='weather-simulate'),
    path('weather/alerts/pending/', PendingWeatherAlertsAPIView.as_view(), name='weather-alerts-pending'),
    path('weather/reservas/eligibles/', EligibleReservationsAPIView.as_view(), name='weather-eligible-reservations'),
    path('weather/current-temperature/', CurrentTemperatureAPIView.as_view(), name='weather-current-temperature'),
]
