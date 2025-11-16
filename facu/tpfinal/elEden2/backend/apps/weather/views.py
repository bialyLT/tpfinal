from datetime import datetime
import requests

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.servicios.models import Reserva
from .models import WeatherAlert
from .serializers import (
    WeatherAlertSerializer,
    WeatherCheckSerializer,
    WeatherSimulationSerializer,
)
from .services import WeatherAlertService


class WeatherCheckAPIView(APIView):

    def post(self, request):
        serializer = WeatherCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        service = WeatherAlertService()

        if data.get('reserva_id'):
            reserva = Reserva.objects.select_related('servicio', 'cliente__persona').get(id_reserva=data['reserva_id'])
            result = service.evaluate_reserva(reserva, auto_create_alert=True)
        else:
            fecha = data['date']
            latitude = float(data['latitude'])
            longitude = float(data['longitude'])
            dummy_reserva = Reserva(
                fecha_reserva=datetime.combine(fecha, datetime.min.time(), tzinfo=timezone.utc),
                servicio=None,
            )
            result = service.evaluate_reserva(dummy_reserva, latitude=latitude, longitude=longitude, auto_create_alert=False)

        return Response(result, status=status.HTTP_200_OK)


class WeatherSimulateAPIView(APIView):

    def post(self, request):
        serializer = WeatherSimulationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        reserva = Reserva.objects.select_related('servicio', 'cliente__persona').get(id_reserva=data['reserva_id'])
        service = WeatherAlertService()
        if not reserva.servicio.reprogramable_por_clima:
            return Response(
                {'error': 'Este servicio no permite simulaciones de clima'},
                status=status.HTTP_400_BAD_REQUEST
            )

        alerta = service.simulate_alert(
            reserva=reserva,
            alert_date=data.get('alert_date'),
            precipitation_mm=data.get('precipitation_mm'),
            message=data.get('message'),
        )
        payload = WeatherAlertSerializer(alerta).data
        return Response(payload, status=status.HTTP_201_CREATED)


class PendingWeatherAlertsAPIView(APIView):

    def get(self, request):
        alertas = WeatherAlert.objects.select_related('reserva__servicio', 'reserva__cliente__persona').filter(
            status='pending',
            reserva__servicio__reprogramable_por_clima=True
        ).order_by('alert_date')
        serializer = WeatherAlertSerializer(alertas, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class EligibleReservationsAPIView(APIView):

    def get(self, request):
        ahora = timezone.now()
        reservas = (
            Reserva.objects.select_related('cliente__persona', 'servicio')
            .filter(
                fecha_reserva__gte=ahora,
                servicio__reprogramable_por_clima=True,
                estado__in=['pendiente', 'confirmada', 'en_curso']
            )
            .order_by('fecha_reserva')[:25]
        )
        data = [
            {
                'id_reserva': reserva.id_reserva,
                'fecha_reserva': reserva.fecha_reserva,
                'cliente': f"{reserva.cliente.persona.nombre} {reserva.cliente.persona.apellido}",
                'servicio': reserva.servicio.nombre,
                'direccion': reserva.direccion,
            }
            for reserva in reservas
        ]
        return Response(data, status=status.HTTP_200_OK)


class CurrentTemperatureAPIView(APIView):
    """
    Obtiene la temperatura actual desde Open-Meteo.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            # Coordenadas por defecto (Posadas, Misiones)
            lat = getattr(settings, 'WEATHER_DEFAULT_LAT', -27.3667)
            lon = getattr(settings, 'WEATHER_DEFAULT_LON', -55.9000)
            
            url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            temperature = data['current']['temperature_2m']
            
            # Obtener ubicación usando Nominatim
            location = None
            try:
                nominatim_url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=10&addressdetails=1"
                nominatim_response = requests.get(nominatim_url, timeout=10, headers={'User-Agent': 'ElEden-Weather/1.0'})
                nominatim_response.raise_for_status()
                nominatim_data = nominatim_response.json()
                
                # Extraer ubicación legible
                address = nominatim_data.get('address', {})
                city = address.get('city') or address.get('town') or address.get('village') or address.get('municipality')
                country = address.get('country')
                if city and country:
                    location = f"{city}, {country}"
                elif city:
                    location = city
                elif country:
                    location = country
                else:
                    location = nominatim_data.get('display_name', 'Ubicación desconocida')
            except Exception as e:
                # Si falla la geocodificación, continuar sin ubicación
                location = None
            
            response_data = {
                'temperature': temperature,
                'unit': '°C'
            }
            if location:
                response_data['location'] = location
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except requests.RequestException as e:
            return Response(
                {'error': 'No se pudo obtener la temperatura'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except KeyError:
            return Response(
                {'error': 'Datos de temperatura no disponibles'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
