from datetime import datetime, timedelta
from decimal import Decimal

import requests
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.servicios.models import Reserva

from .models import AlertaClimatica
from .serializers import (
    AlertaClimaticaSerializer,
    ChequeoClimaSerializer,
    SimulacionClimaSerializer,
)
from .services import ServicioAlertasClimaticas


class ChequeoClimaAPIView(APIView):

    def post(self, request):
        serializer = ChequeoClimaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        service = ServicioAlertasClimaticas()

        if data.get("reserva_id"):
            reserva = Reserva.objects.select_related("servicio", "cliente__persona").get(id_reserva=data["reserva_id"])
            result = service.evaluate_reserva(reserva, auto_create_alert=True)
        else:
            fecha = data["date"]
            latitude = float(data["latitude"])
            longitude = float(data["longitude"])
            dummy_reserva = Reserva(
                fecha_cita=datetime.combine(fecha, datetime.min.time(), tzinfo=timezone.utc),
                servicio=None,
            )
            result = service.evaluate_reserva(
                dummy_reserva,
                latitude=latitude,
                longitude=longitude,
                auto_create_alert=False,
            )

        return Response(result, status=status.HTTP_200_OK)


class SimulacionClimaAPIView(APIView):

    def post(self, request):
        serializer = SimulacionClimaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        alert_date = data["alert_date"]
        alert_datetime = datetime.combine(alert_date, datetime.min.time())
        if timezone.is_naive(alert_datetime):
            alert_datetime = timezone.make_aware(alert_datetime, timezone.get_current_timezone())

        reservas_qs = Reserva.objects.select_related("servicio", "cliente__persona").filter(
            fecha_cita__date=alert_datetime.date(),
            servicio__reprogramable_por_clima=True,
            estado__in=["pendiente", "confirmada", "en_curso"],
        )
        reservas = list(reservas_qs)
        if not reservas:
            return Response(
                {
                    "created": 0,
                    "reservas_detectadas": 0,
                    "alerts": [],
                    "message": "No hay reservas reprogramables para la fecha seleccionada.",
                    "date": alert_datetime.date(),
                },
                status=status.HTTP_200_OK,
            )

        service = ServicioAlertasClimaticas()
        alerts = []
        for reserva in reservas:
            try:
                alerta = service.simulate_alert(
                    reserva=reserva,
                    alert_date=alert_datetime,
                    precipitation_mm=Decimal("2.0"),
                    message=data.get("message"),
                )
                alerts.append(alerta)
            except ValueError:
                continue

        serialized_alerts = AlertaClimaticaSerializer(alerts, many=True).data
        status_code = status.HTTP_201_CREATED if alerts else status.HTTP_200_OK
        return Response(
            {
                "created": len(alerts),
                "reservas_detectadas": len(reservas),
                "alerts": serialized_alerts,
                "date": alert_datetime.date(),
            },
            status=status_code,
        )


class AlertasClimaticasPendientesAPIView(APIView):

    def get(self, request):
        alertas = (
            AlertaClimatica.objects.select_related("reserva__servicio", "reserva__cliente__persona")
            .filter(estado="pending", reserva__servicio__reprogramable_por_clima=True)
            .order_by("fecha_alerta")
        )
        serializer = AlertaClimaticaSerializer(alertas, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DescartarAlertaClimaticaAPIView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, alert_id):
        try:
            alerta = AlertaClimatica.objects.select_related("reserva").get(pk=alert_id)
        except AlertaClimatica.DoesNotExist:
            return Response({"detail": "Alerta no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        comentario = (
            request.data.get("comentario") or request.data.get("motivo") or "Alerta descartada sin reprogramación"
        )
        payload = alerta.payload_alerta or {}
        payload["manual_resolution"] = {
            "comment": comentario,
            "action": "dismissed",
            "resolved_at": timezone.now().isoformat(),
            "user_id": request.user.id,
            "user_email": request.user.email,
        }
        alerta.payload_alerta = payload
        alerta.estado = "resolved"
        alerta.requiere_reprogramacion = False
        alerta.resuelta_en = timezone.now()
        alerta.resuelta_por = request.user
        alerta.save(
            update_fields=[
                "payload_alerta",
                "estado",
                "requiere_reprogramacion",
                "resuelta_en",
                "resuelta_por",
            ]
        )

        reserva = alerta.reserva
        if reserva:
            reserva.requiere_reprogramacion = False
            reserva.motivo_reprogramacion = None
            reserva.fecha_reprogramada_sugerida = None
            reserva.reprogramacion_fuente = None
            reserva.save(
                update_fields=[
                    "requiere_reprogramacion",
                    "motivo_reprogramacion",
                    "fecha_reprogramada_sugerida",
                    "reprogramacion_fuente",
                ]
            )

        serializer = AlertaClimaticaSerializer(alerta)
        return Response(
            {
                "mensaje": "Alerta descartada, se mantiene la fecha original.",
                "alerta": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class ReservasElegiblesAPIView(APIView):

    def get(self, request):
        ahora = timezone.now()
        reservas = (
            Reserva.objects.select_related("cliente__persona", "servicio")
            .filter(
                fecha_cita__gte=ahora,
                servicio__reprogramable_por_clima=True,
                estado__in=["pendiente", "confirmada", "en_curso"],
            )
            .order_by("fecha_cita")[:25]
        )
        data = [
            {
                "id_reserva": reserva.id_reserva,
                "fecha_reserva": reserva.fecha_cita,
                "cliente": f"{reserva.cliente.persona.nombre} {reserva.cliente.persona.apellido}",
                "servicio": reserva.servicio.nombre,
                "direccion": reserva.direccion,
            }
            for reserva in reservas
        ]
        return Response(data, status=status.HTTP_200_OK)


class TemperaturaActualAPIView(APIView):
    """
    Obtiene la temperatura actual desde Open-Meteo.
    """

    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            # Coordenadas por defecto (Posadas, Misiones)
            lat = getattr(settings, "WEATHER_DEFAULT_LAT", -27.3667)
            lon = getattr(settings, "WEATHER_DEFAULT_LON", -55.9000)

            url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m"
            response = requests.get(url, timeout=10)
            response.raise_for_status()

            data = response.json()
            temperature = data["current"]["temperature_2m"]

            # Obtener ubicación usando Nominatim
            location = None
            try:
                nominatim_url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=10&addressdetails=1"
                nominatim_response = requests.get(
                    nominatim_url,
                    timeout=10,
                    headers={"User-Agent": "ElEden-Weather/1.0"},
                )
                nominatim_response.raise_for_status()
                nominatim_data = nominatim_response.json()

                # Extraer ubicación legible
                address = nominatim_data.get("address", {})
                city = (
                    address.get("city") or address.get("town") or address.get("village") or address.get("municipality")
                )
                country = address.get("country")
                if city and country:
                    location = f"{city}, {country}"
                elif city:
                    location = city
                elif country:
                    location = country
                else:
                    location = nominatim_data.get("display_name", "Ubicación desconocida")
            except Exception:
                # Si falla la geocodificación, continuar sin ubicación
                location = None

            response_data = {"temperature": temperature, "unit": "°C"}
            if location:
                response_data["location"] = location

            return Response(response_data, status=status.HTTP_200_OK)

        except requests.RequestException:
            return Response(
                {"error": "No se pudo obtener la temperatura"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except KeyError:
            return Response(
                {"error": "Datos de temperatura no disponibles"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class ResumenPronosticoReservasAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            days = int(request.query_params.get("days", 7))
        except (TypeError, ValueError):
            days = 7
        days = max(1, min(days, 7))

        now = timezone.now()
        max_reserva_date = now + timedelta(days=30)

        reservas = (
            Reserva.objects.select_related("servicio", "cliente__persona", "localidad_servicio")
            .filter(
                fecha_cita__gte=now,
                fecha_cita__lte=max_reserva_date,
            )
            .order_by("fecha_cita")
        )

        service = ServicioAlertasClimaticas()
        summaries = service.build_locality_forecasts(reservas, days)
        return Response({"results": summaries, "count": len(summaries)}, status=status.HTTP_200_OK)
