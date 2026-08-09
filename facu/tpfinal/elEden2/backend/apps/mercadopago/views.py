"""
Vistas para la integración con MercadoPago.
Maneja la creación de preferencias de pago y la confirmación de pagos.
"""

import logging
import uuid

import mercadopago
from django.conf import settings
from django.forms.models import model_to_dict
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.emails.services import EmailService
from apps.audit.services import AuditService, sanitize_payload
from apps.servicios.models import ConfiguracionPago, ImagenReserva, Pago, Reserva, Servicio
from apps.servicios.serializers import ReservaSerializer
from apps.users.models import Cliente, Persona

logger = logging.getLogger(__name__)


# ==================== VISTAS DE PAGO PARA RESERVAS EXISTENTES ====================


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_preferencia_pago_sena(request, reserva_id):
    """
    Crear preferencia de pago de MercadoPago para la SEÑA de una reserva
    POST /api/v1/mercadopago/reservas/{reserva_id}/crear-pago-sena/

    Este es el PRIMER PAGO que se realiza al crear la solicitud de servicio.
    El monto de la seña se configura en el admin.
    """
    try:
        # Obtener la reserva
        reserva = Reserva.objects.select_related("cliente__persona", "servicio").get(id_reserva=reserva_id)
        pago = reserva.obtener_pago()

        # Verificar que el usuario sea el dueño de la reserva
        try:
            cliente = Cliente.objects.get(persona__email=request.user.email)
            if reserva.cliente != cliente:
                return Response(
                    {"error": "No tienes permiso para pagar esta reserva"},
                    status=status.HTTP_403_FORBIDDEN,
                )
        except Cliente.DoesNotExist:
            return Response(
                {"error": "Usuario no registrado como cliente"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verificar que la seña no esté ya pagada
        if pago.estado_pago_sena == "sena_pagada":
            return Response(
                {"error": "La seña de esta reserva ya ha sido pagada"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Asignar monto de seña si no está asignado
        if pago.monto_sena <= 0:
            reserva.asignar_sena()
            pago = reserva.obtener_pago()

        # Crear preferencia de pago de seña usando SDK de MercadoPago
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
                    "failure": f"{settings.FRONTEND_URL}/mis-reservas?error=pago_rechazado",
                    "pending": f"{settings.FRONTEND_URL}/mis-reservas?info=pago_pendiente",
                },
                "auto_return": "approved",
                "external_reference": f"SENA-{reserva.id_reserva}",
                "statement_descriptor": "El Eden",
                "payment_methods": {"excluded_payment_types": [], "installments": 12},
            }

            preference_response = sdk.preference().create(preference_data)
            if "response" in preference_response:
                preference = preference_response["response"]
            else:
                preference = preference_response

            preferencia = {
                "preference_id": preference.get("id"),
                "init_point": preference.get("init_point"),
                "sandbox_init_point": preference.get("sandbox_init_point"),
            }

            logger.info(f"Preferencia de SEÑA creada para reserva {reserva_id}: {preferencia['preference_id']}")

            return Response(
                {
                    "preference_id": preferencia["preference_id"],
                    "init_point": preferencia["init_point"],
                    "sandbox_init_point": preferencia.get("sandbox_init_point"),
                    "reserva_id": reserva.id_reserva,
                    "monto_sena": float(pago.monto_sena),
                    "tipo_pago": "sena",
                }
            )
        except Exception as e:
            logger.error(f"Error al crear preferencia de seña: {str(e)}")
            return Response(
                {"error": "No se pudo crear la preferencia de pago", "detalle": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    except Reserva.DoesNotExist:
        return Response({"error": "Reserva no encontrada"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error al crear preferencia de pago de seña: {str(e)}")
        return Response(
            {"error": "Error al crear preferencia de pago", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_preferencia_pago_final(request, reserva_id):
    """
    Crear preferencia de pago de MercadoPago para el PAGO FINAL de una reserva
    POST /api/v1/mercadopago/reservas/{reserva_id}/crear-pago-final/

    Este es el SEGUNDO PAGO que se realiza cuando el cliente acepta la propuesta de diseño.
    El monto es: total - seña ya pagada.
    """
    try:
        # Obtener la reserva
        reserva = Reserva.objects.select_related("cliente__persona", "servicio").get(id_reserva=reserva_id)
        pago = reserva.obtener_pago()

        # Verificar que el pago final no esté ya pagado
        if pago.estado_pago_final == "pagado":
            return Response(
                {"error": "El pago final de esta reserva ya ha sido realizado"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verificar que tenga un diseño aceptado
        try:
            diseno = reserva.disenos.filter(estado="aceptado").first()
            if not diseno:
                return Response(
                    {"error": "Primero debe aceptar una propuesta de diseño"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception:
            return Response(
                {"error": "No hay un diseño aceptado para esta reserva"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verificar que tenga un monto final
        if pago.monto_final <= 0:
            # La seña pagada ya cubre (o supera) el monto total del diseño:
            # el pago final queda cubierto automáticamente sin pasar por MercadoPago.
            pago.estado_pago_final = "pagado"
            pago.estado_pago = "pagado"
            pago.payment_id_final = f"AUTO-CUBIERTO-SENA-{reserva.id_reserva}"
            pago.fecha_pago_final = timezone.now()
            pago.save(
                update_fields=[
                    "estado_pago_final",
                    "estado_pago",
                    "payment_id_final",
                    "fecha_pago_final",
                ]
            )

            logger.info(
                f"✅ Pago final auto-cubierto por seña para reserva {reserva_id} "
                f"(total={pago.monto_total}, seña={pago.monto_sena})"
            )

            return Response(
                {
                    "cubierto_por_sena": True,
                    "reserva_id": reserva.id_reserva,
                    "monto_total": float(pago.monto_total),
                    "monto_sena_pagada": float(pago.monto_sena),
                    "monto_final": float(pago.monto_final),
                    "tipo_pago": "final",
                    "mensaje": (
                        "El monto de la seña ya cubre el total del servicio, "
                        "por lo que el pago final se consideró pagado automáticamente."
                    ),
                },
                status=status.HTTP_200_OK,
            )

        # Crear preferencia de pago final usando SDK de MercadoPago
        try:
            sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)

            preference_data = {
                "items": [
                    {
                        "id": f"FINAL-{reserva.id_reserva}",
                        "title": f"Pago Final - Reserva #{reserva.id_reserva} - {reserva.servicio.nombre}",
                        "description": f"Pago final para reserva de {reserva.servicio.nombre}",
                        "quantity": 1,
                        "unit_price": float(pago.monto_final),
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
                        f"?tipo=final&reserva_id={reserva.id_reserva}"
                    ),
                    "failure": f"{settings.FRONTEND_URL}/mis-reservas?error=pago_rechazado",
                    "pending": f"{settings.FRONTEND_URL}/mis-reservas?info=pago_pendiente",
                },
                "auto_return": "approved",
                "external_reference": f"FINAL-{reserva.id_reserva}",
                "statement_descriptor": "El Eden",
                "payment_methods": {"excluded_payment_types": [], "installments": 12},
            }

            preference_response = sdk.preference().create(preference_data)
            if "response" in preference_response:
                preference = preference_response["response"]
            else:
                preference = preference_response

            preferencia = {
                "preference_id": preference.get("id"),
                "init_point": preference.get("init_point"),
                "sandbox_init_point": preference.get("sandbox_init_point"),
            }

            logger.info(f"Preferencia de PAGO FINAL creada para reserva {reserva_id}: {preferencia['preference_id']}")

            return Response(
                {
                    "preference_id": preferencia["preference_id"],
                    "init_point": preferencia["init_point"],
                    "sandbox_init_point": preferencia.get("sandbox_init_point"),
                    "reserva_id": reserva.id_reserva,
                    "monto_total": float(pago.monto_total),
                    "monto_sena_pagada": float(pago.monto_sena),
                    "monto_final": float(pago.monto_final),
                    "tipo_pago": "final",
                }
            )
        except Exception as e:
            logger.error(f"Error al crear preferencia de pago final: {str(e)}")
            return Response(
                {"error": "No se pudo crear la preferencia de pago", "detalle": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    except Reserva.DoesNotExist:
        return Response({"error": "Reserva no encontrada"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error al crear preferencia de pago final: {str(e)}")
        return Response(
            {"error": "Error al crear preferencia de pago", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def verificar_pago(request, reserva_id):
    """
    Verificar el estado de pago de una reserva
    GET /api/v1/mercadopago/reservas/{reserva_id}/verificar-pago/
    """
    try:
        reserva = Reserva.objects.get(id_reserva=reserva_id)
        pago, created = Pago.objects.get_or_create(reserva=reserva)
        if created:
            AuditService.register(
                user=request.user,
                role="administrador" if (request.user.is_staff or request.user.is_superuser) else "empleado",
                method="GET",
                action="Creacion automatica de pago",
                entity="pago_reserva",
                response_body={"reserva_id": reserva.id_reserva, "pago_id": pago.id_pago},
                before_state=None,
                after_state=sanitize_payload(model_to_dict(pago)),
            )

        # Verificar que el usuario sea el dueño de la reserva
        try:
            cliente = Cliente.objects.get(persona__email=request.user.email)
            if reserva.cliente != cliente and not request.user.is_staff:
                return Response(
                    {"error": "No tienes permiso para ver esta reserva"},
                    status=status.HTTP_403_FORBIDDEN,
                )
        except Cliente.DoesNotExist:
            if not request.user.is_staff:
                return Response(
                    {"error": "No tienes permiso para ver esta reserva"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        return Response(
            {
                "reserva_id": reserva.id_reserva,
                "estado_pago_sena": pago.estado_pago_sena,
                "estado_pago_final": pago.estado_pago_final,
                "estado_reserva": reserva.estado,
                "monto_sena": float(pago.monto_sena),
                "monto_total": float(pago.monto_total),
                "monto_final": float(pago.monto_final),
                "fecha_pago_sena": pago.fecha_pago_sena,
                "fecha_pago_final": pago.fecha_pago_final,
                "payment_id_sena": pago.payment_id_sena,
                "payment_id_final": pago.payment_id_final,
            }
        )

    except Reserva.DoesNotExist:
        return Response({"error": "Reserva no encontrada"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def confirmar_pago_sena(request, reserva_id):
    """
    Confirmar el pago de seña de una reserva
    POST /api/v1/mercadopago/reservas/{reserva_id}/confirmar-pago-sena/

    Body: { "payment_id": "123456789" }
    """
    try:
        reserva = Reserva.objects.get(id_reserva=reserva_id)
        payment_id = request.data.get("payment_id")

        if not payment_id:
            return Response(
                {"error": "Se requiere el payment_id"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info(f"🔍 Confirmando pago de seña para reserva {reserva_id} con payment_id: {payment_id}")

        # Verificar el pago con MercadoPago (con reintentos por delay de sandbox)
        sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)
        payment_data = None
        max_retries = 6  # Reintentos para sandbox que tiene delays
        retry_delay = 3  # segundos entre reintentos

        for attempt in range(max_retries):
            try:
                if attempt > 0:
                    logger.info(f"⏳ Reintento {attempt + 1}/{max_retries} después de {retry_delay}s...")
                    import time

                    time.sleep(retry_delay)

                payment_info = sdk.payment().get(payment_id)
                payment_data = payment_info["response"] if "response" in payment_info else payment_info

                # Verificar si el pago existe (no es 404)
                if isinstance(payment_data, dict) and payment_data.get("status") != 404:
                    logger.info(
                        "📄 Información del pago encontrada: "
                        f"ID={payment_data.get('id')}, Status={payment_data.get('status')}"
                    )
                    break  # Pago encontrado, salir del loop
                else:
                    logger.warning(f"⚠️ Intento {attempt + 1}: Pago aún no disponible en API (404)")
                    if attempt == max_retries - 1:
                        return Response(
                            {
                                "error": (
                                    "El pago aún está siendo procesado. Por favor, espera unos segundos "
                                    "y recarga la página."
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"❌ Error al validar pago después de {max_retries} intentos: {str(e)}")
                    return Response(
                        {"error": "No se pudo validar el pago con MercadoPago. Por favor, contacta con soporte."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

        # Verificar que el pago esté aprobado
        if payment_data.get("status") == "approved":
            pago = reserva.obtener_pago()

            # Actualizar el pago de seña
            pago.estado_pago_sena = "sena_pagada"
            pago.payment_id_sena = payment_id
            pago.fecha_pago_sena = timezone.now()

            # Mantener estado general consistente
            # - Si ya está pagado el final, queda 'pagado'
            # - Si solo está la seña, queda 'sena_pagada'
            if pago.estado_pago_final == "pagado":
                pago.estado_pago = "pagado"
            else:
                pago.estado_pago = "sena_pagada"

            reserva.save()
            pago.save()

            logger.info(f"✅ Pago de seña confirmado para reserva {reserva_id}")

            # Enviar email de confirmación al cliente
            try:
                cliente = reserva.cliente
                EmailService.send_payment_confirmation_email(
                    user_email=cliente.persona.email,
                    user_name=f"{cliente.persona.nombre} {cliente.persona.apellido}",
                    reserva_id=reserva.id_reserva,
                    servicio_nombre=reserva.servicio.nombre,
                    monto=pago.monto_sena,
                    payment_id=payment_id,
                    tipo_pago="seña",
                )
                logger.info(f"✅ Email de confirmación enviado a {cliente.persona.email}")
            except Exception as e:
                logger.error(f"Error al enviar email de confirmación al cliente: {str(e)}")

            # Enviar notificación a los administradores
            try:
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
                logger.info("✅ Notificación a administradores enviada")
            except Exception as e:
                logger.error(f"Error al enviar notificación a administradores: {str(e)}")

            return Response(
                {
                    "success": True,
                    "message": "Pago de seña confirmado exitosamente",
                    "reserva_id": reserva.id_reserva,
                    "estado_pago": pago.estado_pago_sena,
                    "estado_reserva": reserva.estado,
                }
            )
        else:
            return Response(
                {"error": f'El pago no está aprobado. Estado: {payment_data.get("status")}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    except Reserva.DoesNotExist:
        return Response({"error": "Reserva no encontrada"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error al confirmar pago de seña: {str(e)}")
        return Response(
            {"error": "Error al confirmar el pago", "detalle": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def confirmar_pago_final(request, reserva_id):
    """
    Confirmar el pago final de una reserva
    POST /api/v1/mercadopago/reservas/{reserva_id}/confirmar-pago-final/

    Body: { "payment_id": "123456789" }
    """
    try:
        reserva = Reserva.objects.get(id_reserva=reserva_id)
        payment_id = request.data.get("payment_id")

        if not payment_id:
            return Response(
                {"error": "Se requiere el payment_id"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info(f"🔍 Confirmando pago final para reserva {reserva_id} con payment_id: {payment_id}")

        # Idempotencia: si ya está pagado, no volver a consultar/actualizar
        pago_existente = reserva.obtener_pago()
        if pago_existente.estado_pago_final == "pagado":
            return Response(
                {
                    "success": True,
                    "message": "El pago final ya fue confirmado",
                    "reserva_id": reserva.id_reserva,
                    "estado_pago": pago_existente.estado_pago_final,
                    "estado_reserva": reserva.estado,
                    "payment_id": pago_existente.payment_id_final,
                }
            )

        # Verificar el pago con MercadoPago
        try:
            sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)
            payment_data = None
            max_retries = 6
            retry_delay = 3

            for attempt in range(max_retries):
                if attempt > 0:
                    logger.info(f"⏳ Reintento {attempt + 1}/{max_retries} después de {retry_delay}s...")
                    import time

                    time.sleep(retry_delay)

                payment_info = sdk.payment().get(payment_id)
                payment_data = payment_info["response"] if "response" in payment_info else payment_info

                # Si no es 404, lo tomamos como disponible
                if isinstance(payment_data, dict) and payment_data.get("status") != 404:
                    break

                if attempt == max_retries - 1:
                    return Response(
                        {
                            "error": (
                                "El pago aún está siendo procesado. Por favor, espera unos segundos "
                                "y recarga la página."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            logger.info(f"📄 Información del pago: {payment_data}")

            # Verificar que el pago esté aprobado
            if payment_data.get("status") == "approved":
                pago = reserva.obtener_pago()

                # Actualizar el pago final
                pago.estado_pago_final = "pagado"
                pago.payment_id_final = payment_id
                pago.fecha_pago_final = timezone.now()

                # Estado general
                pago.estado_pago = "pagado"

                # Si existe una propuesta aceptada con fecha, tomarla como fecha de cita confirmada
                try:
                    diseno_aceptado = reserva.disenos.filter(estado="aceptado").order_by("-id_diseno").first()
                    if diseno_aceptado and diseno_aceptado.fecha_propuesta:
                        if not getattr(reserva, "fecha_realizacion", None):
                            reserva.fecha_realizacion = diseno_aceptado.fecha_propuesta
                except Exception:
                    pass

                # Actualizar el estado de la reserva
                if reserva.estado not in ("confirmada", "en_curso", "completada", "cancelada"):
                    # Normalización suave: si hubiese estados legacy en DB
                    reserva.estado = "confirmada"

                reserva.save()
                pago.save()

                logger.info(f"✅ Pago final confirmado para reserva {reserva_id}")

                # Evaluación climática automática al pagar: si hay riesgo de lluvia el día de
                # realización, se genera la alerta con reprogramación sugerida (misma
                # automatización que activa la simulación de lluvia).
                try:
                    from apps.weather.services import ServicioAlertasClimaticas

                    evaluador = ServicioAlertasClimaticas()
                    resultado_clima = evaluador.evaluate_reserva(reserva, auto_create_alert=True)
                    if resultado_clima.get("rain_expected"):
                        logger.info(
                            f"🌧️ Riesgo de lluvia detectado en pago de reserva {reserva_id}: "
                            f"{resultado_clima.get('precipitation_mm')} mm, "
                            f"alerta #{resultado_clima.get('alert_id')}"
                        )
                except Exception as e:
                    logger.error(f"❌ Error al evaluar clima tras pago final de reserva {reserva_id}: {str(e)}")
                    import traceback

                    logger.error(traceback.format_exc())

                # Enviar emails de confirmación
                try:
                    cliente = reserva.cliente

                    # 1. Email al cliente confirmando el pago
                    EmailService.send_payment_confirmation_email(
                        user_email=cliente.persona.email,
                        user_name=f"{cliente.persona.nombre} {cliente.persona.apellido}",
                        reserva_id=reserva.id_reserva,
                        servicio_nombre=reserva.servicio.nombre,
                        monto=pago.monto_final,
                        payment_id=payment_id,
                        tipo_pago="final",
                    )
                    logger.info(f"✅ Email de confirmación de pago final enviado a {cliente.persona.email}")

                    # 2. Emails a los empleados asignados
                    from apps.servicios.models import ReservaEmpleado

                    empleados_asignados = ReservaEmpleado.objects.filter(reserva=reserva).select_related(
                        "empleado__persona"
                    )

                    for asignacion in empleados_asignados:
                        empleado = asignacion.empleado
                        hora_servicio = (
                            reserva.fecha_cita.strftime("%H:%M") if reserva.fecha_cita else "A confirmar"
                        )

                        EmailService.send_employee_work_assignment_notification(
                            empleado_email=empleado.persona.email,
                            empleado_nombre=f"{empleado.persona.nombre} {empleado.persona.apellido}",
                            reserva_id=reserva.id_reserva,
                            cliente_nombre=f"{cliente.persona.nombre} {cliente.persona.apellido}",
                            servicio_nombre=reserva.servicio.nombre,
                            fecha_servicio=reserva.fecha_cita,
                            hora_servicio=hora_servicio,
                            direccion=reserva.direccion or "No especificada",
                            observaciones=reserva.observaciones,
                            rol=asignacion.rol,
                        )
                        logger.info(f"✅ Email de asignación de trabajo enviado a {empleado.persona.email}")

                    if empleados_asignados.count() > 0:
                        logger.info(f"✅ Se enviaron {empleados_asignados.count()} email(s) a empleados asignados")
                    else:
                        logger.warning(f"⚠️ No hay empleados asignados a la reserva {reserva_id}")

                except Exception as e:
                    logger.error(f"❌ Error al enviar emails de confirmación: {str(e)}")
                    import traceback

                    logger.error(traceback.format_exc())

                return Response(
                    {
                        "success": True,
                        "message": "Pago final confirmado exitosamente",
                        "reserva_id": reserva.id_reserva,
                        "estado_pago": pago.estado_pago_final,
                        "estado_reserva": reserva.estado,
                    }
                )
            else:
                return Response(
                    {"error": f'El pago no está aprobado. Estado: {payment_data.get("status")}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except Exception as e:
            logger.error(f"Error al verificar el pago con MercadoPago: {str(e)}")
            return Response(
                {
                    "error": "No se pudo verificar el pago con MercadoPago",
                    "detalle": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    except Reserva.DoesNotExist:
        return Response({"error": "Reserva no encontrada"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error al confirmar pago final: {str(e)}")
        return Response(
            {"error": "Error al confirmar el pago", "detalle": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def buscar_pago_por_preferencia(request, reserva_id):
    """
    Buscar y confirmar un pago usando el preference_id
    POST /api/v1/mercadopago/reservas/{reserva_id}/buscar-pago-por-preferencia/

    Body: { "preference_id": "xxx", "tipo_pago": "sena" }
    """
    try:
        reserva = Reserva.objects.get(id_reserva=reserva_id)
        preference_id = request.data.get("preference_id")
        tipo_pago = request.data.get("tipo_pago", "sena")

        if preference_id:
            filters = {"preference_id": preference_id}
            logger.info(f"🔍 Buscando pago para preferencia: {preference_id}")
        else:
            external_reference = (
                f"SENA-{reserva.id_reserva}" if tipo_pago == "sena" else f"FINAL-{reserva.id_reserva}"
            )
            filters = {"external_reference": external_reference}
            logger.info(f"🔍 Buscando pago por external_reference: {external_reference}")

        # Buscar pagos asociados a esta preferencia
        try:
            sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)

            search_result = sdk.payment().search(filters=filters)

            if "response" in search_result:
                payments = search_result["response"].get("results", [])
            else:
                payments = search_result.get("results", [])

            logger.info(f"📄 Pagos encontrados: {len(payments)}")

            # Buscar el pago aprobado más reciente
            approved_payment = None
            for payment in payments:
                if payment.get("status") == "approved":
                    approved_payment = payment
                    break

            if approved_payment:
                payment_id = str(approved_payment.get("id"))
                logger.info(f"✅ Pago aprobado encontrado: {payment_id}")

                # Confirmar el pago
                pago = reserva.obtener_pago()
                if tipo_pago == "sena":
                    pago.estado_pago_sena = "sena_pagada"
                    pago.payment_id_sena = payment_id
                    pago.fecha_pago_sena = timezone.now()

                    if pago.estado_pago_final == "pagado":
                        pago.estado_pago = "pagado"
                    else:
                        pago.estado_pago = "sena_pagada"
                else:
                    pago.estado_pago_final = "pagado"
                    pago.payment_id_final = payment_id
                    pago.fecha_pago_final = timezone.now()

                    pago.estado_pago = "pagado"

                    # Si existe una propuesta aceptada con fecha, tomarla como fecha de cita confirmada
                    try:
                        diseno_aceptado = reserva.disenos.filter(estado="aceptado").order_by("-id_diseno").first()
                        if diseno_aceptado and diseno_aceptado.fecha_propuesta:
                            if not getattr(reserva, "fecha_realizacion", None):
                                reserva.fecha_realizacion = diseno_aceptado.fecha_propuesta
                    except Exception:
                        pass

                reserva.save()
                pago.save()

                # Enviar emails de confirmación
                try:
                    cliente = reserva.cliente

                    if tipo_pago == "sena":
                        # Email al cliente
                        EmailService.send_payment_confirmation_email(
                            user_email=cliente.persona.email,
                            user_name=f"{cliente.persona.nombre} {cliente.persona.apellido}",
                            reserva_id=reserva.id_reserva,
                            servicio_nombre=reserva.servicio.nombre,
                            monto=pago.monto_sena,
                            payment_id=payment_id,
                            tipo_pago="seña",
                        )
                        # Email a administradores
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
                    else:
                        # Email al cliente para pago final
                        EmailService.send_payment_confirmation_email(
                            user_email=cliente.persona.email,
                            user_name=f"{cliente.persona.nombre} {cliente.persona.apellido}",
                            reserva_id=reserva.id_reserva,
                            servicio_nombre=reserva.servicio.nombre,
                            monto=pago.monto_final,
                            payment_id=payment_id,
                            tipo_pago="final",
                        )
                        # Email a administradores para pago final
                        EmailService.send_payment_notification_to_admin(
                            reserva_id=reserva.id_reserva,
                            cliente_nombre=f"{cliente.persona.nombre} {cliente.persona.apellido}",
                            servicio_nombre=reserva.servicio.nombre,
                            monto=pago.monto_final,
                            payment_id=payment_id,
                            fecha_reserva=reserva.fecha_cita,
                            direccion=reserva.direccion,
                            observaciones=reserva.observaciones,
                            tipo_pago="final",
                        )

                    logger.info("✅ Emails enviados exitosamente")
                except Exception as e:
                    logger.error(f"Error al enviar emails: {str(e)}")

                return Response(
                    {
                        "success": True,
                        "payment_id": payment_id,
                        "message": f"Pago de {tipo_pago} confirmado exitosamente",
                    }
                )
            else:
                return Response(
                    {"error": "No se encontró un pago aprobado para esta preferencia"},
                    status=status.HTTP_404_NOT_FOUND,
                )

        except Exception as e:
            logger.error(f"Error al buscar pagos en MercadoPago: {str(e)}")
            return Response(
                {
                    "error": "No se pudo buscar el pago en MercadoPago",
                    "detalle": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    except Reserva.DoesNotExist:
        return Response({"error": "Reserva no encontrada"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error al buscar pago: {str(e)}")
        return Response(
            {"error": "Error al buscar el pago", "detalle": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ==================== NUEVO FLUJO: PAGO PRIMERO, RESERVA DESPUÉS ====================


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_preferencia_prereserva(request):
    """
    Crea UNA RESERVA con estado 'pendiente_pago_sena' y luego genera la preferencia de pago.
    Cuando el pago sea exitoso, solo se actualizará el estado de la reserva.

    POST /api/v1/mercadopago/crear-preferencia-prereserva/

    Este endpoint:
    1. Crea la reserva con estado 'pendiente_pago_sena'
    2. Genera la preferencia de pago de MercadoPago
    3. Retorna el init_point para redirigir al usuario
    """
    try:
        # Validar que el usuario sea un cliente
        try:
            persona = Persona.objects.get(email=request.user.email)
            cliente = Cliente.objects.get(persona=persona)
        except (Persona.DoesNotExist, Cliente.DoesNotExist):
            return Response(
                {"error": "Solo los clientes pueden solicitar servicios"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Obtener datos del request
        servicio_id = request.data.get("servicio")
        descripcion = request.data.get("descripcion", "")
        fecha_preferida = request.data.get("fecha_preferida")
        direccion_servicio = request.data.get("direccion_servicio", "")
        notas_adicionales = request.data.get("notas_adicionales", "")

        # Validar servicio
        try:
            servicio = Servicio.objects.get(id_servicio=servicio_id, activo=True)
        except Servicio.DoesNotExist:
            return Response(
                {"error": "El servicio seleccionado no existe o no está disponible"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Obtener monto de seña configurado
        config = ConfiguracionPago.obtener_configuracion()
        monto_sena = config.monto_sena

        logger.info("🔵 PASO 1: Creando reserva con estado 'pendiente_pago_sena'")
        logger.info(f"👤 Cliente: {cliente.persona.email}")
        logger.info(f"🌿 Servicio: {servicio.nombre}")
        logger.info(f"💰 Monto seña: ${monto_sena}")

        # PASO 1: Crear la reserva con estado pendiente de pago
        reserva = Reserva.objects.create(
            cliente=cliente,
            servicio=servicio,
            fecha_cita=fecha_preferida if fecha_preferida else timezone.now(),
            observaciones=f"{descripcion}\n\nNotas: {notas_adicionales}",
            direccion=direccion_servicio,
            estado_pago_sena="pendiente_pago_sena",  # Estado especial
            monto_sena=monto_sena,
        )

        logger.info(f"✅ Reserva #{reserva.id_reserva} creada (pendiente de pago)")

        # Procesar imágenes si las hay
        imagenes_jardin = request.FILES.getlist("imagenes_jardin[]")
        imagenes_ideas = request.FILES.getlist("imagenes_ideas[]")

        for imagen in imagenes_jardin:
            ImagenReserva.objects.create(reserva=reserva, imagen=imagen, tipo_imagen="jardin")

        for imagen in imagenes_ideas:
            ImagenReserva.objects.create(reserva=reserva, imagen=imagen, tipo_imagen="ideas")

        logger.info(f"📸 {len(imagenes_jardin)} imágenes de jardín y {len(imagenes_ideas)} imágenes de ideas guardadas")

        # PASO 2: Crear preferencia de pago en MercadoPago
        sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)

        preference_data = {
            "items": [
                {
                    "id": f"RESERVA-{reserva.id_reserva}",
                    "title": f"Seña - Reserva #{reserva.id_reserva} - {servicio.nombre}",
                    "description": (descripcion[:100] if descripcion else f"Pago de seña para {servicio.nombre}"),
                    "quantity": 1,
                    "unit_price": float(monto_sena),
                    "currency_id": "ARS",
                    "category_id": "services",
                }
            ],
            "payer": {
                "name": cliente.persona.nombre,
                "surname": cliente.persona.apellido,
                "email": cliente.persona.email,
            },
            "back_urls": {
                "success": f"{settings.FRONTEND_URL}/reservas/confirmar-prereserva?reserva_id={reserva.id_reserva}",
                "failure": f"{settings.FRONTEND_URL}/servicios",
                "pending": f"{settings.FRONTEND_URL}/servicios",
            },
            "auto_return": "approved",
            "external_reference": f"RESERVA-{reserva.id_reserva}",
            "statement_descriptor": "El Eden",
            "payment_methods": {"excluded_payment_types": [], "installments": 12},
            "metadata": {
                "reserva_id": reserva.id_reserva,
                "cliente_id": cliente.id_cliente,
                "servicio_id": servicio.id_servicio,
            },
        }

        logger.info("🔵 PASO 2: Creando preferencia de pago MercadoPago")
        logger.info(f"📋 Preference data: {preference_data}")
        logger.info("📤 Enviando preferencia a MercadoPago...")

        try:
            preference_response = sdk.preference().create(preference_data)
            logger.info("✅ SDK llamado exitosamente (sin excepciones)")
        except Exception as sdk_error:
            logger.error(f"❌ Error al llamar SDK de MercadoPago: {str(sdk_error)}")
            logger.error(f"❌ Tipo de error: {type(sdk_error).__name__}")
            import traceback

            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return Response(
                {"error": f"Error de MercadoPago: {str(sdk_error)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Log de la respuesta completa para debugging
        logger.info(f"📥 Respuesta completa de MercadoPago: {preference_response}")
        logger.info(f"📥 Tipo de respuesta: {type(preference_response)}")

        # Verificar si la respuesta tiene 'status' de error
        if isinstance(preference_response, dict):
            if preference_response.get("status") in [400, 401, 403, 404, 500]:
                logger.error(f"❌ MercadoPago retornó status de error: {preference_response.get('status')}")
                if "message" in preference_response:
                    logger.error(f"❌ Mensaje: {preference_response.get('message')}")
                if "error" in preference_response:
                    logger.error(f"❌ Error: {preference_response.get('error')}")
                if "cause" in preference_response:
                    logger.error(f"❌ Causa: {preference_response.get('cause')}")
                return Response(
                    {
                        "error": "Error al crear la preferencia de pago",
                        "details": preference_response,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Manejar diferentes formatos de respuesta del SDK
        if "response" in preference_response:
            preference = preference_response["response"]
            logger.info("📦 Usando preference_response['response']")
        else:
            preference = preference_response
            logger.info("📦 Usando preference_response directamente")

        # Verificar si preference es un dict o None
        if preference is None:
            logger.error("❌ La preferencia es None!")
            # Intentar obtener el error
            if "error" in preference_response:
                logger.error(f"❌ Error de MercadoPago: {preference_response['error']}")
            if "message" in preference_response:
                logger.error(f"❌ Mensaje de MercadoPago: {preference_response['message']}")
            if "status" in preference_response:
                logger.error(f"❌ Status de MercadoPago: {preference_response['status']}")
            raise Exception("MercadoPago retornó una preferencia vacía")

        logger.info(f"✅ Preferencia de pre-reserva creada: {preference.get('id')}")
        logger.info(f"🔗 Sandbox: {preference.get('sandbox_init_point')}")
        logger.info(
            f"🔙 Success URL: {settings.FRONTEND_URL}/reservas/confirmar-prereserva?reserva_id={reserva.id_reserva}"
        )

        return Response(
            {
                "preference_id": preference.get("id"),
                "init_point": preference.get("init_point"),
                "sandbox_init_point": preference.get("sandbox_init_point"),
                "reserva_id": reserva.id_reserva,  # Retornar ID de reserva en lugar de temp_id
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        logger.error(f"❌ Error al crear preferencia de pre-reserva: {str(e)}")
        import traceback

        logger.error(traceback.format_exc())

        # Si falló, eliminar la reserva creada
        if "reserva" in locals():
            logger.info(f"🗑️ Eliminando reserva #{reserva.id_reserva} por error en MercadoPago")
            reserva.delete()

        return Response(
            {"error": "No se pudo crear la preferencia de pago", "detalle": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_reserva_con_pago(request):
    """
    ACTUALIZA una reserva existente después de que el pago fue exitoso.
    Recibe el payment_id y el reserva_id.
    Cambia el estado de 'pendiente_pago_sena' a 'sena_pagada'.

    POST /api/v1/mercadopago/crear-reserva-con-pago/
    Body: { "payment_id": "...", "reserva_id": 123 }
    """
    try:
        # Validar que el usuario sea un cliente
        try:
            persona = Persona.objects.get(email=request.user.email)
            cliente = Cliente.objects.get(persona=persona)
        except (Persona.DoesNotExist, Cliente.DoesNotExist):
            return Response(
                {"error": "Solo los clientes pueden solicitar servicios"},
                status=status.HTTP_403_FORBIDDEN,
            )

        logger.info("🔄 CONFIRMANDO PAGO DE RESERVA")
        logger.info(f"👤 Cliente: {cliente.persona.email}")

        # Obtener IDs
        payment_id = request.data.get("payment_id")
        reserva_id = request.data.get("reserva_id")

        if not payment_id:
            logger.error("❌ No se recibió payment_id")
            return Response({"error": "payment_id es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        if not reserva_id:
            logger.error("❌ No se recibió reserva_id")
            return Response({"error": "reserva_id es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        logger.info(f"💳 Payment ID: {payment_id}")
        logger.info(f"📋 Reserva ID: {reserva_id}")

        # Buscar la reserva
        try:
            reserva = Reserva.objects.get(
                id_reserva=reserva_id,
                cliente=cliente,
                estado_pago_sena="pendiente_pago_sena",
            )
        except Reserva.DoesNotExist:
            logger.error(f"❌ No se encontró reserva #{reserva_id} pendiente de pago para este cliente")
            return Response(
                {"error": "No se encontró la reserva o ya fue procesada"},
                status=status.HTTP_404_NOT_FOUND,
            )

        logger.info(f"✅ Reserva encontrada: #{reserva.id_reserva}")

        # Validar el pago con MercadoPago (con reintentos por delay de sandbox)
        sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)
        payment_data = None
        max_retries = 10  # Sandbox puede tardar hasta 30+ segundos
        retry_delay = 4  # segundos - total hasta 40 segundos de espera

        for attempt in range(max_retries):
            try:
                if attempt > 0:
                    logger.info(f"⏳ Reintento {attempt + 1}/{max_retries} después de {retry_delay}s...")
                    import time

                    time.sleep(retry_delay)

                payment_info = sdk.payment().get(payment_id)
                payment_data = payment_info["response"] if "response" in payment_info else payment_info

                # Verificar si el pago existe (no es 404)
                if isinstance(payment_data, dict) and payment_data.get("status") != 404:
                    logger.info(f"📊 Estado del pago: {payment_data.get('status')}")
                    logger.info(f"💵 Monto: ${payment_data.get('transaction_amount')}")
                    break  # Pago encontrado, salir del loop
                else:
                    logger.warning(f"⚠️ Intento {attempt + 1}: Pago aún no disponible en API (404)")
                    if attempt == max_retries - 1:
                        raise Exception("Pago no encontrado después de múltiples reintentos")

            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"❌ Error al validar pago después de {max_retries} intentos: {str(e)}")

                    # Eliminar la reserva si el pago no se pudo validar
                    logger.info(f"🗑️ Eliminando reserva #{reserva.id_reserva} por fallo en validación de pago")
                    reserva.delete()

                    return Response(
                        {
                            "error": (
                                "No se pudo validar el pago con MercadoPago. La reserva fue cancelada. "
                                "Por favor, intenta nuevamente."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # Verificar que el pago esté aprobado
        if payment_data.get("status") != "approved":
            logger.warning(f"⚠️ Pago NO aprobado. Estado: {payment_data.get('status')}")
            return Response(
                {"error": "El pago no está aprobado"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        monto_pagado = payment_data.get("transaction_amount")

        pago = reserva.obtener_pago()

        # ACTUALIZAR el pago de la reserva existente
        pago.payment_id_sena = payment_id
        pago.estado_pago_sena = "sena_pagada"
        pago.fecha_pago_sena = timezone.now()
        reserva.estado = "confirmada"  # Ahora sí está confirmada
        reserva.save()
        pago.save()

        logger.info(f"✅ Reserva #{reserva.id_reserva} ACTUALIZADA con pago confirmado")
        logger.info(f"💳 Payment ID: {payment_id}")
        logger.info(f"💰 Monto pagado: ${monto_pagado}")
        logger.info("📊 Estado anterior: pendiente_pago_sena → Estado nuevo: sena_pagada")

        # Enviar email de confirmación
        logger.info("📧 Preparando email de confirmación de pago...")
        logger.info(f"   📮 Destinatario: {cliente.persona.email}")
        logger.info(f"   💰 Monto: ${pago.monto_sena}")
        logger.info(f"   🔢 Reserva: #{reserva.id_reserva}")

        try:
            email_sent = EmailService.send_payment_confirmation_email(
                user_email=cliente.persona.email,
                user_name=f"{cliente.persona.nombre} {cliente.persona.apellido}",
                reserva_id=reserva.id_reserva,
                servicio_nombre=reserva.servicio.nombre,
                monto=pago.monto_sena,
                payment_id=payment_id,
                tipo_pago="seña",
            )

            if email_sent:
                logger.info(f"✅ Email de confirmación enviado exitosamente a {cliente.persona.email}")
            else:
                logger.warning("⚠️ El email no pudo ser enviado (sin excepción)")

        except Exception as e:
            logger.error(f"❌ Error al enviar email: {str(e)}")
            logger.error(f"   Tipo de error: {type(e).__name__}")
            import traceback

            logger.error(f"   Traceback: {traceback.format_exc()}")

        # Serializar y retornar la reserva
        serializer = ReservaSerializer(reserva)

        return Response(
            {
                "success": True,
                "mensaje": "¡Reserva creada y pago confirmado exitosamente!",
                "reserva": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        logger.error(f"❌ Error al crear reserva con pago: {str(e)}")
        import traceback

        logger.error(traceback.format_exc())
        return Response(
            {"error": "No se pudo crear la reserva", "detalle": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ==================== ENDPOINTS DEPRECADOS ====================


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_preferencia_pago(request, reserva_id):
    """
    DEPRECATED: Usar crear_preferencia_pago_sena() o crear_preferencia_pago_final()
    """
    return Response(
        {
            "error": "Endpoint deprecado",
            "mensaje": "Use /crear-pago-sena/ para el pago inicial o /crear-pago-final/ para el pago al aceptar diseño",
        },
        status=status.HTTP_410_GONE,
    )


# ==================== ENDPOINTS DE PRUEBA (DESARROLLO) ====================


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crear_pago_prueba(request):
    """
    Crear un pago de prueba en MercadoPago para testing.
    POST /api/v1/mercadopago/pago-prueba/

    Solo para desarrollo y testing.
    """
    try:
        monto = request.data.get("monto", 100)
        descripcion = request.data.get("descripcion", "Pago de prueba")

        # Crear SDK de MercadoPago
        sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)

        # Generar un ID único para la prueba
        test_id = str(uuid.uuid4())[:8]

        preference_data = {
            "items": [
                {
                    "id": f"TEST-{test_id}",
                    "title": "Pago de Prueba - El Edén",
                    "description": descripcion,
                    "quantity": 1,
                    "unit_price": float(monto),
                    "currency_id": "ARS",
                    "category_id": "services",
                }
            ],
            "payer": {
                "name": request.user.first_name or "Usuario",
                "surname": request.user.last_name or "Prueba",
                "email": request.user.email,
            },
            "back_urls": {
                "success": f"{settings.FRONTEND_URL}/",
                "failure": f"{settings.FRONTEND_URL}/",
                "pending": f"{settings.FRONTEND_URL}/",
            },
            "external_reference": f"TEST-{test_id}",
            "statement_descriptor": "El Eden Test",
            "payment_methods": {"excluded_payment_types": [], "installments": 12},
        }

        logger.info(f"🧪 Creando pago de prueba para {request.user.email}")
        logger.info(f"💰 Monto: ${monto}")

        preference_response = sdk.preference().create(preference_data)

        # Manejar diferentes formatos de respuesta del SDK
        if "response" in preference_response:
            preference = preference_response["response"]
        else:
            preference = preference_response

        logger.info(f"✅ Preferencia de prueba creada: {preference.get('id')}")

        return Response(
            {
                "preference_id": preference.get("id"),
                "init_point": preference.get("init_point"),
                "sandbox_init_point": preference.get("sandbox_init_point"),
                "mensaje": "Preferencia de pago de prueba creada exitosamente",
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        logger.error(f"❌ Error al crear pago de prueba: {str(e)}")
        import traceback

        logger.error(traceback.format_exc())
        return Response(
            {"error": "No se pudo crear el pago de prueba", "detalle": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
