from __future__ import annotations

import logging
import re
from decimal import Decimal
from typing import Dict, List, Optional

from django.conf import settings
from django.db import transaction
from geopy.extra.rate_limiter import RateLimiter
from geopy.geocoders import Nominatim

from apps.users.models import Localidad

logger = logging.getLogger(__name__)

_geolocator = Nominatim(user_agent="elEden_address_lookup")
_rate_limited_geocode = RateLimiter(_geolocator.geocode, min_delay_seconds=1)
_ALLOWED_COUNTRY = getattr(settings, "SERVICE_ALLOWED_COUNTRY", "Argentina").strip().lower()
_ALLOWED_PROVINCES = [
    provincia.strip().lower()
    for provincia in getattr(settings, "SERVICE_ALLOWED_PROVINCES", ["Misiones", "Corrientes"])
]
_AREA_MESSAGE = getattr(
    settings,
    "SERVICE_OPERATIONAL_AREA_MESSAGE",
    "Actualmente solo operamos en Corrientes y Misiones, Argentina.",
)


def _split_street_and_number(text: str) -> (str, str):
    if not text:
        return "", "S/N"
    match = re.match(r"^(?P<street>[^\d]+?)\s*(?P<number>\d+[A-Za-z0-9\-/]*)$", text.strip())
    if match:
        street = match.group("street").strip().rstrip(",")
        number = match.group("number").strip()
        return street or text.strip(), number or "S/N"
    return text.strip(), "S/N"


def is_operational_area(provincia: Optional[str], pais: Optional[str]) -> bool:
    provincia_val = (provincia or "").strip().lower()
    pais_val = (pais or "").strip().lower()

    if not provincia_val or not pais_val:
        return False

    if pais_val != _ALLOWED_COUNTRY:
        return False

    return any(allowed in provincia_val for allowed in _ALLOWED_PROVINCES if allowed)


def get_operational_area_message() -> str:
    return _AREA_MESSAGE


def _normalize_location_result(location, fallback_text: str) -> Dict[str, Optional[str]]:
    if not location:
        raise ValueError("No se encontraron resultados para la dirección ingresada")

    address = location.raw.get("address", {}) if hasattr(location, "raw") else {}
    street_candidate = address.get("road") or address.get("pedestrian") or address.get("path") or ""
    house_number = address.get("house_number")
    calle = street_candidate or fallback_text
    if not house_number:
        calle, house_number = _split_street_and_number(fallback_text)

    ciudad = (
        address.get("city")
        or address.get("town")
        or address.get("village")
        or address.get("hamlet")
        or address.get("municipality")
    )
    provincia = address.get("state") or address.get("region") or address.get("province")
    pais = address.get("country")
    codigo_postal = address.get("postcode")

    result = {
        "calle": calle.strip(),
        "numero": (house_number or "S/N").strip(),
        "ciudad": (ciudad or "").strip() or None,
        "provincia": (provincia or "").strip() or None,
        "pais": (pais or "").strip() or None,
        "codigo_postal": (codigo_postal or "").strip() or None,
        "latitud": location.latitude if hasattr(location, "latitude") else None,
        "longitud": location.longitude if hasattr(location, "longitude") else None,
        "direccion_formateada": getattr(location, "address", fallback_text),
    }

    logger.debug("Resultado geocoding: %s", result)
    return result


def geocode_address(address_text: str) -> Dict[str, Optional[str]]:
    if not address_text:
        raise ValueError("La dirección es requerida")

    logger.info("🌎 Geocodificando dirección: %s", address_text)
    try:
        location = _rate_limited_geocode(address_text, addressdetails=True, language="es")
    except Exception as exc:  # pragma: no cover - red de terceros
        logger.error("Error al geocodificar dirección: %s", exc)
        raise ValueError("No se pudo geocodificar la dirección") from exc

    if not location:
        raise ValueError("No se encontraron resultados para la dirección ingresada")

    return _normalize_location_result(location, address_text)


def suggest_addresses(address_text: str, limit: int = 5) -> List[Dict[str, Optional[str]]]:
    if not address_text:
        raise ValueError("La dirección es requerida")

    safe_limit = max(1, min(limit or 5, 5))
    logger.info("🔎 Buscando sugerencias para: %s (limite=%s)", address_text, safe_limit)
    try:
        locations = _rate_limited_geocode(
            address_text,
            addressdetails=True,
            language="es",
            exactly_one=False,
            limit=safe_limit,
        )
    except Exception as exc:  # pragma: no cover - red de terceros
        logger.error("Error al obtener sugerencias: %s", exc)
        raise ValueError("No se pudieron obtener sugerencias para la dirección") from exc

    if not locations:
        return []

    if not isinstance(locations, list):
        locations = [locations]

    suggestions = []
    for location in locations[:safe_limit]:
        try:
            suggestions.append(_normalize_location_result(location, address_text))
        except ValueError:
            continue

    return suggestions


def normalize_google_address(
    address_payload: Optional[Dict],
) -> Optional[Dict[str, Optional[str]]]:
    if not address_payload:
        return None

    street = address_payload.get("streetAddress") or address_payload.get("formattedValue")
    city = address_payload.get("city") or address_payload.get("locality")
    province = address_payload.get("region") or address_payload.get("administrativeArea")
    country = address_payload.get("country") or address_payload.get("countryCode")
    postal_code = address_payload.get("postalCode") or address_payload.get("postalCodeNumber")

    calle, numero = _split_street_and_number(street or "")

    return {
        "calle": calle,
        "numero": numero,
        "ciudad": city,
        "provincia": province,
        "pais": country,
        "codigo_postal": postal_code,
    }


@transaction.atomic
def get_or_create_localidad(address_info: Dict[str, Optional[str]]) -> Localidad:
    ciudad = address_info.get("ciudad") or "Sin ciudad"
    provincia = address_info.get("provincia") or "Sin provincia"
    pais = address_info.get("pais") or "Argentina"
    codigo_postal = address_info.get("codigo_postal") or "S/N"
    latitud_val = address_info.get("latitud")
    longitud_val = address_info.get("longitud")
    latitud = Decimal(str(latitud_val)) if latitud_val is not None else None
    longitud = Decimal(str(longitud_val)) if longitud_val is not None else None

    localidad, created = Localidad.objects.get_or_create(
        nombre_localidad=ciudad,
        nombre_provincia=provincia,
        nombre_pais=pais,
        defaults={
            "cp": codigo_postal,
            "latitud": latitud,
            "longitud": longitud,
        },
    )

    fields_to_update = []
    if not created and codigo_postal and localidad.cp != codigo_postal:
        localidad.cp = codigo_postal
        fields_to_update.append("cp")

    if latitud is not None and localidad.latitud != latitud:
        localidad.latitud = latitud
        fields_to_update.append("latitud")

    if longitud is not None and localidad.longitud != longitud:
        localidad.longitud = longitud
        fields_to_update.append("longitud")

    if fields_to_update:
        localidad.save(update_fields=fields_to_update)

    return localidad
