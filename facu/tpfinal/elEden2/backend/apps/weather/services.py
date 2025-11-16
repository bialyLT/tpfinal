from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone as datetime_timezone
from decimal import Decimal
from typing import Optional

import requests
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from apps.servicios.models import Reserva
from .models import WeatherAlert, WeatherForecast


@dataclass
class ForecastResult:
    date: datetime
    precipitation_mm: Decimal
    precipitation_probability: Optional[int]
    latitude: Decimal
    longitude: Decimal
    raw: dict

    @property
    def summary(self) -> str:
        prob = f"{self.precipitation_probability}%" if self.precipitation_probability is not None else 'sin dato'
        return f"Lluvia prevista: {self.precipitation_mm} mm (prob. {prob})"


class WeatherClient:
    """Lightweight client for Open-Meteo (or compatible) weather APIs."""

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or getattr(settings, 'WEATHER_API_URL', 'https://api.open-meteo.com/v1/forecast')

    def _build_params(self, latitude: float, longitude: float, target_date: datetime):
        date_str = target_date.strftime('%Y-%m-%d')
        return {
            'latitude': latitude,
            'longitude': longitude,
            'daily': 'precipitation_sum,precipitation_probability_mean',
            'timezone': getattr(settings, 'TIME_ZONE', 'Auto'),
            'start_date': date_str,
            'end_date': date_str,
        }

    def get_daily_forecast(self, latitude: float, longitude: float, target_date: datetime) -> ForecastResult:
        cache_key = f"weather:{latitude}:{longitude}:{target_date:%Y-%m-%d}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        params = self._build_params(latitude, longitude, target_date)
        response = requests.get(self.base_url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        daily = data.get('daily', {})
        precipitation_list = daily.get('precipitation_sum', [0])
        probability_list = daily.get('precipitation_probability_mean', [None])

        precipitation = Decimal(str(precipitation_list[0] or 0))
        probability = probability_list[0]

        result = ForecastResult(
            date=target_date,
            precipitation_mm=precipitation,
            precipitation_probability=probability,
            latitude=Decimal(str(latitude)),
            longitude=Decimal(str(longitude)),
            raw=data,
        )
        cache.set(cache_key, result, timeout=3600)
        return result


class WeatherAlertService:
    def __init__(self, client: Optional[WeatherClient] = None):
        self.client = client or WeatherClient()
        self.threshold = Decimal(str(getattr(settings, 'WEATHER_ALERT_THRESHOLD_MM', 1.0)))

    def _get_coordinates(self, reserva: Reserva, latitude: Optional[float], longitude: Optional[float]):
        if latitude is not None and longitude is not None:
            return latitude, longitude
        return (
            float(getattr(settings, 'WEATHER_DEFAULT_LAT', -26.82414)),
            float(getattr(settings, 'WEATHER_DEFAULT_LON', -65.2226)),
        )

    def _ensure_forecast(self, latitude: float, longitude: float, target_date: datetime, raw_forecast: ForecastResult) -> WeatherForecast:
        forecast, created = WeatherForecast.objects.get_or_create(
            date=target_date.date(),
            latitude=Decimal(str(latitude)),
            longitude=Decimal(str(longitude)),
            source='open-meteo',
            defaults={
                'precipitation_mm': raw_forecast.precipitation_mm,
                'precipitation_probability': raw_forecast.precipitation_probability,
                'summary': raw_forecast.summary,
                'raw_payload': raw_forecast.raw,
            }
        )
        if not created:
            needs_update = False
            if forecast.raw_payload in (None, {}):
                forecast.raw_payload = raw_forecast.raw
                needs_update = True
            if forecast.summary != raw_forecast.summary:
                forecast.summary = raw_forecast.summary
                needs_update = True
            if forecast.precipitation_mm != raw_forecast.precipitation_mm:
                forecast.precipitation_mm = raw_forecast.precipitation_mm
                needs_update = True
            if forecast.precipitation_probability != raw_forecast.precipitation_probability:
                forecast.precipitation_probability = raw_forecast.precipitation_probability
                needs_update = True
            if needs_update:
                forecast.save(update_fields=[
                    'raw_payload',
                    'summary',
                    'precipitation_mm',
                    'precipitation_probability'
                ])
        return forecast

    def evaluate_reserva(self, reserva: Reserva, latitude: Optional[float] = None, longitude: Optional[float] = None, auto_create_alert: bool = True) -> dict:
        fecha_objetivo = reserva.fecha_reserva.astimezone(datetime_timezone.utc) if timezone.is_aware(reserva.fecha_reserva) else reserva.fecha_reserva
        coords = self._get_coordinates(reserva, latitude, longitude)
        forecast = self.client.get_daily_forecast(coords[0], coords[1], fecha_objetivo)
        forecast_obj = self._ensure_forecast(coords[0], coords[1], fecha_objetivo, forecast)

        rain_expected = forecast.precipitation_mm >= self.threshold

        result = {
            'rain_expected': rain_expected,
            'precipitation_mm': float(forecast.precipitation_mm),
            'threshold_mm': float(self.threshold),
            'probability_percentage': forecast.precipitation_probability,
            'summary': forecast.summary,
            'date': fecha_objetivo.date(),
        }

        can_create_alert = bool(
            auto_create_alert
            and rain_expected
            and getattr(reserva, 'servicio', None)
            and reserva.servicio.reprogramable_por_clima
        )

        if can_create_alert:
            alerta = self._create_alert_from_forecast(reserva, forecast_obj)
            result['alert_id'] = alerta.id
        return result

    def _create_alert_from_forecast(self, reserva: Reserva, forecast: WeatherForecast, is_simulated: bool = False, message: Optional[str] = None) -> WeatherAlert:
        payload = forecast.raw_payload if getattr(forecast, 'raw_payload', None) else {}
        alerta = WeatherAlert.objects.create(
            reserva=reserva,
            servicio=reserva.servicio,
            forecast=forecast,
            alert_date=forecast.date,
            latitude=forecast.latitude,
            longitude=forecast.longitude,
            precipitation_mm=forecast.precipitation_mm,
            precipitation_threshold=self.threshold,
            probability_percentage=forecast.precipitation_probability,
            is_simulated=is_simulated,
            requires_reprogramming=reserva.servicio.reprogramable_por_clima,
            message=message or 'Lluvia pronosticada: se sugiere reprogramar',
            payload=payload,
        )
        self._mark_reserva_requires_reprogramming(reserva, alerta)
        return alerta

    def simulate_alert(self, reserva: Reserva, alert_date: Optional[datetime] = None, precipitation_mm: Optional[Decimal] = None, message: Optional[str] = None) -> WeatherAlert:
        if not reserva.servicio.reprogramable_por_clima:
            raise ValueError('El servicio asociado no permite reprogramaciones automáticas por clima')
        fecha = alert_date or reserva.fecha_reserva
        precipitation = precipitation_mm or self.threshold
        forecast = WeatherForecast.objects.create(
            date=fecha.date(),
            latitude=Decimal(str(getattr(settings, 'WEATHER_DEFAULT_LAT', -26.82414))),
            longitude=Decimal(str(getattr(settings, 'WEATHER_DEFAULT_LON', -65.2226))),
            precipitation_mm=precipitation,
            precipitation_probability=100,
            summary='Simulación de lluvia',
            raw_payload={'simulated': True, 'message': message or 'Simulación manual'},
            source='simulated'
        )
        alerta = WeatherAlert.objects.create(
            reserva=reserva,
            servicio=reserva.servicio,
            forecast=forecast,
            alert_date=fecha.date(),
            latitude=forecast.latitude,
            longitude=forecast.longitude,
            precipitation_mm=precipitation,
            precipitation_threshold=self.threshold,
            probability_percentage=100,
            is_simulated=True,
            requires_reprogramming=reserva.servicio.reprogramable_por_clima,
            message=message or 'Simulación de lluvia para prueba operativa',
            payload={'simulated': True},
            source='simulated',
        )
        self._mark_reserva_requires_reprogramming(reserva, alerta)
        return alerta

    def _mark_reserva_requires_reprogramming(self, reserva: Reserva, alerta: WeatherAlert):
        reserva.weather_alert = alerta
        reserva.alerta_clima_payload = alerta.payload or {}
        if reserva.servicio.reprogramable_por_clima:
            reserva.requiere_reprogramacion = True
            reserva.motivo_reprogramacion = 'Clima: lluvia pronosticada'
            reserva.fecha_reprogramada_sugerida = None
        reserva.save(update_fields=[
            'weather_alert',
            'alerta_clima_payload',
            'requiere_reprogramacion',
            'motivo_reprogramacion',
            'fecha_reprogramada_sugerida'
        ])

        if reserva.servicio.reprogramable_por_clima:
            from apps.emails.services import EmailService

            EmailService.send_weather_alert_notification(reserva=reserva, alerta=alerta)
