import logging
from datetime import datetime

import django_filters
from django.db import transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import (
    SAFE_METHODS,
    AllowAny,
    IsAdminUser,
    IsAuthenticated,
)
from rest_framework.response import Response

from apps.productos.models import Producto, Tarea
from apps.users.models import Cliente, Empleado, Localidad
from apps.users.services.address_service import (
    get_operational_area_message,
    is_operational_area,
)

from .models import (
    Diseno,
    DisenoProducto,
    DisenoTarea,
    FormaTerreno,
    ImagenDiseno,
    ImagenReserva,
    Jardin,
    Reserva,
    ReservaEmpleado,
    Servicio,
)
from .pagination import SmallResultsSetPagination, StandardResultsSetPagination
from .serializers import (
    CrearDisenoSerializer,
    DisenoDetalleSerializer,
    DisenoSerializer,
    FormaTerrenoSerializer,
    JardinSerializer,
    ReservaSerializer,
    ServicioSerializer,
)
from .utils import ordenar_empleados_por_puntuacion

logger = logging.getLogger(__name__)


class ServicioViewSet(viewsets.ModelViewSet):
    queryset = Servicio.objects.all()
    serializer_class = ServicioSerializer
    pagination_class = StandardResultsSetPagination  # 10 items por página
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["activo"]
    search_fields = ["nombre", "descripcion"]
    ordering = ["nombre"]


class ReservaViewSet(viewsets.ModelViewSet):
    queryset = (
        Reserva.objects.select_related("cliente__persona", "servicio", "localidad_servicio", "pago")
        .prefetch_related("encuestas__cliente__persona", "encuestas__encuesta")
        .all()
    )
    serializer_class = ReservaSerializer
    pagination_class = SmallResultsSetPagination  # 5 items por página (para "Mis Reservas")
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    class ReservaFilter(django_filters.FilterSet):
        estado_pago_sena = django_filters.CharFilter(field_name="pago__estado_pago_sena")
        estado_pago_final = django_filters.CharFilter(field_name="pago__estado_pago_final")
        fecha_solicitud = django_filters.DateFromToRangeFilter(field_name="fecha_solicitud")
        fecha_finalizacion = django_filters.DateFromToRangeFilter(field_name="fecha_finalizacion")

        class Meta:
            model = Reserva
            fields = [
                "estado",
                "servicio",
                "fecha_solicitud",
                "fecha_finalizacion",
                "estado_pago_sena",
                "estado_pago_final",
            ]

    filterset_class = ReservaFilter
    search_fields = [
        "cliente__persona__nombre",
        "cliente__persona__apellido",
        "servicio__nombre",
    ]
    ordering = ["-fecha_solicitud", "-id_reserva"]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        """
        Filtrar reservas según el tipo de usuario:
        - Clientes: solo ven sus propias reservas (todos los estados)
        - Empleados/Staff: ven todas las reservas que tengan la seña pagada
          (solo muestran las que tienen estado_pago_sena = 'sena_pagada' o 'aprobado')
        """
        user = self.request.user

        # Si es staff, mostrar solo reservas con seña pagada
        if user.is_staff:
            return Reserva.objects.select_related("cliente__persona", "servicio", "localidad_servicio", "pago").filter(
                pago__estado_pago_sena__in=["sena_pagada", "aprobado"]
            )

        # Verificar si es empleado
        try:
            Empleado.objects.get(persona__email=user.email)
            # Empleados también solo ven reservas con seña pagada
            return Reserva.objects.select_related("cliente__persona", "servicio", "localidad_servicio", "pago").filter(
                pago__estado_pago_sena__in=["sena_pagada", "aprobado"]
            )
        except Empleado.DoesNotExist:
            pass

        # Si es cliente, filtrar solo sus reservas (sin restricción de estado)
        try:
            cliente = Cliente.objects.get(persona__email=user.email)
            return Reserva.objects.select_related("cliente__persona", "servicio", "localidad_servicio", "pago").filter(
                cliente=cliente
            )
        except Cliente.DoesNotExist:
            # Si no es cliente ni empleado, no mostrar nada
            return Reserva.objects.none()

    def retrieve(self, request, *args, **kwargs):
        """
        Sobrescribir retrieve para aplicar los filtros de permisos correctamente
        """
        try:
            # Usar get_queryset() para aplicar los filtros de permisos
            reserva = self.get_queryset().get(pk=kwargs["pk"])
            serializer = self.get_serializer(reserva)
            return Response(serializer.data)
        except Reserva.DoesNotExist:
            return Response(
                {"error": "Reserva no encontrada o no tienes permisos para verla"},
                status=status.HTTP_404_NOT_FOUND,
            )

    def create(self, request, *args, **kwargs):
        """
        Crear una reserva de un servicio del catálogo
        """
        data = request.data.copy()

        # Campos legacy (normalización): si el frontend los manda, los ignoramos
        data.pop("tipo_servicio_solicitado", None)

        # Obtener el cliente actual basado en el email del usuario autenticado
        try:
            cliente = Cliente.objects.select_related("persona").get(persona__email=request.user.email)
        except Cliente.DoesNotExist:
            return Response(
                {
                    "error": "Usuario no está registrado como cliente",
                    "detail": f"No se encontró un cliente con el email: {request.user.email}",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verificar que el servicio existe
        servicio_id = data.get("servicio")
        if not servicio_id:
            return Response(
                {"error": "El campo servicio es requerido"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            servicio = Servicio.objects.get(id_servicio=servicio_id, activo=True)
        except Servicio.DoesNotExist:
            return Response(
                {"error": "El servicio seleccionado no existe o no está disponible"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Asignar automáticamente el cliente autenticado
        data["cliente"] = cliente.id_cliente
        data["servicio"] = servicio.id_servicio

        localidad_id = data.get("localidad_servicio") or data.get("localidad_id")
        if not localidad_id:
            return Response(
                {"error": "Selecciona una localidad para poder avanzar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            localidad = Localidad.objects.get(id_localidad=localidad_id)
        except Localidad.DoesNotExist:
            return Response(
                {"error": "La localidad seleccionada no existe."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not is_operational_area(localidad.nombre_provincia, localidad.nombre_pais):
            return Response(
                {"error": get_operational_area_message()},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data["localidad_servicio"] = localidad.id_localidad

        # Asegurar estado inicial
        if "estado" not in data:
            data["estado"] = "pendiente"

        # Extraer imágenes antes de la serialización
        imagenes_jardin = request.FILES.getlist("imagenes_jardin")
        imagenes_ideas = request.FILES.getlist("imagenes_ideas")

        # Extraer descripciones (vienen como JSON array)
        import json

        descripciones_jardin = []
        descripciones_ideas = []

        try:
            if "descripciones_jardin" in request.data:
                descripciones_jardin = json.loads(request.data.get("descripciones_jardin", "[]"))
        except json.JSONDecodeError:
            descripciones_jardin = []

        try:
            if "descripciones_ideas" in request.data:
                descripciones_ideas = json.loads(request.data.get("descripciones_ideas", "[]"))
        except json.JSONDecodeError:
            descripciones_ideas = []

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        reserva = serializer.save()

        # Asignar seña fija (no requiere monto_total en este punto)
        reserva.asignar_sena()
        reserva.save()

        # Guardar imágenes del jardín con sus descripciones
        for index, imagen in enumerate(imagenes_jardin):
            descripcion = descripciones_jardin[index] if index < len(descripciones_jardin) else ""
            ImagenReserva.objects.create(
                reserva=reserva,
                imagen=imagen,
                tipo_imagen="jardin",
                descripcion=descripcion,
            )

        # Guardar imágenes de ideas con sus descripciones
        for index, imagen in enumerate(imagenes_ideas):
            descripcion = descripciones_ideas[index] if index < len(descripciones_ideas) else ""
            ImagenReserva.objects.create(
                reserva=reserva,
                imagen=imagen,
                tipo_imagen="ideas",
                descripcion=descripcion,
            )

        # Preparar respuesta con información de pago
        pago = reserva.obtener_pago()
        response_data = dict(serializer.data)
        response_data["pago_info"] = {
            "monto_sena": str(pago.monto_sena),
            "estado_pago_sena": pago.estado_pago_sena,
            "mensaje": f"Reserva creada. Monto de seña: ${pago.monto_sena}",
        }

        headers = self.get_success_headers(response_data)
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)

    @action(
        detail=True,
        methods=["get", "post", "put"],
        url_path="jardin",
        permission_classes=[IsAuthenticated],
    )
    def jardin(self, request, pk=None):
        """
        Endpoint para obtener/crear/actualizar la información del jardín asociado a una reserva
        GET /api/v1/servicios/reservas/{id}/jardin/
        POST/PUT para crear/actualizar
        """
        reserva = self.get_object()
        try:
            jardin = reserva.jardin
        except Jardin.DoesNotExist:
            jardin = None

        if request.method == "GET":
            if jardin is None:
                return Response(
                    {"message": "No existe información del jardín"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            serializer = JardinSerializer(jardin, context={"request": request})
            return Response(serializer.data)

        # Crear o actualizar
        data = request.data.copy()
        data["reserva"] = reserva.id_reserva
        # Extract zone images payloads from request.FILES (if present)
        # Expect files grouped by key like 'imagenes_zona_0', 'imagenes_zona_1', etc.
        imagenes_por_zona = {}
        descripciones_por_zona = {}
        for key in request.FILES:
            if key.startswith("imagenes_zona_"):
                try:
                    idx = int(key.replace("imagenes_zona_", ""))
                    imagenes_por_zona[idx] = request.FILES.getlist(key)
                except ValueError:
                    continue
        # Descripciones pueden venir como JSON arrays por zona con clave 'descripciones_zona_{i}'
        import json

        for k, v in request.data.items():
            if k.startswith("descripciones_zona_"):
                try:
                    idx = int(k.replace("descripciones_zona_", ""))
                    descripciones_por_zona[idx] = json.loads(v) if isinstance(v, str) else v
                except (ValueError, json.JSONDecodeError):
                    descripciones_por_zona[idx] = []

        try:
            if jardin is None:
                serializer = JardinSerializer(data=data, context={"request": request})
            else:
                serializer = JardinSerializer(jardin, data=data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            serializer.save()
            # After saving garden and zones, handle zone images
            try:
                zonas_input = request.data.get("zonas")
                if isinstance(zonas_input, str):
                    zonas_input = json.loads(zonas_input)
            except Exception:
                zonas_input = None
            saved_zonas = list(serializer.instance.zonas.order_by("id_zona"))
            # Map by index: zones in saved_zonas assumed to be in the input order
            for idx, zona_obj in enumerate(saved_zonas):
                files = imagenes_por_zona.get(idx, [])
                if not files:
                    continue
                # Limit to 3 files per requirements
                files = files[:3]
                descripciones = descripciones_por_zona.get(idx, [])
                from .models import ImagenZona

                # Remove existing zone images if any (we'll re-create to replace)
                zona_obj.imagenes.all().delete()
                for file_idx, file in enumerate(files):
                    descripcion = descripciones[file_idx] if file_idx < len(descripciones) else ""
                    ImagenZona.objects.create(
                        zona=zona_obj,
                        imagen=file,
                        descripcion=descripcion,
                    )
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error al crear/actualizar jardín: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # FormaTerrenoViewSet moved to module level below

    @action(detail=True, methods=["post"], url_path="confirmar-pago-sena")
    def confirmar_pago_sena(self, request, pk=None):
        """
        Endpoint para confirmar el pago de seña desde el frontend.
        Recibe el payment_id de MercadoPago y actualiza el estado de la reserva.
        """
        from apps.emails.services import EmailService

        reserva = self.get_object()
        payment_id = request.data.get("payment_id")

        logger.info(f"🔵 Confirmar pago seña llamado para reserva {reserva.id_reserva}")
        logger.info(f"💳 Payment ID recibido: {payment_id}")

        if not payment_id:
            return Response({"error": "payment_id es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        # Actualizar estado de pago
        pago = reserva.obtener_pago()
        pago.payment_id_sena = payment_id
        pago.estado_pago_sena = "sena_pagada"
        pago.fecha_pago_sena = timezone.now()
        pago.save(update_fields=["payment_id_sena", "estado_pago_sena", "fecha_pago_sena"])

        logger.info(f"✅ Pago de seña confirmado para reserva {reserva.id_reserva}: payment_id={payment_id}")

        # Enviar email de confirmación al cliente
        try:
            cliente = reserva.cliente
            logger.info(f"📧 Intentando enviar email a: {cliente.persona.email}")
            logger.info(f"👤 Cliente: {cliente.persona.nombre} {cliente.persona.apellido}")

            EmailService.send_payment_confirmation_email(
                user_email=cliente.persona.email,
                user_name=f"{cliente.persona.nombre} {cliente.persona.apellido}",
                reserva_id=reserva.id_reserva,
                servicio_nombre=reserva.servicio.nombre,
                monto=pago.monto_sena,
                payment_id=payment_id,
                tipo_pago="seña",
            )
            logger.info(f"✅ Email de confirmación enviado exitosamente a {cliente.persona.email}")
        except Exception as e:
            # No fallar el endpoint si el email falla
            logger.error(f"❌ Error al enviar email de confirmación al cliente: {str(e)}")
            import traceback

            logger.error(traceback.format_exc())

        # Enviar notificación a los administradores
        try:
            logger.info("📧 Enviando notificación a administradores...")

            EmailService.send_payment_notification_to_admin(
                reserva_id=reserva.id_reserva,
                cliente_nombre=f"{cliente.persona.nombre} {cliente.persona.apellido}",
                servicio_nombre=reserva.servicio.nombre,
                monto=pago.monto_sena,
                payment_id=payment_id,
                fecha_reserva=reserva.fecha_cita,
                direccion=reserva.direccion,
                observaciones=reserva.observaciones,
                tipo_pago="seña",
            )
            logger.info("✅ Notificación a administradores enviada exitosamente")
        except Exception as e:
            # No fallar el endpoint si el email falla
            logger.error(f"❌ Error al enviar notificación a administradores: {str(e)}")
            import traceback

            logger.error(traceback.format_exc())

        return Response(
            {
                "success": True,
                "mensaje": "Pago de seña confirmado exitosamente",
                "reserva": self.get_serializer(reserva).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="confirmar-pago-final")
    def confirmar_pago_final(self, request, pk=None):
        """
        Endpoint para confirmar el pago final desde el frontend.
        Recibe el payment_id de MercadoPago y actualiza el estado de la reserva.
        """
        from apps.emails.services import EmailService

        reserva = self.get_object()
        payment_id = request.data.get("payment_id")

        if not payment_id:
            return Response({"error": "payment_id es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        # Actualizar estado de pago
        pago = reserva.obtener_pago()
        pago.payment_id_final = payment_id
        pago.estado_pago_final = "pagado"
        pago.fecha_pago_final = timezone.now()
        pago.save(update_fields=["payment_id_final", "estado_pago_final", "fecha_pago_final"])

        logger.info(f"Pago final confirmado para reserva {reserva.id_reserva}: payment_id={payment_id}")

        # Enviar email de confirmación al cliente
        try:
            cliente = reserva.cliente
            EmailService.send_payment_confirmation_email(
                user_email=cliente.persona.email,
                user_name=f"{cliente.persona.nombre} {cliente.persona.apellido}",
                reserva_id=reserva.id_reserva,
                servicio_nombre=reserva.servicio.nombre,
                monto=pago.monto_final,
                payment_id=payment_id,
                tipo_pago="final",
            )
            logger.info(f"Email de confirmación de pago final enviado a {cliente.persona.email}")
        except Exception as e:
            # No fallar el endpoint si el email falla
            logger.error(f"Error al enviar email de confirmación: {str(e)}")

        return Response(
            {
                "success": True,
                "mensaje": "Pago final confirmado exitosamente",
                "reserva": self.get_serializer(reserva).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="reprogramar-por-clima",
        permission_classes=[IsAdminUser],
    )
    def reprogramar_por_clima(self, request, pk=None):
        """Permite al staff reprogramar una reserva por alerta climática."""
        reserva = self.get_object()

        if not reserva.servicio.reprogramable_por_clima:
            return Response(
                {"error": "Este servicio no admite reprogramación automática por clima"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        nueva_fecha_str = request.data.get("nueva_fecha")
        if not nueva_fecha_str:
            return Response(
                {"error": 'Debe indicar el campo "nueva_fecha" en formato ISO 8601'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            nueva_fecha = datetime.fromisoformat(nueva_fecha_str.replace("Z", "+00:00"))
            if timezone.is_naive(nueva_fecha):
                nueva_fecha = timezone.make_aware(nueva_fecha, timezone.get_current_timezone())
        except ValueError:
            return Response(
                {"error": "Formato de fecha inválido"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reserva.aplicar_reprogramacion(nueva_fecha, motivo="clima", confirmar=True)

                if reserva.weather_alert:
                        reserva.weather_alert.estado = "resolved"
                        reserva.weather_alert.resuelta_en = timezone.now()
                        reserva.weather_alert.save(update_fields=["estado", "resuelta_en"])

        from apps.emails.services import EmailService

        logger.info(
            "[Reprogramación] Llamando EmailService.send_weather_reprogram_notification "
            f"para reserva #{reserva.id_reserva}"
        )
        EmailService.send_weather_reprogram_notification(reserva=reserva, nueva_fecha=nueva_fecha)

        serializer = self.get_serializer(reserva)
        return Response(
            {
                "mensaje": "Reserva reprogramada correctamente",
                "reserva": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="crear-preferencia-sena")
    def crear_preferencia_sena(self, request, pk=None):
        """
        Crea una preferencia de MercadoPago para el pago de seña.
        El frontend usará esta preferencia para redirigir al checkout de MP.
        """
        try:
            import mercadopago
        except ImportError:
            logger.error("MercadoPago SDK no instalado: mercadopago")
            return Response(
                {"error": 'MercadoPago SDK no instalado en el servidor. Instale la librería "mercadopago".'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        from django.conf import settings

        reserva = self.get_object()
        pago = reserva.obtener_pago()

        # Validar que no haya sido pagada ya
        if pago.estado_pago_sena == "sena_pagada":
            return Response(
                {"error": "Esta seña ya ha sido pagada"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Si por alguna razón no hay seña asignada todavía, asignarla ahora
        if not pago.monto_sena or pago.monto_sena == 0:
            reserva.asignar_sena()
            pago = reserva.obtener_pago()

        try:
            sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)

            preference_data = {
                "items": [
                    {
                        "id": f"SENA-{reserva.id_reserva}",
                        "title": f"Seña - Reserva #{reserva.id_reserva} - {reserva.servicio.nombre}",
                        "description": f"Pago de seña para reserva de {reserva.servicio.nombre}",
                        "quantity": 1,
                        "unit_price": float(pago.monto_sena),
                        "currency_id": "ARS",
                        "category_id": "services",
                    }
                ],
                "payer": {
                    "name": reserva.cliente.persona.nombre,
                    "surname": reserva.cliente.persona.apellido,
                    "email": reserva.cliente.persona.email,
                },
                "back_urls": {
                    "success": (
                        f"{settings.FRONTEND_URL}/reservas/pago-exitoso"
                        f"?tipo=sena&reserva_id={reserva.id_reserva}"
                    ),
                    "failure": f"{settings.FRONTEND_URL}/mis-reservas",
                    "pending": f"{settings.FRONTEND_URL}/mis-reservas",
                },
                "external_reference": f"SENA-{reserva.id_reserva}",
                "statement_descriptor": "El Eden",
                "payment_methods": {"excluded_payment_types": [], "installments": 12},
            }

            logger.info(f"🔵 Creando preferencia de MercadoPago para reserva {reserva.id_reserva}")
            logger.info(f"💰 Monto: ${pago.monto_sena}")
            logger.info(f"👤 Cliente: {reserva.cliente.persona.email}")

            preference_response = sdk.preference().create(preference_data)

            logger.info(f"📦 Respuesta completa de MP: {preference_response}")

            # La respuesta puede venir en diferentes formatos según la versión del SDK
            if "response" in preference_response:
                preference = preference_response["response"]
            else:
                preference = preference_response

            logger.info(f"✅ Preferencia creada: {preference.get('id')}")
            logger.info(f"🔗 Init point: {preference.get('init_point')}")
            logger.info(f"🔗 Sandbox: {preference.get('sandbox_init_point')}")

            return Response(
                {
                    "preference_id": preference.get("id"),
                    "init_point": preference.get("init_point"),
                    "sandbox_init_point": preference.get("sandbox_init_point"),
                    "monto": str(pago.monto_sena),
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(f"Error al crear preferencia de MercadoPago: {str(e)}")

    @action(detail=True, methods=["post"], url_path="crear-preferencia-final")
    def crear_preferencia_final(self, request, pk=None):
        """
        Crea una preferencia de MercadoPago para el pago final.
        """
        import mercadopago
        from django.conf import settings

        reserva = self.get_object()
        pago = reserva.obtener_pago()

        # Validar que la seña haya sido pagada
        if pago.estado_pago_sena != "sena_pagada":
            return Response(
                {"error": "Primero debe pagarse la seña"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validar que no haya sido pagado ya
        if pago.estado_pago_final == "pagado":
            return Response(
                {"error": "Este pago final ya ha sido completado"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validar que exista un monto final
        if pago.monto_final <= 0:
            return Response(
                {"error": "No hay monto final a pagar"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)

            preference_data = {
                "items": [
                    {
                        "title": f"Pago Final - Reserva #{reserva.id_reserva} - {reserva.servicio.nombre}",
                        "quantity": 1,
                        "unit_price": float(pago.monto_final),
                        "currency_id": "ARS",
                    }
                ],
                "back_urls": {
                    "success": (
                        f"{settings.FRONTEND_URL}/reservas/pago-exitoso"
                        f"?tipo=final&reserva_id={reserva.id_reserva}"
                    ),
                    "failure": f"{settings.FRONTEND_URL}/mis-reservas",
                    "pending": f"{settings.FRONTEND_URL}/mis-reservas",
                },
                "external_reference": f"FINAL-{reserva.id_reserva}",
                "statement_descriptor": "El Eden - Paisajismo",
                "notification_url": f"{settings.BACKEND_URL}/api/v1/servicios/mercadopago/notificacion/",
            }

            preference_response = sdk.preference().create(preference_data)
            preference = preference_response["response"]

            logger.info(f"Preferencia de pago final creada para reserva {reserva.id_reserva}: {preference['id']}")

            return Response(
                {
                    "preference_id": preference["id"],
                    "init_point": preference["init_point"],
                    "sandbox_init_point": preference.get("sandbox_init_point"),
                    "monto": str(pago.monto_final),
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(f"Error al crear preferencia de pago final: {str(e)}")
            return Response(
                {"error": "No se pudo crear la preferencia de pago", "detalle": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="empleados-disponibles")
    def empleados_disponibles(self, request):
        """
        Obtener empleados disponibles para una fecha específica
        Query params: fecha (YYYY-MM-DD)
        """
        from datetime import datetime

        from apps.servicios.models import ReservaEmpleado

        fecha_str = request.query_params.get("fecha")
        if not fecha_str:
            return Response(
                {"error": "El parámetro fecha es requerido"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"error": "Formato de fecha inválido. Use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Obtener reservas activas en esa fecha
        reservas_en_fecha = Reserva.objects.filter(
            fecha_cita__date=fecha, estado__in=["confirmada", "en_curso"]
        ).values_list("id_reserva", flat=True)

        # Obtener empleados asignados como operadores en esas reservas
        empleados_ocupados = ReservaEmpleado.objects.filter(reserva__in=reservas_en_fecha, rol="operador").values_list(
            "empleado_id", flat=True
        )

        # Obtener empleados disponibles (no ocupados) y priorizarlos por puntuación
        empleados_disponibles_qs = Empleado.objects.exclude(id_empleado__in=empleados_ocupados).select_related(
            "persona"
        )

        empleados_ordenados = ordenar_empleados_por_puntuacion(empleados_disponibles_qs)

        data = []
        for prioridad, emp in enumerate(empleados_ordenados, start=1):
            data.append(
                {
                    "id": emp.id_empleado,
                    "nombre": emp.persona.nombre,
                    "apellido": emp.persona.apellido,
                    "email": emp.persona.email,
                    "prioridad": prioridad,
                    "puntuacion_promedio": (
                        float(emp.puntuacion_promedio) if emp.puntuacion_promedio is not None else None
                    ),
                    "puntuacion_cantidad": emp.puntuacion_cantidad,
                    "puntuacion_acumulada": (
                        float(emp.puntuacion_acumulada) if emp.puntuacion_acumulada is not None else None
                    ),
                    "fecha_ultima_puntuacion": (
                        emp.fecha_ultima_puntuacion.isoformat() if emp.fecha_ultima_puntuacion else None
                    ),
                }
            )

        return Response(
            {
                "fecha": fecha_str,
                "empleados_disponibles": data,
                "total_disponibles": len(data),
            }
        )

    @action(detail=False, methods=["get"], url_path="fechas-disponibles")
    def fechas_disponibles(self, request):
        """
        Verificar si una fecha tiene empleados disponibles
        Query params: fecha_inicio, fecha_fin (opcional)
        """
        from datetime import datetime, timedelta

        from apps.servicios.models import ReservaEmpleado

        fecha_inicio_str = request.query_params.get("fecha_inicio")
        fecha_fin_str = request.query_params.get("fecha_fin")

        if not fecha_inicio_str:
            return Response(
                {"error": "El parámetro fecha_inicio es requerido"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            fecha_inicio = datetime.strptime(fecha_inicio_str, "%Y-%m-%d").date()
            if fecha_fin_str:
                fecha_fin = datetime.strptime(fecha_fin_str, "%Y-%m-%d").date()
            else:
                fecha_fin = fecha_inicio + timedelta(days=30)  # 30 días por defecto
        except ValueError:
            return Response(
                {"error": "Formato de fecha inválido. Use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Obtener total de empleados operadores
        total_empleados = Empleado.objects.count()

        # Generar lista de fechas bloqueadas
        fechas_bloqueadas = []
        current_date = fecha_inicio

        while current_date <= fecha_fin:
            # Contar reservas activas en esta fecha
            reservas_en_fecha = Reserva.objects.filter(
                fecha_cita__date=current_date, estado__in=["confirmada", "en_curso"]
            ).values_list("id_reserva", flat=True)

            # Contar empleados ocupados
            empleados_ocupados = (
                ReservaEmpleado.objects.filter(reserva__in=reservas_en_fecha, rol="operador")
                .values("empleado_id")
                .distinct()
                .count()
            )

            # Si todos los empleados están ocupados, bloquear la fecha
            if empleados_ocupados >= total_empleados:
                fechas_bloqueadas.append(current_date.strftime("%Y-%m-%d"))

            current_date += timedelta(days=1)

        return Response(
            {
                "fecha_inicio": fecha_inicio_str,
                "fecha_fin": fecha_fin.strftime("%Y-%m-%d"),
                "fechas_bloqueadas": fechas_bloqueadas,
                "total_empleados": total_empleados,
            }
        )

    @action(detail=True, methods=["post"], url_path="finalizar-servicio")
    def finalizar_servicio(self, request, pk=None):
        """
        Finalizar un servicio (cambiar estado a completada)
        Solo pueden hacerlo:
        - Administradores
        - Empleados asignados a la reserva
        """
        reserva = self.get_object()
        user = request.user

        # Verificar permisos
        es_admin = user.is_staff or user.is_superuser

        # Verificar si es empleado asignado
        es_empleado_asignado = False
        if not es_admin:
            try:
                empleado = Empleado.objects.get(persona__email=user.email)
                # Verificar si está asignado a esta reserva
                es_empleado_asignado = ReservaEmpleado.objects.filter(reserva=reserva, empleado=empleado).exists()
            except Empleado.DoesNotExist:
                pass

        # Si no es admin ni empleado asignado, denegar acceso
        if not es_admin and not es_empleado_asignado:
            return Response(
                {"error": "No tiene permisos para finalizar este servicio"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Verificar que el estado actual permita finalizarlo
        if reserva.estado == "completada":
            return Response(
                {"error": "El servicio ya está finalizado"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if reserva.estado == "cancelada":
            return Response(
                {"error": "No se puede finalizar un servicio cancelado"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Cambiar estado a completada
        from django.utils import timezone

        reserva.estado = "completada"
        reserva.fecha_finalizacion = timezone.now()
        reserva.save()
        # Enviar email al cliente con la encuesta de satisfacción (sin token público)
        try:
            from apps.emails.services import EmailService
            from apps.encuestas.models import Encuesta

            cliente = reserva.cliente
            encuesta_activa = Encuesta.obtener_activa()

            if encuesta_activa:
                EmailService.send_survey_request_email(
                    cliente_email=cliente.persona.email,
                    cliente_nombre=f"{cliente.persona.nombre} {cliente.persona.apellido}",
                    reserva_id=reserva.id_reserva,
                    servicio_nombre=reserva.servicio.nombre,
                    encuesta_titulo=encuesta_activa.titulo,
                )
                logger.info(f"✅ Email de encuesta enviado a {cliente.persona.email}")
            else:
                logger.warning("⚠️ No hay encuesta activa para enviar al cliente")
        except Exception as e:
            # No fallar el endpoint si falla el email
            logger.error(f"❌ Error al enviar email de encuesta: {str(e)}")
            import traceback

            logger.error(traceback.format_exc())

        serializer = self.get_serializer(reserva)
        return Response({"message": "Servicio finalizado exitosamente", "reserva": serializer.data})

    @action(detail=True, methods=["get"], url_path="comprobante-pago")
    def comprobante_pago(self, request, pk=None):
        """
        Obtener comprobante de pago de una reserva
        Query params: tipo (sena|final)
        """
        reserva = self.get_object()
        pago = reserva.obtener_pago()
        tipo = request.query_params.get("tipo", "sena")

        # Validar que el usuario sea el dueño de la reserva
        try:
            cliente = Cliente.objects.get(persona__email=request.user.email)
            if reserva.cliente != cliente and not request.user.is_staff:
                return Response(
                    {"error": "No tienes permiso para ver este comprobante"},
                    status=status.HTTP_403_FORBIDDEN,
                )
        except Cliente.DoesNotExist:
            if not request.user.is_staff:
                return Response({"error": "Usuario no autorizado"}, status=status.HTTP_403_FORBIDDEN)

        # Preparar datos del comprobante según el tipo
        if tipo == "sena":
            if not pago.payment_id_sena:
                return Response(
                    {"error": "No hay pago de seña registrado para esta reserva"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            comprobante = {
                "reserva_id": reserva.id_reserva,
                "tipo_pago": "sena",
                "tipo_pago_display": "Seña Inicial",
                "monto": str(pago.monto_sena),
                "estado": pago.estado_pago_sena,
                "fecha_pago": pago.fecha_pago_sena,
                "payment_id": pago.payment_id_sena,
            }
        elif tipo == "final":
            if not pago.payment_id_final:
                return Response(
                    {"error": "No hay pago final registrado para esta reserva"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            comprobante = {
                "reserva_id": reserva.id_reserva,
                "tipo_pago": "final",
                "tipo_pago_display": "Pago Final",
                "monto": str(pago.monto_final),
                "estado": pago.estado_pago_final,
                "fecha_pago": pago.fecha_pago_final,
                "payment_id": pago.payment_id_final,
            }
        else:
            return Response(
                {"error": "Tipo de pago inválido. Use: sena o final"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Agregar información común
        comprobante.update(
            {
                "cliente": {
                    "nombre": f"{reserva.cliente.persona.nombre} {reserva.cliente.persona.apellido}",
                    "email": reserva.cliente.persona.email,
                    "telefono": reserva.cliente.persona.telefono,
                },
                "servicio": {
                    "nombre": reserva.servicio.nombre,
                    "descripcion": reserva.servicio.descripcion,
                },
                "fecha_solicitud": reserva.fecha_solicitud,
                "fecha_reserva": reserva.fecha_cita,
                "observaciones": reserva.observaciones,
                "superficie_aproximada": reserva.superficie_aproximada,
                "objetivo_diseno": reserva.objetivo_diseno_id,
                "objetivo_diseno_nombre": reserva.objetivo_diseno.nombre
                if reserva.objetivo_diseno_id
                else None,
                "objetivo_diseno_codigo": reserva.objetivo_diseno.codigo
                if reserva.objetivo_diseno_id
                else None,
                "nivel_intervencion": reserva.nivel_intervencion,
                "presupuesto_aproximado": reserva.presupuesto_aproximado,
            }
        )

        return Response(comprobante)


class FormaTerrenoViewSet(viewsets.ModelViewSet):
    """ViewSet para CRUD de formas de terreno (podrán acceder admin vía API)"""

    queryset = FormaTerreno.objects.all()
    serializer_class = FormaTerrenoSerializer
    # Allow safe methods (GET/HEAD/OPTIONS) to be public/read-only, while keeping admin-only for write operations
    permission_classes = [AllowAny]

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [AllowAny()]
        return [IsAdminUser()]

    pagination_class = None


class DisenoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de diseños/propuestas"""

    queryset = (
        Diseno.objects.select_related(
            "servicio",
            "disenador",
            "disenador__persona",
            "reserva",
            "reserva__cliente__persona",
        )
        .prefetch_related("productos", "imagenes")
        .all()
    )
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = {
        "estado": ["exact"],
        "servicio": ["exact"],
        "disenador": ["exact"],
        "reserva": ["exact"],
        "fecha_creacion": ["date", "range"],
        "reserva__fecha_solicitud": ["date", "range"],
        "reserva__fecha_finalizacion": ["date", "range"],
        "reserva__estado": ["exact"],
    }
    search_fields = [
        "titulo",
        "descripcion",
        "reserva__cliente__persona__nombre",
        "reserva__cliente__persona__apellido",
    ]
    ordering = ["-fecha_creacion", "-id_diseno"]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        """
        Filtrar diseños según el tipo de usuario:
        - Administradores: ven todos los diseños
        - Empleados: ven diseños que crearon O de reservas donde están asignados
        - Clientes: ven los diseños de sus reservas
        """
        user = self.request.user

        # Si es staff/administrador, mostrar todos los diseños
        if user.is_staff:
            return (
                Diseno.objects.select_related(
                    "servicio",
                    "disenador",
                    "disenador__persona",
                    "reserva",
                    "reserva__cliente__persona",
                )
                .prefetch_related("productos", "imagenes")
                .all()
            )

        # Verificar si es empleado
        try:
            empleado = Empleado.objects.get(persona__email=user.email)
            # Empleados ven:
            # 1. Diseños que ellos crearon
            # 2. Diseños de reservas donde están asignados
            from django.db.models import Q

            return (
                Diseno.objects.select_related(
                    "servicio",
                    "disenador",
                    "disenador__persona",
                    "reserva",
                    "reserva__cliente__persona",
                )
                .prefetch_related("productos", "imagenes")
                .filter(Q(disenador=empleado) | Q(reserva__asignaciones__empleado=empleado))
                .distinct()
            )
        except Empleado.DoesNotExist:
            pass

        # Verificar si es cliente
        try:
            cliente = Cliente.objects.get(persona__email=user.email)
            # Clientes ven los diseños de sus reservas
            return (
                Diseno.objects.select_related(
                    "servicio",
                    "disenador",
                    "disenador__persona",
                    "reserva",
                    "reserva__cliente__persona",
                )
                .prefetch_related("productos", "imagenes", "tareas_diseno")
                .filter(reserva__cliente=cliente)
            )
        except Cliente.DoesNotExist:
            pass

        # Si no es ninguno de los anteriores, no mostrar ningún diseño
        return Diseno.objects.none()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return DisenoDetalleSerializer
        elif self.action == "crear_diseno_completo":
            return CrearDisenoSerializer
        return DisenoSerializer

    @action(detail=False, methods=["post"], url_path="crear-completo")
    @transaction.atomic
    def crear_diseno_completo(self, request):
        """
        Crear un diseño completo con productos e imágenes
        POST /api/v1/servicios/disenos/crear-completo/
        """
        import logging

        logger = logging.getLogger(__name__)

        # Log para debug
        logger.warning("🔍 Datos recibidos en crear_diseno_completo:")
        logger.warning(f"   - servicio_id: {request.data.get('servicio_id')}")
        logger.warning(f"   - reserva_id: {request.data.get('reserva_id')}")
        logger.warning(f"   - titulo: {request.data.get('titulo')}")

        # Obtener datos del formulario y convertir tipos
        data = {
            "titulo": request.data.get("titulo"),
            "descripcion": request.data.get("descripcion"),
            "presupuesto": float(request.data.get("presupuesto", 0)),
            "servicio_id": int(request.data.get("servicio_id")),
            "notas_internas": request.data.get("notas_internas", ""),
        }

        # Agregar reserva_id si existe
        if request.data.get("reserva_id"):
            data["reserva_id"] = int(request.data.get("reserva_id"))

        # Agregar fecha_propuesta si existe
        if request.data.get("fecha_propuesta"):
            data["fecha_propuesta"] = request.data.get("fecha_propuesta")

        # Intentar obtener el empleado actual
        try:
            empleado = Empleado.objects.get(persona__email=request.user.email)
            data["disenador_id"] = empleado.id_empleado
        except Empleado.DoesNotExist:
            pass  # No es empleado, puede ser admin

        import json

        # Procesar productos si vienen como JSON string (para validación + cálculo + creación)
        productos_data = request.data.get("productos")
        if productos_data and isinstance(productos_data, str):
            productos_data = json.loads(productos_data)

        # Procesar tareas_diseno si vienen como JSON string
        tareas_diseno_data = request.data.get("tareas_diseno")
        if tareas_diseno_data is None:
            try:
                tareas_diseno_data = request.data.getlist("tareas_diseno")
            except Exception:
                tareas_diseno_data = None
        if tareas_diseno_data and isinstance(tareas_diseno_data, str):
            tareas_diseno_data = json.loads(tareas_diseno_data)
        if isinstance(tareas_diseno_data, list) and len(tareas_diseno_data) == 1 and isinstance(tareas_diseno_data[0], str):
            # case: ['[1,2]']
            s = tareas_diseno_data[0].strip()
            if s.startswith("["):
                tareas_diseno_data = json.loads(s)

        data["productos"] = productos_data or []
        data["tareas_diseno"] = tareas_diseno_data or []

        # Validar datos (incluye tareas_diseno y estructura de productos)
        serializer = CrearDisenoSerializer(data=data)
        if not serializer.is_valid():
            logger.error(f"Errores de validación: {serializer.errors}")
        serializer.is_valid(raise_exception=True)

        productos_data = serializer.validated_data.get("productos") or []
        tareas_diseno_items = serializer.validated_data.get("tareas_diseno") or []

        # Calcular duración total desde tareas asociadas a productos
        from apps.servicios.scheduling import compute_work_schedule

        total_minutes = 0
        if productos_data:
            producto_ids = [p.get("producto_id") for p in productos_data if p.get("producto_id")]
            productos_qs = Producto.objects.filter(id_producto__in=producto_ids).prefetch_related("tareas")
            duracion_por_producto = {
                prod.id_producto: sum(int(t.duracion_base or 0) for t in prod.tareas.all()) for prod in productos_qs
            }
            # Sumar por cada item enviado (si se repite un producto, cuenta varias veces)
            for item in productos_data:
                pid = item.get("producto_id")
                if pid is None:
                    continue
                qty = int(item.get("cantidad") or 0)
                if qty < 0:
                    qty = 0
                total_minutes += int(duracion_por_producto.get(int(pid), 0)) * qty

        if tareas_diseno_items:
            qty_by_id = {int(i["tarea_id"]): int(i.get("cantidad") or 1) for i in tareas_diseno_items}
            tareas_qs = Tarea.objects.filter(id_tarea__in=list(qty_by_id.keys()))
            total_minutes += sum(int(t.duracion_base or 0) * int(qty_by_id.get(t.id_tarea, 1)) for t in tareas_qs)

        schedule = compute_work_schedule(serializer.validated_data.get("fecha_propuesta"), total_minutes)
        start_local = schedule.start_local
        end_local = schedule.end_local

        # Crear el diseño
        diseno = Diseno.objects.create(
            titulo=serializer.validated_data["titulo"],
            descripcion=serializer.validated_data["descripcion"],
            presupuesto=serializer.validated_data["presupuesto"],
            reserva_id=serializer.validated_data.get("reserva_id"),
            servicio_id=serializer.validated_data["servicio_id"],
            disenador_id=serializer.validated_data.get("disenador_id"),
            notas_internas=serializer.validated_data.get("notas_internas", ""),
            # Mantener fecha_propuesta como inicio normalizado (compatibilidad)
            fecha_propuesta=start_local,
            fecha_inicio=start_local.date(),
            hora_inicio=start_local.time().replace(tzinfo=None),
            fecha_fin=end_local.date(),
            hora_fin=end_local.time().replace(tzinfo=None),
            estado="borrador",
        )

        if tareas_diseno_items:
            DisenoTarea.objects.filter(diseno=diseno).delete()
            DisenoTarea.objects.bulk_create(
                [
                    DisenoTarea(
                        diseno=diseno,
                        tarea_id=int(item["tarea_id"]),
                        cantidad=int(item.get("cantidad") or 1),
                    )
                    for item in tareas_diseno_items
                ]
            )

        # Si hay reserva asociada, cambiar su estado a 'confirmada'
        if diseno.reserva:
            # Validar que la reserva tenga un jardín asociado antes de crear el diseño
            if not hasattr(diseno.reserva, "jardin"):
                return Response(
                    {
                        "error": (
                            "No existe información del jardín para esta reserva. "
                            "Cargue información del jardín primero."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            diseno.reserva.estado = "confirmada"
            # Normalización: persistir fecha/hora de inicio real desde "crear diseño"
            diseno.reserva.fecha_inicio = start_local
            diseno.reserva.save()

        from apps.productos.models import Stock

        if productos_data:

            # Primero validar stock disponible (solo bloquear si no hay stock en absoluto)
            for prod in productos_data:
                producto = Producto.objects.get(id_producto=prod["producto_id"])

                # Obtener stock del producto
                try:
                    stock = Stock.objects.get(producto=producto)
                    # Solo bloquear si no hay stock disponible (0 o menos)
                    if stock.cantidad < 1:
                        return Response(
                            {
                                "error": f"El producto {producto.nombre} no tiene stock disponible",
                                "detail": (
                                    f"Stock disponible: {stock.cantidad} unidades. "
                                    "No se pueden crear diseños con productos sin stock."
                                ),
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                except Stock.DoesNotExist:
                    return Response(
                        {
                            "error": f"El producto {producto.nombre} no tiene stock registrado",
                            "detail": "Por favor, contacte al administrador",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # Si todo está bien, crear los productos del diseño
            for prod in productos_data:
                producto = Producto.objects.get(id_producto=prod["producto_id"])
                DisenoProducto.objects.create(
                    diseno=diseno,
                    producto=producto,
                    cantidad=prod["cantidad"],
                    precio_unitario=prod["precio_unitario"],
                    notas=prod.get("notas", ""),
                )

        # Procesar imágenes
        imagenes = request.FILES.getlist("imagenes_diseño")
        for idx, imagen in enumerate(imagenes):
            ImagenDiseno.objects.create(diseno=diseno, imagen=imagen, orden=idx, descripcion=f"Imagen {idx + 1}")

        # Retornar el diseño creado con todos sus detalles
        output_serializer = DisenoDetalleSerializer(diseno, context={"request": request})
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """
        Actualizar un diseño existente (solo si está en borrador y el usuario es el creador o admin)
        PUT/PATCH /api/v1/servicios/disenos/<id>/
        """
        import json

        from django.utils.dateparse import parse_datetime
        from django.utils import timezone

        from apps.servicios.scheduling import compute_work_schedule

        diseno = self.get_object()
        user = request.user

        # Solo permitir actualizar diseños en borrador
        if diseno.estado != "borrador":
            return Response(
                {"error": "Solo se pueden editar diseños en estado borrador"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verificar permisos: solo el creador o administradores pueden editar
        if not user.is_staff:
            try:
                empleado = Empleado.objects.get(persona__email=user.email)
                if diseno.disenador != empleado:
                    return Response(
                        {"error": "Solo el creador del diseño puede editarlo"},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            except Empleado.DoesNotExist:
                return Response(
                    {"error": "No tiene permisos para editar este diseño"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # Actualizar campos básicos
        if "titulo" in request.data:
            diseno.titulo = request.data["titulo"]
        if "descripcion" in request.data:
            diseno.descripcion = request.data["descripcion"]
        if "presupuesto" in request.data:
            diseno.presupuesto = float(request.data["presupuesto"])
        if "fecha_propuesta" in request.data:
            raw_fecha = request.data["fecha_propuesta"]
            if isinstance(raw_fecha, str):
                parsed = parse_datetime(raw_fecha)
                if parsed is None:
                    return Response(
                        {"error": "fecha_propuesta inválida"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if timezone.is_naive(parsed):
                    parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
                diseno.fecha_propuesta = parsed
            else:
                diseno.fecha_propuesta = raw_fecha
        if "notas_internas" in request.data:
            diseno.notas_internas = request.data["notas_internas"]

        # Actualizar productos (eliminar los antiguos y crear nuevos)
        productos_payload = None
        if "productos" in request.data:
            # Eliminar productos anteriores
            diseno.productos.all().delete()

            # Crear nuevos productos
            productos_payload = (
                json.loads(request.data["productos"])
                if isinstance(request.data["productos"], str)
                else request.data["productos"]
            )

            for prod in productos_payload:
                producto = Producto.objects.get(id_producto=prod["producto_id"])
                DisenoProducto.objects.create(
                    diseno=diseno,
                    producto=producto,
                    cantidad=prod["cantidad"],
                    precio_unitario=prod["precio_unitario"],
                    notas=prod.get("notas", ""),
                )

        # Actualizar tareas del diseño (tabla intermedia con cantidad)
        tareas_diseno_payload = None
        if "tareas_diseno" in request.data:
            raw = request.data.get("tareas_diseno")
            if raw is None:
                try:
                    raw = request.data.getlist("tareas_diseno")
                except Exception:
                    raw = None
            if isinstance(raw, str):
                tareas_diseno_payload = json.loads(raw) if raw.strip().startswith("[") else [int(raw)]
            elif isinstance(raw, list):
                if len(raw) == 1 and isinstance(raw[0], str) and raw[0].strip().startswith("["):
                    tareas_diseno_payload = json.loads(raw[0])
                else:
                    tareas_diseno_payload = raw
            elif raw is None:
                tareas_diseno_payload = []

            # Normalizar a lista de {tarea_id, cantidad}
            merged = {}
            for item in (tareas_diseno_payload or []):
                if isinstance(item, (int, str)):
                    tarea_id = int(item)
                    qty = 1
                elif isinstance(item, dict):
                    tarea_id = item.get("tarea_id", item.get("id_tarea", item.get("tarea")))
                    if tarea_id is None:
                        return Response(
                            {"error": "Cada tarea debe tener 'tarea_id' (o 'id_tarea' / 'tarea')"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    tarea_id = int(tarea_id)
                    qty = int(item.get("cantidad", 1))
                else:
                    return Response(
                        {"error": "Formato inválido de tareas_diseno"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                if qty < 1:
                    return Response(
                        {"error": "La cantidad de una tarea debe ser >= 1"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                merged[tarea_id] = merged.get(tarea_id, 0) + qty

            tareas_items = [{"tarea_id": tid, "cantidad": qty} for tid, qty in merged.items()]
            ids = [i["tarea_id"] for i in tareas_items]
            existentes = set(Tarea.objects.filter(id_tarea__in=ids).values_list("id_tarea", flat=True))
            faltantes = [i for i in ids if i not in existentes]
            if faltantes:
                return Response(
                    {"error": f"Tareas inexistentes: {faltantes}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            DisenoTarea.objects.filter(diseno=diseno).delete()
            DisenoTarea.objects.bulk_create(
                [
                    DisenoTarea(
                        diseno=diseno,
                        tarea_id=int(it["tarea_id"]),
                        cantidad=int(it.get("cantidad") or 1),
                    )
                    for it in tareas_items
                ]
            )

        # Agregar nuevas imágenes (no eliminar las existentes)
        imagenes = request.FILES.getlist("imagenes_diseño")
        if imagenes:
            ultimo_orden = diseno.imagenes.count()
            for idx, imagen in enumerate(imagenes):
                ImagenDiseno.objects.create(
                    diseno=diseno,
                    imagen=imagen,
                    orden=ultimo_orden + idx,
                    descripcion=f"Imagen {ultimo_orden + idx + 1}",
                )

        # Recalcular programación si cambió fecha_propuesta, productos o tareas_diseno
        if "fecha_propuesta" in request.data or productos_payload is not None or tareas_diseno_payload is not None:
            total_minutes = 0

            if productos_payload is None:
                lineas = list(diseno.productos.values("producto_id", "cantidad"))
                producto_ids = [l["producto_id"] for l in lineas if l.get("producto_id")]
                if producto_ids:
                    productos_qs = Producto.objects.filter(id_producto__in=producto_ids).prefetch_related("tareas")
                    duracion_por_producto = {
                        prod.id_producto: sum(int(t.duracion_base or 0) for t in prod.tareas.all()) for prod in productos_qs
                    }
                    for l in lineas:
                        pid = l.get("producto_id")
                        if pid is None:
                            continue
                        qty = int(l.get("cantidad") or 0)
                        if qty < 0:
                            qty = 0
                        total_minutes += int(duracion_por_producto.get(int(pid), 0)) * qty
            else:
                producto_ids = [p.get("producto_id") for p in productos_payload if p.get("producto_id")]
                if producto_ids:
                    productos_qs = Producto.objects.filter(id_producto__in=producto_ids).prefetch_related("tareas")
                    duracion_por_producto = {
                        prod.id_producto: sum(int(t.duracion_base or 0) for t in prod.tareas.all()) for prod in productos_qs
                    }
                    for item in productos_payload:
                        pid = item.get("producto_id")
                        if pid is None:
                            continue
                        qty = int(item.get("cantidad") or 0)
                        if qty < 0:
                            qty = 0
                        total_minutes += int(duracion_por_producto.get(int(pid), 0)) * qty

            # Sumar tareas propias del diseño (con repetición/cantidad)
            if tareas_diseno_payload is None:
                items = list(diseno.diseno_tareas.values("tarea_id", "cantidad"))
                qty_by_id = {int(i["tarea_id"]): int(i.get("cantidad") or 1) for i in items}
            else:
                # tareas_diseno_payload puede ser list[int|dict]
                merged = {}
                for item in (tareas_diseno_payload or []):
                    if isinstance(item, (int, str)):
                        tarea_id = int(item)
                        qty = 1
                    elif isinstance(item, dict):
                        tarea_id = item.get("tarea_id", item.get("id_tarea", item.get("tarea")))
                        if tarea_id is None:
                            tarea_id = None
                        else:
                            tarea_id = int(tarea_id)
                        qty = int(item.get("cantidad", 1))
                    else:
                        continue
                    if tarea_id is None:
                        continue
                    if qty < 1:
                        qty = 1
                    merged[tarea_id] = merged.get(tarea_id, 0) + qty
                qty_by_id = merged

            if qty_by_id:
                tareas_qs = Tarea.objects.filter(id_tarea__in=list(qty_by_id.keys()))
                total_minutes += sum(
                    int(t.duracion_base or 0) * int(qty_by_id.get(t.id_tarea, 1)) for t in tareas_qs
                )

            schedule = compute_work_schedule(diseno.fecha_propuesta, total_minutes)
            start_local = schedule.start_local
            end_local = schedule.end_local

            # Mantener fecha_propuesta como inicio normalizado (compatibilidad)
            diseno.fecha_propuesta = start_local
            diseno.fecha_inicio = start_local.date()
            diseno.hora_inicio = start_local.time().replace(tzinfo=None)
            diseno.fecha_fin = end_local.date()
            diseno.hora_fin = end_local.time().replace(tzinfo=None)

            # Normalización: persistir en la reserva el inicio real del servicio
            if diseno.reserva_id:
                diseno.reserva.fecha_inicio = start_local
                diseno.reserva.save(update_fields=["fecha_inicio"])

        diseno.save()

        # Retornar el diseño actualizado con todos sus detalles
        output_serializer = DisenoDetalleSerializer(diseno, context={"request": request})
        return Response(output_serializer.data)

    @action(detail=True, methods=["post"])
    def presentar(self, request, pk=None):
        """Presentar el diseño al cliente"""
        from apps.emails.services import EmailService

        diseno = self.get_object()
        diseno.presentar()

        # Enviar email al cliente notificando la propuesta
        try:
            if diseno.reserva and diseno.reserva.cliente:
                cliente = diseno.reserva.cliente

                productos_lista = []
                for dp in diseno.productos.all():
                    productos_lista.append(
                        {
                            "nombre": dp.producto.nombre,
                            "cantidad": dp.cantidad,
                            "precio_unitario": float(dp.precio_unitario),
                        }
                    )

                imagenes_count = diseno.imagenes.count()

                disenador_nombre = None
                if diseno.disenador and diseno.disenador.persona:
                    disenador_nombre = f"{diseno.disenador.persona.nombre} {diseno.disenador.persona.apellido}"

                EmailService.send_design_proposal_notification(
                    cliente_email=cliente.persona.email,
                    cliente_nombre=f"{cliente.persona.nombre} {cliente.persona.apellido}",
                    diseno_id=diseno.id_diseno,
                    titulo_diseno=diseno.titulo,
                    descripcion=diseno.descripcion,
                    presupuesto=diseno.presupuesto,
                    reserva_id=diseno.reserva.id_reserva,
                    servicio_nombre=diseno.servicio.nombre,
                    disenador_nombre=disenador_nombre,
                    fecha_propuesta=diseno.fecha_propuesta,
                    productos_lista=productos_lista,
                    imagenes_count=imagenes_count,
                )
                logger.info(f"✅ Email de propuesta de diseño enviado a {cliente.persona.email}")
            else:
                logger.warning(
                    f"⚠️ No se pudo enviar email: diseño {diseno.id_diseno} no tiene reserva o cliente asociado"
                )
        except Exception as e:
            # No fallar el endpoint si falla el email
            logger.error(f"❌ Error al enviar email de propuesta de diseño: {str(e)}")
            import traceback

            logger.error(traceback.format_exc())

        serializer = self.get_serializer(diseno)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def aceptar(self, request, pk=None):
        """Aceptar el diseño (acción del cliente)"""
        diseno = self.get_object()
        observaciones = request.data.get("observaciones")
        diseno.aceptar(observaciones)
        serializer = self.get_serializer(diseno)
        return Response(serializer.data)

    def _buscar_fecha_con_empleados_disponibles(self, fecha_inicial, empleados_necesarios=2, max_dias_busqueda=30):
        """
        Busca la siguiente fecha disponible donde haya al menos 'empleados_necesarios' empleados libres.
        Comienza desde fecha_inicial + 7 días (para dar tiempo al reabastecimiento).
        """
        from datetime import timedelta

        # Empezar a buscar desde 7 días después de la fecha inicial (tiempo mínimo para reabastecer)
        fecha_candidata = fecha_inicial + timedelta(days=7)
        dias_buscados = 0

        while dias_buscados < max_dias_busqueda:
            # Obtener reservas activas en esa fecha
            reservas_en_fecha = Reserva.objects.filter(
                fecha_cita__date=fecha_candidata.date(),
                estado__in=["confirmada", "en_curso"],
            ).values_list("id_reserva", flat=True)

            # Obtener empleados ocupados en esa fecha
            empleados_ocupados = ReservaEmpleado.objects.filter(
                reserva__in=reservas_en_fecha, rol="operador"
            ).values_list("empleado_id", flat=True)

            # Contar empleados disponibles
            empleados_disponibles = Empleado.objects.exclude(id_empleado__in=empleados_ocupados).count()

            # Si hay suficientes empleados disponibles, retornar esta fecha
            if empleados_disponibles >= empleados_necesarios:
                return fecha_candidata

            # Si no, probar el día siguiente
            fecha_candidata += timedelta(days=1)
            dias_buscados += 1

        # Si no encuentra fecha disponible en max_dias_busqueda, retornar fecha_inicial + 7 días por defecto
        return fecha_inicial + timedelta(days=7)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def aceptar_cliente(self, request, pk=None):
        """
        Aceptar el diseño desde el cliente.
        - Verifica stock de productos
        - Si no hay stock y el servicio es en la semana actual, propone reagendar +1 semana
        - Si acepta_reagendamiento=True, reagenda y acepta
        - Si hay stock o acepta reagendamiento, descuenta stock y acepta
        - Cambia estado del diseño a 'aceptado'
        - Cambia estado de la reserva a 'en_curso'
        - Asigna empleados automáticamente
        """
        from datetime import datetime, timedelta

        from apps.productos.models import Stock

        diseno = self.get_object()

        # Verificar que el diseño esté presentado
        if diseno.estado != "presentado":
            return Response(
                {"error": 'El diseño debe estar en estado "presentado" para ser aceptado'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Si acepta reagendamiento, actualizar las fechas primero
        acepta_reagendamiento = request.data.get("acepta_reagendamiento", False)

        if acepta_reagendamiento:
            nueva_fecha_str = request.data.get("nueva_fecha")
            if nueva_fecha_str:
                nueva_fecha = datetime.fromisoformat(nueva_fecha_str.replace("Z", "+00:00"))
                if diseno.fecha_propuesta:
                    diseno.fecha_propuesta = nueva_fecha
                if diseno.reserva:
                    diseno.reserva.fecha_cita = nueva_fecha
                    diseno.reserva.save()
                diseno.save()

        # Verificar stock antes de descontar
        productos_diseno = diseno.productos.all()
        stock_insuficiente = []

        for dp in productos_diseno:
            try:
                stock = Stock.objects.get(producto=dp.producto)
                if stock.cantidad < dp.cantidad:
                    stock_insuficiente.append(
                        {
                            "producto": dp.producto.nombre,
                            "id_producto": dp.producto.id_producto,
                            "disponible": stock.cantidad,
                            "requerido": dp.cantidad,
                            "faltante": dp.cantidad - stock.cantidad,
                        }
                    )
            except Stock.DoesNotExist:
                stock_insuficiente.append(
                    {
                        "producto": dp.producto.nombre,
                        "id_producto": dp.producto.id_producto,
                        "disponible": 0,
                        "requerido": dp.cantidad,
                        "faltante": dp.cantidad,
                    }
                )

        # Si hay stock insuficiente Y NO acepta reagendamiento
        if stock_insuficiente and not acepta_reagendamiento:
            # Primera vez que se detecta falta de stock
            fecha_servicio = diseno.fecha_propuesta or diseno.reserva.fecha_cita
            hoy = timezone.now()
            una_semana = hoy + timedelta(days=7)

            servicio_en_semana_actual = fecha_servicio <= una_semana

            if servicio_en_semana_actual:
                # Buscar la siguiente fecha disponible con empleados libres
                nueva_fecha = self._buscar_fecha_con_empleados_disponibles(fecha_servicio)
                dias_diferencia = (nueva_fecha.date() - fecha_servicio.date()).days

                return Response(
                    {
                        "requiere_reagendamiento": True,
                        "mensaje": (
                            "Stock insuficiente. El servicio debe reagendarse para dar tiempo al reabastecimiento. "
                            f"La próxima fecha disponible con empleados libres es en {dias_diferencia} días."
                        ),
                        "productos_faltantes": stock_insuficiente,
                        "fecha_actual": fecha_servicio.isoformat(),
                        "fecha_propuesta": nueva_fecha.isoformat(),
                        "tiempo_espera_dias": dias_diferencia,
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            # Si el servicio NO está en la semana actual, continuar normalmente
            # (hay tiempo para reabastecer, el stock quedará negativo)

        # Si llegamos aquí, hay stock suficiente o se aceptó reagendamiento
        # Descontar stock (puede quedar negativo si se aceptó reagendamiento con stock insuficiente)
        for dp in productos_diseno:
            stock = Stock.objects.get(producto=dp.producto)
            stock.cantidad -= dp.cantidad
            stock.save()

        # Guardar feedback del cliente
        feedback = request.data.get("feedback", "")
        observaciones = request.data.get("observaciones", "")

        if feedback:
            diseno.observaciones_cliente = feedback
        elif observaciones:
            diseno.observaciones_cliente = observaciones

        # Aceptar el diseño
        diseno.aceptar(feedback or observaciones)

        # Cambiar estado de la reserva a 'en_curso' y asignar empleados automáticamente
        if diseno.reserva:
            from apps.servicios.models import ReservaEmpleado

            # Actualizar fecha_cita con fecha_propuesta si existe
            if diseno.fecha_propuesta:
                diseno.reserva.fecha_cita = diseno.fecha_propuesta

            diseno.reserva.estado = "en_curso"
            diseno.reserva.save()

            # Asignar empleados disponibles automáticamente
            fecha_reserva = diseno.reserva.fecha_cita.date()

            # Obtener reservas activas en esa fecha
            reservas_en_fecha = (
                Reserva.objects.filter(
                    fecha_cita__date=fecha_reserva,
                    estado__in=["confirmada", "en_curso"],
                )
                .exclude(id_reserva=diseno.reserva.id_reserva)
                .values_list("id_reserva", flat=True)
            )

            # Obtener empleados ya ocupados en esa fecha
            empleados_ocupados = ReservaEmpleado.objects.filter(
                reserva__in=reservas_en_fecha, rol="operador"
            ).values_list("empleado_id", flat=True)

            # Obtener empleados disponibles priorizados por puntuación
            empleados_disponibles = Empleado.objects.exclude(id_empleado__in=empleados_ocupados).select_related(
                "persona"
            )
            empleados_prioritarios = ordenar_empleados_por_puntuacion(empleados_disponibles)

            # Asignar hasta 2 empleados como operadores
            empleados_asignados = []
            for prioridad, empleado in enumerate(empleados_prioritarios[:2], start=1):
                asignacion, created = ReservaEmpleado.objects.get_or_create(
                    reserva=diseno.reserva,
                    empleado=empleado,
                    defaults={
                        "rol": "operador",
                        "notas": "Asignado automáticamente al aceptar el diseño",
                    },
                )
                if created:
                    empleados_asignados.append(
                        {
                            "nombre": f"{empleado.persona.nombre} {empleado.persona.apellido}",
                            "email": empleado.persona.email,
                            "prioridad": prioridad,
                            "puntuacion_promedio": (
                                float(empleado.puntuacion_promedio)
                                if empleado.puntuacion_promedio is not None
                                else None
                            ),
                            "puntuacion_cantidad": empleado.puntuacion_cantidad,
                        }
                    )

            mensaje = "Diseño aceptado exitosamente. Stock descontado."
            if empleados_asignados:
                mensaje += f" Se asignaron {len(empleados_asignados)} empleado(s) automáticamente."
        else:
            mensaje = "Diseño aceptado exitosamente. Stock descontado."
            empleados_asignados = []

        # Informar sobre el pago final
        if diseno.reserva:
            pago = diseno.reserva.obtener_pago()
            mensaje += f" Procede al pago final de ${pago.monto_final} para confirmar la reserva."

        serializer = self.get_serializer(diseno)
        response_data = {
            "message": mensaje,
            "diseno": serializer.data,
            "empleados_asignados": empleados_asignados,
            "pago_info": {
                "monto_final": (str(diseno.reserva.obtener_pago().monto_final) if diseno.reserva else "0"),
                "monto_sena": (str(diseno.reserva.obtener_pago().monto_sena) if diseno.reserva else "0"),
                "estado_pago_sena": (
                    diseno.reserva.obtener_pago().estado_pago_sena if diseno.reserva else "pendiente"
                ),
            },
        }

        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def rechazar_cliente(self, request, pk=None):
        """
        Rechazar el diseño desde el cliente.
        - Cambia estado del diseño a 'rechazado'
        - Cambia estado de la reserva a 'pendiente' o 'cancelada' según lo indique el cliente
        - Guarda feedback del cliente
        - Envía email al diseñador con el feedback
        """
        from apps.emails.services import EmailService

        diseno = self.get_object()

        # Verificar que el diseño esté presentado
        if diseno.estado != "presentado":
            return Response(
                {"error": 'El diseño debe estar en estado "presentado" para ser rechazado'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Obtener feedback del cliente
        feedback = request.data.get("feedback", "")
        cancelar_servicio = request.data.get("cancelar_servicio", False)

        # Si por alguna razón 'feedback' viene como objeto (ej. {'feedback': 'texto', 'cancelar_servicio': False}),
        # extraer el texto y/o el flag de cancelación.
        try:
            import json

            if isinstance(feedback, (dict, list)):
                # Si el feedback contiene la clave 'feedback', usar su valor; si no, convertir el dict a string
                if isinstance(feedback, dict) and "feedback" in feedback:
                    feedback_text = feedback.get("feedback", "")
                    feedback = feedback_text
                else:
                    feedback = json.dumps(feedback, ensure_ascii=False)

            # Si no se recibió cancelar_servicio en el payload, intentar obtenerlo del nested feedback si existe
            if not cancelar_servicio and isinstance(request.data.get("feedback", None), dict):
                cancelar_servicio = request.data.get("feedback", {}).get("cancelar_servicio", False)
        except Exception:
            # No fallar si algo raro viene en el payload; dejar values por defecto
            pass

        # Guardar feedback en observaciones_cliente
        if feedback:
            diseno.observaciones_cliente = feedback

        # Rechazar el diseño SIN pasar el feedback (ya se guardó arriba)
        diseno.rechazar()

        # Cambiar estado de la reserva según lo que decida el cliente
        if diseno.reserva:
            if cancelar_servicio:
                diseno.reserva.estado = "cancelada"
                mensaje = "Diseño rechazado y servicio cancelado."
            else:
                diseno.reserva.estado = "pendiente"
                mensaje = "Diseño rechazado. La reserva volvió a estado pendiente para un nuevo diseño."
            diseno.reserva.save()
        else:
            mensaje = "Diseño rechazado exitosamente."

        # Enviar email al diseñador notificando el rechazo
        try:
            if diseno.disenador:
                cliente_nombre = "Cliente"
                if diseno.reserva and diseno.reserva.cliente:
                    cliente = diseno.reserva.cliente
                    cliente_nombre = f"{cliente.persona.nombre} {cliente.persona.apellido}"

                EmailService.send_design_rejection_notification(
                    disenador_email=diseno.disenador.persona.email,
                    disenador_nombre=f"{diseno.disenador.persona.nombre} {diseno.disenador.persona.apellido}",
                    diseno_id=diseno.id_diseno,
                    titulo_diseno=diseno.titulo,
                    cliente_nombre=cliente_nombre,
                    servicio_nombre=diseno.servicio.nombre,
                    reserva_id=diseno.reserva.id_reserva if diseno.reserva else 0,
                    feedback_cliente=feedback,
                    presupuesto=diseno.presupuesto,
                    cancelar_servicio=cancelar_servicio,
                )
                logger.info(f"✅ Email de rechazo de diseño enviado a {diseno.disenador.persona.email}")
            else:
                logger.warning(f"⚠️ No se pudo enviar email: diseño {diseno.id_diseno} no tiene diseñador asignado")
        except Exception as e:
            # No fallar el endpoint si falla el email
            logger.error(f"❌ Error al enviar email de rechazo de diseño: {str(e)}")
            import traceback

            logger.error(traceback.format_exc())

        serializer = self.get_serializer(diseno)
        return Response({"message": mensaje, "diseno": serializer.data}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def rechazar(self, request, pk=None):
        """Rechazar el diseño (acción del empleado/admin)"""
        diseno = self.get_object()
        observaciones = request.data.get("observaciones")
        diseno.rechazar(observaciones)
        serializer = self.get_serializer(diseno)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def solicitar_revision(self, request, pk=None):
        """Solicitar revisión del diseño (acción del cliente)"""
        diseno = self.get_object()
        observaciones = request.data.get("observaciones")
        if not observaciones:
            return Response(
                {"error": "Las observaciones son requeridas para solicitar una revisión"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        diseno.solicitar_revision(observaciones)
        serializer = self.get_serializer(diseno)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def por_servicio(self, request, servicio_id=None):
        """Obtener todos los diseños de un servicio específico"""
        disenos = self.queryset.filter(servicio_id=servicio_id)
        serializer = self.get_serializer(disenos, many=True)
        return Response(serializer.data)
