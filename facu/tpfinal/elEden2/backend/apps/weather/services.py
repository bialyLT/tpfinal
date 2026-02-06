from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from datetime import timezone as datetime_timezone
from decimal import Decimal
from typing import List, Optional, Tuple

import requests
from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.servicios.models import Reserva, ReservaEmpleado
from apps.users.models import Empleado

from .models import AlertaClimatica, PronosticoClima

logger = logging.getLogger(__name__)


@dataclass
class ResultadoPronostico:
    date: datetime
    precipitation_mm: Decimal
    precipitation_probability: Optional[int]
    latitude: Decimal
    longitude: Decimal
    weather_code: Optional[int]
    raw: dict

    @property
    def summary(self) -> str:
        prob = f"{self.precipitation_probability}%" if self.precipitation_probability is not None else "sin dato"
        return f"Lluvia prevista: {self.precipitation_mm} mm (prob. {prob})"


@dataclass
class ResumenPronosticoDiario:
    date: datetime
    temperature_max: Optional[float]
    temperature_min: Optional[float]
    precipitation_probability: Optional[int]
    precipitation_sum: Optional[Decimal]
    weather_code: Optional[int]


class ClienteClima:
    """Lightweight client for Open-Meteo (or compatible) weather APIs."""

    def __init__(self, base_url: Optional[str] = None):
        default_url = "https://api.open-meteo.com/v1/forecast"
        configured_url = getattr(settings, "WEATHER_API_URL", None)
        # Usar la URL por defecto si lo configurado está vacío o sólo espacios
        chosen_url = base_url if base_url not in (None, "") else configured_url
        if not chosen_url:
            chosen_url = default_url
        self.base_url = chosen_url

    def _build_params(
        self,
        latitude: float,
        longitude: float,
        start_date: datetime,
        end_date: Optional[datetime] = None,
        daily_fields: Optional[str] = None,
    ):
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = (end_date or start_date).strftime("%Y-%m-%d")
        return {
            "latitude": latitude,
            "longitude": longitude,
            "daily": daily_fields or "precipitation_sum,precipitation_probability_mean,weathercode",
            "timezone": getattr(settings, "TIME_ZONE", "Auto"),
            "start_date": start_str,
            "end_date": end_str,
        }

    def get_daily_forecast(self, latitude: float, longitude: float, target_date: datetime) -> ResultadoPronostico:
        cache_key = f"weather:{latitude}:{longitude}:{target_date:%Y-%m-%d}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        params = self._build_params(latitude, longitude, target_date)
        response = requests.get(self.base_url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        daily = data.get("daily", {})
        precipitation_list = daily.get("precipitation_sum", [0])
        probability_list = daily.get("precipitation_probability_mean", [None])
        weather_codes = daily.get("weathercode", [None])

        precipitation = Decimal(str(precipitation_list[0] or 0))
        probability = probability_list[0]
        weather_code = None
        if weather_codes:
            try:
                weather_code = int(weather_codes[0]) if weather_codes[0] is not None else None
            except (TypeError, ValueError):
                weather_code = None

        result = ResultadoPronostico(
            date=target_date,
            precipitation_mm=precipitation,
            precipitation_probability=probability,
            latitude=Decimal(str(latitude)),
            longitude=Decimal(str(longitude)),
            weather_code=weather_code,
            raw=data,
        )
        cache.set(cache_key, result, timeout=3600)
        return result

    def get_multi_day_forecast(
        self,
        latitude: float,
        longitude: float,
        start_date: datetime,
        days: int = 7,
    ) -> List[ResumenPronosticoDiario]:
        days = max(1, min(days, 7))
        end_date = start_date + timedelta(days=days - 1)
        cache_key = f"weather:range:{latitude}:{longitude}:{start_date:%Y-%m-%d}:{days}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        params = self._build_params(
            latitude,
            longitude,
            start_date,
            end_date,
            daily_fields="temperature_2m_max,temperature_2m_min,precipitation_probability_mean,precipitation_sum,weathercode",
        )
        response = requests.get(self.base_url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        daily = data.get("daily", {})
        dates = daily.get("time", [])
        temps_max = daily.get("temperature_2m_max", [])
        temps_min = daily.get("temperature_2m_min", [])
        precipitation_prob = daily.get("precipitation_probability_mean", [])
        precipitation_sum = daily.get("precipitation_sum", [])
        weather_codes = daily.get("weathercode", [])

        results: List[ResumenPronosticoDiario] = []
        for index, date_str in enumerate(dates):
            try:
                date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                continue
            temp_max = temps_max[index] if index < len(temps_max) else None
            temp_min = temps_min[index] if index < len(temps_min) else None
            prob = precipitation_prob[index] if index < len(precipitation_prob) else None
            precip_sum_val = precipitation_sum[index] if index < len(precipitation_sum) else None
            precip_sum = Decimal(str(precip_sum_val)) if precip_sum_val is not None else None
            weather_code = None
            if index < len(weather_codes):
                try:
                    weather_code = int(weather_codes[index]) if weather_codes[index] is not None else None
                except (TypeError, ValueError):
                    weather_code = None
            results.append(
                ResumenPronosticoDiario(
                    date=date_obj,
                    temperature_max=temp_max,
                    temperature_min=temp_min,
                    precipitation_probability=prob,
                    precipitation_sum=precip_sum,
                    weather_code=weather_code,
                )
            )

        cache.set(cache_key, results, timeout=3600)
        return results


class ServicioAlertasClimaticas:
    def __init__(self, client: Optional[ClienteClima] = None):
        self.client = client or ClienteClima()
        self.drizzle_threshold = Decimal(str(getattr(settings, "WEATHER_DRIZZLE_THRESHOLD_MM", 0.5)))
        self.threshold = Decimal(str(getattr(settings, "WEATHER_ALERT_THRESHOLD_MM", 2.0)))
        self.low_probability_threshold = int(getattr(settings, "WEATHER_LOW_PROBABILITY_THRESHOLD", 40))
        self.reassign_probability_threshold = int(getattr(settings, "WEATHER_REASSIGN_PROBABILITY_THRESHOLD", 50))
        self.max_employee_search_days = int(getattr(settings, "WEATHER_MAX_REASSIGN_DAYS", 30))
        self.default_employees_required = int(getattr(settings, "WEATHER_EMPLOYEES_DEFAULT_REQUIRED", 2))
        self.kill_switch_codes = set(getattr(settings, "WEATHER_KILL_SWITCH_CODES", [95, 96, 99]))
        self.geocoder = GeocodingService()

    def _default_coordinates(self):
        return (
            float(getattr(settings, "WEATHER_DEFAULT_LAT", -27.3667)),
            float(getattr(settings, "WEATHER_DEFAULT_LON", -55.9000)),
        )

    def _get_coordinates(
        self, reserva: Reserva, latitude: Optional[float], longitude: Optional[float]
    ) -> Tuple[float, float, Optional[dict]]:
        if latitude is not None and longitude is not None:
            return float(latitude), float(longitude), None
        localidad_info = self._resolve_localidad_info(reserva)
        return localidad_info["latitude"], localidad_info["longitude"], localidad_info

    def _format_localidad_name(self, localidad) -> str:
        if localidad:
            partes = [localidad.nombre_localidad]
            if localidad.nombre_provincia:
                partes.append(localidad.nombre_provincia)
            if localidad.nombre_pais:
                partes.append(localidad.nombre_pais)
            return ", ".join(partes)
        return getattr(settings, "WEATHER_DEFAULT_LOCATION_NAME", "Posadas, Misiones, Argentina")

    def _resolve_localidad_info(self, reserva: Reserva) -> dict:
        localidad_obj = getattr(reserva, "localidad_servicio", None)
        if not localidad_obj:
            cliente = getattr(reserva, "cliente", None)
            persona = getattr(cliente, "persona", None) if cliente else None
            localidad_obj = getattr(persona, "localidad", None)

        latitude = longitude = None
        if localidad_obj:
            coords = self._ensure_localidad_coordinates(localidad_obj)
            if coords:
                latitude, longitude = coords
        if latitude is None or longitude is None:
            latitude, longitude = self._default_coordinates()

        key = localidad_obj.id_localidad if localidad_obj else f"default:{latitude}:{longitude}"

        return {
            "key": key,
            "localidad": localidad_obj,
            "latitude": latitude,
            "longitude": longitude,
            "display_name": self._format_localidad_name(localidad_obj),
        }

    def _ensure_localidad_coordinates(self, localidad) -> Optional[Tuple[float, float]]:
        if localidad.latitud is not None and localidad.longitud is not None:
            return float(localidad.latitud), float(localidad.longitud)

        coords = self.geocoder.geocode_localidad(localidad)
        if not coords:
            return None

        lat, lon = coords
        try:
            with transaction.atomic():
                localidad.latitud = Decimal(str(lat))
                localidad.longitud = Decimal(str(lon))
                localidad.save(update_fields=["latitud", "longitud"])
        except Exception:  # pragma: no cover - log but continue
            logging.getLogger(__name__).warning(
                "No se pudo persistir lat/lon para localidad %s", localidad.id_localidad
            )
        return lat, lon

    def _ensure_forecast(
        self,
        latitude: float,
        longitude: float,
        target_date: datetime,
        raw_forecast: ResultadoPronostico,
    ) -> PronosticoClima:
        forecast, created = PronosticoClima.objects.get_or_create(
            fecha=target_date.date(),
            latitud=Decimal(str(latitude)),
            longitud=Decimal(str(longitude)),
            fuente="open-meteo",
            defaults={
                "precipitacion_mm": raw_forecast.precipitation_mm,
                "probabilidad_precipitacion": raw_forecast.precipitation_probability,
                "resumen": raw_forecast.summary,
                "payload_crudo": raw_forecast.raw,
            },
        )
        if not created:
            needs_update = False
            if forecast.payload_crudo in (None, {}):
                forecast.payload_crudo = raw_forecast.raw
                needs_update = True
            if forecast.resumen != raw_forecast.summary:
                forecast.resumen = raw_forecast.summary
                needs_update = True
            if forecast.precipitacion_mm != raw_forecast.precipitation_mm:
                forecast.precipitacion_mm = raw_forecast.precipitation_mm
                needs_update = True
            if forecast.probabilidad_precipitacion != raw_forecast.precipitation_probability:
                forecast.probabilidad_precipitacion = raw_forecast.precipitation_probability
                needs_update = True
            if needs_update:
                forecast.save(
                    update_fields=[
                        "payload_crudo",
                        "resumen",
                        "precipitacion_mm",
                        "probabilidad_precipitacion",
                    ]
                )
        return forecast

    def _evaluate_weather_rules(self, forecast: ResultadoPronostico) -> dict:
        precipitation = forecast.precipitation_mm or Decimal("0")
        probability = forecast.precipitation_probability or 0
        weather_code = forecast.weather_code

        # Kill switch for tormentas eléctricas
        if weather_code in self.kill_switch_codes:
            return {
                "should_reassign": True,
                "reason": "Tormenta eléctrica pronosticada (código meteorológico crítico).",
                "trigger": "kill_switch",
                "weather_code": weather_code,
            }

        if precipitation < self.drizzle_threshold:
            return {
                "should_reassign": False,
                "reason": "Lluvia insignificante (<0.5 mm).",
                "trigger": "light_rain",
                "weather_code": weather_code,
            }

        if probability < self.low_probability_threshold:
            return {
                "should_reassign": False,
                "reason": f"Probabilidad baja ({probability}%).",
                "trigger": "low_probability",
                "weather_code": weather_code,
            }

        if precipitation > self.threshold and probability >= self.reassign_probability_threshold:
            return {
                "should_reassign": True,
                "reason": f"Lluvia intensa (> {self.threshold} mm) con probabilidad alta ({probability}%).",
                "trigger": "heavy_rain",
                "weather_code": weather_code,
            }

        return {
            "should_reassign": False,
            "reason": "Condiciones dentro de la tolerancia operativa.",
            "trigger": "acceptable",
            "weather_code": weather_code,
        }

    def _determine_empleados_requeridos(self, reserva: Reserva) -> int:
        operadores_asignados = reserva.asignaciones.filter(rol="operador").count()
        if operadores_asignados:
            return operadores_asignados
        asignados_totales = reserva.asignaciones.count()
        if asignados_totales:
            return asignados_totales
        return max(1, self.default_employees_required)

    def _find_next_available_slot(self, fecha_inicial: datetime, empleados_necesarios: int) -> datetime:
        fecha_candidata = fecha_inicial + timedelta(days=1)
        dias_buscados = 0

        while dias_buscados < self.max_employee_search_days:
            reservas_en_fecha = (
                Reserva.objects.filter(
                    Q(fecha_realizacion__date=fecha_candidata.date())
                    | (Q(fecha_realizacion__isnull=True) & Q(fecha_cita__date=fecha_candidata.date())),
                    estado__in=["confirmada", "en_curso"],
                )
                .values_list("id_reserva", flat=True)
            )

            empleados_ocupados = ReservaEmpleado.objects.filter(reserva_id__in=reservas_en_fecha).values_list(
                "empleado_id", flat=True
            )

            disponibles = Empleado.objects.filter(activo=True).exclude(id_empleado__in=empleados_ocupados).count()

            if disponibles >= empleados_necesarios:
                return fecha_candidata

            fecha_candidata += timedelta(days=1)
            dias_buscados += 1

        return fecha_inicial + timedelta(days=7)

    def _suggest_reprogramming_date(self, reserva: Reserva) -> Optional[datetime]:
        if not reserva or not (reserva.fecha_realizacion or reserva.fecha_cita):
            return None
        empleados_necesarios = self._determine_empleados_requeridos(reserva)
        fecha_base = reserva.fecha_realizacion or reserva.fecha_cita
        return self._find_next_available_slot(fecha_base, empleados_necesarios)

    def evaluate_reserva(
        self,
        reserva: Reserva,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        auto_create_alert: bool = True,
    ) -> dict:
        fecha_base = reserva.fecha_realizacion or reserva.fecha_cita
        if not fecha_base:
            raise ValueError("La reserva no tiene fecha para evaluar (fecha_realizacion/fecha_cita).")

        fecha_objetivo = fecha_base.astimezone(datetime_timezone.utc) if timezone.is_aware(fecha_base) else fecha_base
        latitude, longitude, localidad_info = self._get_coordinates(reserva, latitude, longitude)
        forecast = self.client.get_daily_forecast(latitude, longitude, fecha_objetivo)
        forecast_obj = self._ensure_forecast(latitude, longitude, fecha_objetivo, forecast)
        decision = self._evaluate_weather_rules(forecast)
        rain_expected = decision["should_reassign"]

        suggested_date = None
        if rain_expected:
            suggested_date = self._suggest_reprogramming_date(reserva)

        result = {
            "rain_expected": rain_expected,
            "precipitation_mm": float(forecast.precipitation_mm),
            "threshold_mm": float(self.threshold),
            "probability_percentage": forecast.precipitation_probability,
            "summary": forecast.summary,
            "date": fecha_objetivo.date(),
            "weather_code": decision["weather_code"],
            "decision_reason": decision["reason"],
            "decision_trigger": decision["trigger"],
            "suggested_reprogramming": (suggested_date.isoformat() if suggested_date else None),
            "latitude": latitude,
            "longitude": longitude,
        }

        if localidad_info:
            localidad_payload = {
                "id": (
                    getattr(localidad_info["localidad"], "id_localidad", None)
                    if localidad_info.get("localidad")
                    else None
                ),
                "display_name": localidad_info["display_name"],
                "latitud": localidad_info["latitude"],
                "longitud": localidad_info["longitude"],
            }
            result["localidad"] = localidad_payload

        can_create_alert = bool(
            auto_create_alert
            and rain_expected
            and getattr(reserva, "servicio", None)
            and reserva.servicio.reprogramable_por_clima
        )

        if can_create_alert:
            alerta = self._create_alert_from_forecast(reserva, forecast_obj, suggested_date, decision)
            result["alert_id"] = alerta.id
        return result

    def _create_alert_from_forecast(
        self,
        reserva: Reserva,
        forecast: PronosticoClima,
        suggested_date: Optional[datetime] = None,
        decision: Optional[dict] = None,
        is_simulated: bool = False,
        message: Optional[str] = None,
    ) -> AlertaClimatica:
        raw_payload = getattr(forecast, "payload_crudo", None)
        payload = dict(raw_payload) if isinstance(raw_payload, dict) else {}
        if decision:
            payload["decision"] = {
                "trigger": decision.get("trigger"),
                "reason": decision.get("reason"),
                "weather_code": decision.get("weather_code"),
            }
        if suggested_date:
            payload["suggested_reprogramming"] = suggested_date.isoformat()
        reason = message or (decision["reason"] if decision else "Lluvia pronosticada: se sugiere reprogramar")
        trigger = decision["trigger"] if decision else "weather"
        alerta = AlertaClimatica.objects.create(
            reserva=reserva,
            servicio=reserva.servicio,
            pronostico=forecast,
            fecha_alerta=forecast.fecha,
            latitud=forecast.latitud,
            longitud=forecast.longitud,
            precipitacion_mm=forecast.precipitacion_mm,
            umbral_precipitacion=self.threshold,
            porcentaje_probabilidad=forecast.probabilidad_precipitacion,
            es_simulada=is_simulated,
            requiere_reprogramacion=reserva.servicio.reprogramable_por_clima,
            mensaje=reason,
            payload_alerta=payload,
            fuente=forecast.fuente if hasattr(forecast, "fuente") else "open-meteo",
            disparada_por=trigger,
        )
        self._mark_reserva_requires_reprogramming(reserva, alerta, suggested_date, reason, trigger)
        return alerta

    def simulate_alert(
        self,
        reserva: Reserva,
        alert_date: Optional[datetime] = None,
        precipitation_mm: Optional[Decimal] = None,
        message: Optional[str] = None,
    ) -> AlertaClimatica:
        if not reserva.servicio.reprogramable_por_clima:
            raise ValueError("El servicio asociado no permite reprogramaciones automáticas por clima")
        fecha = alert_date or reserva.fecha_cita
        precipitation = precipitation_mm or self.threshold
        forecast, created = PronosticoClima.objects.get_or_create(
            fecha=fecha.date(),
            latitud=Decimal(str(getattr(settings, "WEATHER_DEFAULT_LAT", -27.3667))),
            longitud=Decimal(str(getattr(settings, "WEATHER_DEFAULT_LON", -55.9000))),
            fuente="simulated",
            defaults={
                "precipitacion_mm": precipitation,
                "probabilidad_precipitacion": 100,
                "resumen": "Simulación de lluvia",
                "payload_crudo": {
                    "simulated": True,
                    "message": message or "Simulación manual",
                },
            },
        )
        if not created:
            # Actualizar si ya existe
            forecast.precipitacion_mm = precipitation
            forecast.probabilidad_precipitacion = 100
            forecast.resumen = "Simulación de lluvia"
            forecast.payload_crudo = {
                "simulated": True,
                "message": message or "Simulación manual",
            }
            forecast.save()
        simulated_forecast = ResultadoPronostico(
            date=fecha,
            precipitation_mm=Decimal(str(precipitation)),
            precipitation_probability=100,
            latitude=forecast.latitud,
            longitude=forecast.longitud,
            weather_code=None,
            raw=getattr(forecast, "payload_crudo", {}) or {},
        )

        decision = self._evaluate_weather_rules(simulated_forecast)
        should_reassign = decision["should_reassign"]
        reason_message = message or decision["reason"]
        suggested_date = self._suggest_reprogramming_date(reserva) if should_reassign else None

        payload = {
            "simulated": True,
            "decision": {
                "trigger": decision["trigger"],
                "reason": reason_message,
                "weather_code": decision["weather_code"],
            },
        }
        if suggested_date:
            payload["suggested_reprogramming"] = suggested_date.isoformat()

        alerta = AlertaClimatica.objects.create(
            reserva=reserva,
            servicio=reserva.servicio,
            pronostico=forecast,
            fecha_alerta=fecha.date(),
            latitud=forecast.latitud,
            longitud=forecast.longitud,
            precipitacion_mm=precipitation,
            umbral_precipitacion=self.threshold,
            porcentaje_probabilidad=100,
            es_simulada=True,
            requiere_reprogramacion=bool(should_reassign and reserva.servicio.reprogramable_por_clima),
            mensaje=reason_message,
            payload_alerta=payload,
            fuente="simulated",
            disparada_por=decision["trigger"],
        )
        if should_reassign:
            self._mark_reserva_requires_reprogramming(
                reserva, alerta, suggested_date, reason_message, decision["trigger"]
            )
        return alerta

    def _mark_reserva_requires_reprogramming(
        self,
        reserva: Reserva,
        alerta: AlertaClimatica,
        suggested_date: Optional[datetime] = None,
        motivo: Optional[str] = None,
        fuente: str = "weather",
    ):
        reserva.weather_alert = alerta
        reserva.alerta_clima_payload = alerta.payload_alerta or {}
        if reserva.servicio.reprogramable_por_clima:
            reserva.requiere_reprogramacion = True
            reserva.motivo_reprogramacion = motivo or "Clima: lluvia pronosticada"
            reserva.fecha_reprogramada_sugerida = suggested_date
            reserva.reprogramacion_fuente = fuente
        reserva.save(
            update_fields=[
                "weather_alert",
                "alerta_clima_payload",
                "requiere_reprogramacion",
                "motivo_reprogramacion",
                "fecha_reprogramada_sugerida",
                "reprogramacion_fuente",
            ]
        )

        if reserva.servicio.reprogramable_por_clima:
            from apps.emails.services import EmailService

            EmailService.send_weather_alert_notification(reserva=reserva, alerta=alerta)

    def get_multi_day_forecast(self, latitude: float, longitude: float, days: int = 7):
        start_date = timezone.localdate()
        start_datetime = datetime.combine(start_date, datetime.min.time())
        return self.client.get_multi_day_forecast(latitude, longitude, start_datetime, days)

    def build_locality_forecasts(self, reservas, days: int = 7):
        grouped = {}
        for reserva in reservas:
            localidad_info = self._resolve_localidad_info(reserva)
            group = grouped.setdefault(
                localidad_info["key"],
                {
                    "localidad": localidad_info["localidad"],
                    "display_name": localidad_info["display_name"],
                    "latitude": localidad_info["latitude"],
                    "longitude": localidad_info["longitude"],
                    "reservas": [],
                },
            )
            group["reservas"].append(
                {
                    "id_reserva": reserva.id_reserva,
                    "fecha_reserva": reserva.fecha_cita,
                    "servicio": getattr(reserva.servicio, "nombre", None),
                    "cliente": (
                        f"{reserva.cliente.persona.nombre} {reserva.cliente.persona.apellido}"
                        if getattr(reserva, "cliente", None) and getattr(reserva.cliente, "persona", None)
                        else None
                    ),
                    "direccion": reserva.direccion,
                }
            )

        summaries = []
        for group in grouped.values():
            forecasts = self.get_multi_day_forecast(group["latitude"], group["longitude"], days)
            forecast_payload = [
                {
                    "date": (
                        entry.date.date().isoformat() if isinstance(entry.date, datetime) else entry.date.isoformat()
                    ),
                    "temperature_max": entry.temperature_max,
                    "temperature_min": entry.temperature_min,
                    "precipitation_probability": entry.precipitation_probability,
                    "precipitation_sum_mm": (
                        float(entry.precipitation_sum) if entry.precipitation_sum is not None else None
                    ),
                }
                for entry in forecasts
            ]

            localidad = group["localidad"]
            localidad_payload = None
            if localidad:
                localidad_payload = {
                    "id": localidad.id_localidad,
                    "nombre": localidad.nombre_localidad,
                    "provincia": localidad.nombre_provincia,
                    "pais": localidad.nombre_pais,
                    "cp": localidad.cp,
                    "latitud": (float(localidad.latitud) if localidad.latitud is not None else None),
                    "longitud": (float(localidad.longitud) if localidad.longitud is not None else None),
                }

            summaries.append(
                {
                    "localidad": localidad_payload,
                    "display_name": group["display_name"],
                    "latitude": group["latitude"],
                    "longitude": group["longitude"],
                    "reservas": group["reservas"],
                    "forecast": forecast_payload,
                }
            )

        return summaries


class GeocodingService:
    def __init__(self):
        self.base_url = getattr(settings, "GEOCODER_API_URL", "https://nominatim.openstreetmap.org/search")
        self.user_agent = getattr(settings, "GEOCODER_USER_AGENT", "ElEden-Weather/1.0")

    def geocode_localidad(self, localidad) -> Optional[Tuple[float, float]]:
        if not localidad:
            return None

        cache_key = f"geo:{localidad.id_localidad}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        query_parts = [localidad.nombre_localidad]
        if localidad.nombre_provincia:
            query_parts.append(localidad.nombre_provincia)
        if localidad.nombre_pais:
            query_parts.append(localidad.nombre_pais)
        query = ", ".join(query_parts)

        params = {
            "q": query,
            "format": "json",
            "limit": 1,
        }

        try:
            response = requests.get(
                self.base_url,
                params=params,
                timeout=10,
                headers={"User-Agent": self.user_agent},
            )
            response.raise_for_status()
            data = response.json()
            if not data:
                return None
            lat = float(data[0]["lat"])
            lon = float(data[0]["lon"])
            cache.set(cache_key, (lat, lon), timeout=86400)
            return lat, lon
        except (requests.RequestException, KeyError, ValueError):
            logging.getLogger(__name__).warning(
                "No se pudo geocodificar la localidad %s",
                getattr(localidad, "id_localidad", "desconocida"),
            )
            return None
