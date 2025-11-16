"""
Servicios para envío de emails
"""
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.html import strip_tags
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Servicio centralizado para el envío de emails"""
    
    @staticmethod
    def send_welcome_email(user_email, user_name, username, password=None):
        """
        Envía un email de bienvenida al nuevo cliente registrado
        
        Args:
            user_email (str): Email del destinatario
            user_name (str): Nombre completo del usuario
            username (str): Nombre de usuario
            password (str, optional): Contraseña temporal si fue generada automáticamente
        
        Returns:
            bool: True si el email fue enviado exitosamente, False en caso contrario
        """
        try:
            subject = '¡Bienvenido a El Edén! 🌿'
            
            # Crear el contenido del email
            if password:
                message = f"""
¡Hola {user_name}!

¡Bienvenido/a a El Edén! 🌿

Tu cuenta ha sido creada exitosamente. A continuación, encontrarás tus credenciales de acceso:

Usuario: {username}
Contraseña temporal: {password}

Por seguridad, te recomendamos cambiar tu contraseña al iniciar sesión por primera vez.

Puedes acceder a tu cuenta en: {settings.FRONTEND_URL}

¿Qué puedes hacer ahora?
✓ Explorar nuestros servicios de jardinería
✓ Solicitar servicios personalizados
✓ Ver el estado de tus solicitudes
✓ Gestionar tu perfil

Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.

¡Gracias por confiar en nosotros!

Saludos cordiales,
El equipo de El Edén 🌱
                """.strip()
            else:
                message = f"""
¡Hola {user_name}!

¡Bienvenido/a a El Edén! 🌿

Tu cuenta ha sido creada exitosamente con el usuario: {username}

Puedes acceder a tu cuenta en: {settings.FRONTEND_URL}

¿Qué puedes hacer ahora?
✓ Explorar nuestros servicios de jardinería
✓ Solicitar servicios personalizados
✓ Ver el estado de tus solicitudes
✓ Gestionar tu perfil

Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.

¡Gracias por confiar en nosotros!

Saludos cordiales,
El equipo de El Edén 🌱
                """.strip()
            
            # Enviar el email
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user_email],
                fail_silently=False,
            )
            
            logger.info(f"Email de bienvenida enviado exitosamente a {user_email}")
            return True
            
        except Exception as e:
            logger.error(f"Error al enviar email de bienvenida a {user_email}: {str(e)}")
            return False
    
    @staticmethod
    def send_employee_welcome_email(user_email, user_name, username, password):
        """
        Envía un email de bienvenida al nuevo empleado con sus credenciales
        
        Args:
            user_email (str): Email del empleado
            user_name (str): Nombre completo del empleado
            username (str): Nombre de usuario o email para login
            password (str): Contraseña generada
        
        Returns:
            bool: True si el email fue enviado exitosamente, False en caso contrario
        """
        try:
            subject = '¡Bienvenido al Equipo de El Edén! 👨‍🌾'
            
            # URL de login directo que redirige al perfil
            profile_url = 'http://localhost:5173/login?redirect=profile'
            
            message = f"""
¡Hola {user_name}!

¡Bienvenido/a al equipo de El Edén! 👨‍🌾

Se ha creado tu cuenta de empleado en nuestro sistema. A continuación, encontrarás tus credenciales de acceso:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email/Usuario: {username}
🔑 Contraseña: {password}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 Acceder al sistema e ir a tu perfil:
{profile_url}

⚠️ IMPORTANTE - COMPLETA TU PERFIL:
Después de iniciar sesión, debes completar tu información personal:
• Teléfono de contacto
• Número de documento
• Dirección completa
• Cargo/Puesto de trabajo

Esta información es necesaria para tu registro completo en el sistema.

🔒 SEGURIDAD:
• Cambia tu contraseña después del primer inicio de sesión
• Guarda estas credenciales en un lugar seguro
• No compartas tu contraseña con nadie

Como empleado, tendrás acceso a:
✓ Panel de gestión de servicios
✓ Calendario de trabajos asignados
✓ Gestión de clientes
✓ Herramientas de comunicación interna

Si tienes alguna pregunta o necesitas ayuda, contacta con el administrador del sistema.

¡Esperamos que disfrutes trabajando con nosotros!

Saludos cordiales,
El equipo de administración de El Edén 🌱
            """.strip()
            
            # Enviar el email
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user_email],
                fail_silently=False,
            )
            
            logger.info(f"Email de bienvenida de empleado enviado exitosamente a {user_email}")
            return True
            
        except Exception as e:
            logger.error(f"Error al enviar email de bienvenida de empleado a {user_email}: {str(e)}")
            return False
    
    @staticmethod
    def send_password_reset_email(user_email, user_name, reset_token):
        """
        Envía un email para resetear la contraseña
        
        Args:
            user_email (str): Email del destinatario
            user_name (str): Nombre completo del usuario
            reset_token (str): Token para resetear la contraseña
        
        Returns:
            bool: True si el email fue enviado exitosamente
        """
        try:
            subject = 'Recuperación de Contraseña - El Edén'
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{reset_token}"
            
            message = f"""
Hola {user_name},

Recibimos una solicitud para restablecer tu contraseña en El Edén.

Si fuiste tú quien realizó esta solicitud, haz clic en el siguiente enlace para crear una nueva contraseña:

{reset_url}

Este enlace expirará en 24 horas.

Si no solicitaste restablecer tu contraseña, puedes ignorar este correo. Tu contraseña actual seguirá siendo válida.

Saludos,
El equipo de El Edén 🌱
            """.strip()
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user_email],
                fail_silently=False,
            )
            
            logger.info(f"Email de recuperación de contraseña enviado a {user_email}")
            return True
            
        except Exception as e:
            logger.error(f"Error al enviar email de recuperación a {user_email}: {str(e)}")
            return False
    
    @staticmethod
    def send_service_confirmation_email(user_email, user_name, service_name, service_date):
        """
        Envía un email de confirmación de servicio
        
        Args:
            user_email (str): Email del destinatario
            user_name (str): Nombre del cliente
            service_name (str): Nombre del servicio
            service_date (str): Fecha del servicio
        
        Returns:
            bool: True si el email fue enviado exitosamente
        """
        try:
            subject = f'Confirmación de Servicio - {service_name}'
            
            message = f"""
Hola {user_name},

¡Tu solicitud de servicio ha sido confirmada! 🌿

Detalles del servicio:
- Servicio: {service_name}
- Fecha programada: {service_date}

Nos pondremos en contacto contigo próximamente para coordinar los detalles.

Puedes ver el estado de tu solicitud en tu panel de cliente: {settings.FRONTEND_URL}/mis-servicios

Gracias por confiar en El Edén.

Saludos cordiales,
El equipo de El Edén 🌱
            """.strip()
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user_email],
                fail_silently=False,
            )
            
            logger.info(f"Email de confirmación de servicio enviado a {user_email}")
            return True
            
        except Exception as e:
            logger.error(f"Error al enviar email de confirmación a {user_email}: {str(e)}")
            return False
    
    @staticmethod
    def send_payment_confirmation_email(user_email, user_name, reserva_id, servicio_nombre, monto, payment_id, tipo_pago='seña'):
        """
        Envía un email de confirmación de pago exitoso
        
        Args:
            user_email (str): Email del cliente
            user_name (str): Nombre completo del cliente
            reserva_id (int): ID de la reserva
            servicio_nombre (str): Nombre del servicio
            monto (Decimal): Monto pagado
            payment_id (str): ID de pago de MercadoPago
            tipo_pago (str): Tipo de pago ('seña' o 'final')
        
        Returns:
            bool: True si el email fue enviado exitosamente
        """
        try:
            logger.info(f"📧 [EmailService] Iniciando envío de email de confirmación de pago")
            logger.info(f"   📮 Para: {user_email}")
            logger.info(f"   💳 Tipo: {tipo_pago}")
            logger.info(f"   💰 Monto: ${monto}")
            
            tipo_pago_texto = 'Seña' if tipo_pago == 'seña' else 'Pago Final'
            subject = f'✅ Pago de {tipo_pago_texto} Confirmado - Reserva #{reserva_id}'
            
            logger.info(f"   📄 Asunto: {subject}")
            
            message = f"""
¡Hola {user_name}!

¡Excelente noticia! Tu pago ha sido procesado exitosamente. 🎉

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 DETALLES DE LA TRANSACCIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💳 Tipo de Pago: {tipo_pago_texto}
💰 Monto: ${monto:,.2f} ARS
🔢 Reserva N°: #{reserva_id}
🌿 Servicio: {servicio_nombre}
🆔 ID de Transacción: {payment_id}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
            
            if tipo_pago == 'seña':
                message += """
📋 PRÓXIMOS PASOS:

1. ✅ Tu reserva está confirmada
2. 📞 Nuestro equipo te contactará pronto para coordinar detalles
3. 🎨 Recibirás una propuesta de diseño
4. 💵 El pago final se realizará después de aprobar el diseño

"""
            else:
                message += """
🎉 ¡RESERVA COMPLETAMENTE PAGADA!

Tu servicio está confirmado y listo para ejecutarse.
Nuestro equipo se pondrá en contacto contigo para coordinar la fecha de inicio.

"""
            
            message += f"""
🔗 Ver detalles de tu reserva:
{settings.FRONTEND_URL}/mis-reservas

📧 Si tienes alguna pregunta, no dudes en contactarnos.

¡Gracias por confiar en El Edén! 🌱

Saludos cordiales,
El equipo de El Edén
            """.strip()
            
            logger.info(f"   📨 Enviando email vía {settings.EMAIL_BACKEND}...")
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user_email],
                fail_silently=False,
            )
            
            logger.info(f"✅ [EmailService] Email de confirmación de pago ({tipo_pago}) enviado exitosamente")
            logger.info(f"   📬 Destinatario: {user_email}")
            logger.info(f"   🔢 Reserva: #{reserva_id}")
            
            # Si estás usando ConsoleEmailBackend, el email se muestra en la consola
            if 'console' in settings.EMAIL_BACKEND.lower():
                logger.info(f"   ℹ️ Backend: CONSOLE (el email se muestra arriba en la terminal)")
            elif 'smtp' in settings.EMAIL_BACKEND.lower():
                logger.info(f"   ℹ️ Backend: SMTP (email enviado por correo real)")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ [EmailService] Error al enviar email de confirmación de pago")
            logger.error(f"   📧 Destinatario: {user_email}")
            logger.error(f"   ❌ Error: {str(e)}")
            logger.error(f"   🔍 Tipo: {type(e).__name__}")
            return False

    @staticmethod
    def send_payment_notification_to_admin(reserva_id, cliente_nombre, servicio_nombre, monto, payment_id, fecha_reserva, direccion, observaciones=None, tipo_pago='seña'):
        """
        Envía un email de notificación a los administradores cuando se confirma un pago
        
        Args:
            reserva_id (int): ID de la reserva
            cliente_nombre (str): Nombre completo del cliente
            servicio_nombre (str): Nombre del servicio
            monto (Decimal): Monto pagado
            payment_id (str): ID de pago de MercadoPago
            fecha_reserva (datetime): Fecha programada del servicio
            direccion (str): Dirección donde se realizará el servicio
            observaciones (str, optional): Observaciones del cliente
            tipo_pago (str): Tipo de pago ('seña' o 'final')
        
        Returns:
            bool: True si el email fue enviado exitosamente
        """
        try:
            from django.contrib.auth.models import User
            
            logger.info(f"📧 [EmailService] Iniciando envío de notificación a administradores")
            logger.info(f"   🔢 Reserva: #{reserva_id}")
            
            # Obtener emails de todos los administradores
            admin_emails = User.objects.filter(is_staff=True, is_active=True).values_list('email', flat=True)
            admin_emails = [email for email in admin_emails if email]  # Filtrar emails vacíos
            
            if not admin_emails:
                logger.warning("⚠️ No se encontraron administradores con email configurado")
                return False
            
            logger.info(f"   👥 Administradores: {', '.join(admin_emails)}")
            
            tipo_pago_texto = 'Seña' if tipo_pago == 'seña' else 'Pago Final'
            subject = f'🔔 Nueva Reserva - Pago de {tipo_pago_texto} Recibido - Reserva #{reserva_id}'
            
            # Formatear fecha
            fecha_formateada = fecha_reserva.strftime('%d/%m/%Y %H:%M') if fecha_reserva else 'No especificada'
            
            message = f"""
¡Hola Administrador!

Se ha recibido un nuevo pago de {tipo_pago_texto.lower()} para una reserva.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 INFORMACIÓN DE LA RESERVA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔢 Reserva N°: #{reserva_id}
👤 Cliente: {cliente_nombre}
🌿 Servicio: {servicio_nombre}
📅 Fecha Programada: {fecha_formateada}
📍 Dirección: {direccion or 'No especificada'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 INFORMACIÓN DEL PAGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Monto: ${monto:,.2f} ARS
💳 Tipo: {tipo_pago_texto}
🆔 ID de Transacción: {payment_id}
✅ Estado: APROBADO

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
            
            if observaciones:
                message += f"""
📝 OBSERVACIONES DEL CLIENTE:

{observaciones}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
            
            if tipo_pago == 'seña':
                message += """
📋 ACCIONES REQUERIDAS:

1. ✅ Verificar el pago en el panel de MercadoPago
2. 📞 Contactar al cliente para confirmar detalles
3. 🎨 Asignar un diseñador si corresponde
4. 📅 Coordinar la fecha del servicio

"""
            else:
                message += """
📋 ACCIONES REQUERIDAS:

1. ✅ Verificar el pago en el panel de MercadoPago
2. 👥 Asignar empleados para el servicio
3. 📅 Confirmar la fecha con el cliente
4. 🚀 Iniciar la ejecución del servicio

"""
            
            message += f"""
🔗 Ver detalles en el panel de administración:
{settings.FRONTEND_URL}/servicios

¡Atención inmediata requerida! 🌱

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sistema de Notificaciones - El Edén
            """.strip()
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=admin_emails,
                fail_silently=False,
            )
            
            logger.info(f"✅ [EmailService] Notificación a administradores enviada exitosamente")
            logger.info(f"   📬 Destinatarios: {len(admin_emails)} administrador(es)")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ [EmailService] Error al enviar notificación a administradores")
            logger.error(f"   ❌ Error: {str(e)}")
            logger.error(f"   🔍 Tipo: {type(e).__name__}")
            return False

    @staticmethod
    def send_employee_deactivation_alert(empleado, motivo, promedio_actual, evaluaciones_bajas):
        """Envía un correo al equipo administrativo cuando un empleado es dado de baja por puntuación."""
        subject = f"Empleado {empleado.persona.nombre} {empleado.persona.apellido} dado de baja"
        nombre_empleado = f"{empleado.persona.nombre} {empleado.persona.apellido}".strip()
        try:
            promedio_str = f"{float(promedio_actual):.2f}"
        except (TypeError, ValueError):
            promedio_str = str(promedio_actual)
        timestamp = timezone.now().strftime('%Y-%m-%d %H:%M:%S')

        message = f"""
Hola equipo administrativo,

El empleado {nombre_empleado} ({empleado.persona.email}) ha sido desactivado automáticamente en el sistema.

Motivo: {motivo}
Promedio actual: {promedio_str}
Calificaciones consecutivas < 7: {evaluaciones_bajas}
Fecha de baja: {timestamp}

Por favor, revisen el estado del empleado y tomen las acciones necesarias.

Saludos,
El sistema de alertas de El Edén
""".strip()

        User = get_user_model()
        recipients = list(
            User.objects.filter(is_staff=True, email__isnull=False)
            .values_list('email', flat=True)
        )

        if not recipients:
            recipients = [settings.DEFAULT_FROM_EMAIL]

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=list(recipients),
                fail_silently=False,
            )
            logger.info(f"Alerta de baja enviada a administradores: {', '.join(recipients)}")
            return True
        except Exception as e:
            logger.error(f"Error al enviar alerta de baja de empleado: {str(e)}")
            return False

    @staticmethod
    def send_weather_alert_notification(reserva, alerta):
        """Notifica al equipo administrativo que una reserva fue marcada por clima."""
        subject = f"[Clima] Posible lluvia para reserva #{reserva.id_reserva}"
        cliente = reserva.cliente.persona if reserva.cliente_id else None
        cliente_nombre = f"{cliente.nombre} {cliente.apellido}" if cliente else 'Cliente'
        fecha_texto = reserva.fecha_reserva.strftime('%d/%m/%Y %H:%M') if reserva.fecha_reserva else 'sin fecha'
        message = f"""
Se detectó una alerta de clima para la reserva #{reserva.id_reserva}.

Cliente: {cliente_nombre}
Servicio: {reserva.servicio.nombre if reserva.servicio_id else 'N/D'}
Fecha original: {fecha_texto}
Probabilidad de lluvia: {alerta.probability_percentage or 'sin dato'}%
Precipitación estimada: {alerta.precipitation_mm} mm (umbral {alerta.precipitation_threshold} mm)

Se marcó la reserva como pendiente de reprogramación.
""".strip()

        User = get_user_model()
        recipients = list(User.objects.filter(is_staff=True, email__isnull=False).values_list('email', flat=True))
        if not recipients:
            recipients = [settings.DEFAULT_FROM_EMAIL]

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=recipients,
                fail_silently=False,
            )
            logger.info("Alerta de clima notificada a administradores")
            return True
        except Exception as exc:
            logger.error(f"No se pudo enviar alerta de clima: {exc}")
            return False

    @staticmethod
    def send_weather_reprogram_notification(reserva, nueva_fecha):
        """Informa al cliente y al equipo que la reserva se reprogramó por clima."""
        cliente = reserva.cliente.persona if reserva.cliente_id else None
        if not cliente:
            return False

        subject = f"Reserva #{reserva.id_reserva} reprogramada por clima"
        nueva_fecha_texto = nueva_fecha.strftime('%d/%m/%Y %H:%M')
        mensaje_cliente = f"""
Hola {cliente.nombre},

Reprogramamos tu servicio "{reserva.servicio.nombre}" debido a condiciones climáticas adversas.

📅 Nueva fecha: {nueva_fecha_texto}
📍 Dirección: {reserva.direccion or 'A confirmar'}

Te avisaremos si surge algún cambio adicional.

Equipo de El Edén
""".strip()

        try:
            send_mail(
                subject=subject,
                message=mensaje_cliente,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[cliente.email],
                fail_silently=False,
            )
            logger.info("Cliente notificado por reprogramación climática")
        except Exception as exc:
            logger.error(f"No se pudo notificar al cliente por clima: {exc}")

        User = get_user_model()
        admin_recipients = list(User.objects.filter(is_staff=True, email__isnull=False).values_list('email', flat=True))
        if admin_recipients:
            mensaje_admin = f"""
Se reprogramó la reserva #{reserva.id_reserva} por clima.
Nueva fecha: {nueva_fecha_texto}
Cliente: {cliente.nombre} {cliente.apellido}
Servicio: {reserva.servicio.nombre}
""".strip()
            try:
                send_mail(
                    subject=f"[Admin] {subject}",
                    message=mensaje_admin,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=admin_recipients,
                    fail_silently=False,
                )
            except Exception as exc:
                logger.error(f"No se pudo notificar a administradores de la reprogramación: {exc}")

        # Notificar a empleados asignados
        logger.info(f"[Reprogramación] Verificando empleados asignados para reserva #{reserva.id_reserva}")
        
        # Log de todas las asignaciones sin filtro
        todas_asignaciones = reserva.asignaciones.all()
        logger.info(f"[Reprogramación] Total asignaciones encontradas: {todas_asignaciones.count()}")
        for asignacion in todas_asignaciones:
            logger.info(f"[Reprogramación] Asignación: Empleado {asignacion.empleado.persona.nombre} {asignacion.empleado.persona.apellido}, Activo: {asignacion.empleado.activo}, Email: {asignacion.empleado.persona.email}, User activo: {asignacion.empleado.persona.user.is_active if hasattr(asignacion.empleado.persona, 'user') else 'N/A'}")
        
        empleado_recipients = list(reserva.asignaciones.filter(
            empleado__activo=True,
            empleado__persona__user__is_active=True,
            empleado__persona__email__isnull=False
        ).values_list('empleado__persona__email', flat=True))
        
        logger.info(f"[Reprogramación] Empleados filtrados con email: {len(empleado_recipients)} - Emails: {empleado_recipients}")
        
        if empleado_recipients:
            mensaje_empleado = f"""
Hola,

La reserva #{reserva.id_reserva} a la que estás asignado/a ha sido reprogramada por condiciones climáticas adversas.

📅 Nueva fecha: {nueva_fecha_texto}
Cliente: {cliente.nombre} {cliente.apellido}
Servicio: {reserva.servicio.nombre}
📍 Dirección: {reserva.direccion or 'A confirmar'}

Por favor, ajusta tu agenda correspondiente.

Equipo de El Edén
""".strip()
            try:
                send_mail(
                    subject=f"[Empleado] {subject}",
                    message=mensaje_empleado,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=empleado_recipients,
                    fail_silently=False,
                )
                logger.info(f"Notificados {len(empleado_recipients)} empleados por reprogramación climática")
            except Exception as exc:
                logger.error(f"No se pudo notificar a empleados de la reprogramación: {exc}")

    @staticmethod
    def send_design_proposal_notification(cliente_email, cliente_nombre, diseno_id, titulo_diseno, descripcion, presupuesto, reserva_id, servicio_nombre, disenador_nombre=None, fecha_propuesta=None, productos_lista=None, imagenes_count=0):
        """
        Envía un email al cliente cuando se presenta una propuesta de diseño
        
        Args:
            cliente_email (str): Email del cliente
            cliente_nombre (str): Nombre completo del cliente
            diseno_id (int): ID del diseño
            titulo_diseno (str): Título del diseño
            descripcion (str): Descripción del diseño
            presupuesto (Decimal): Presupuesto total del diseño
            reserva_id (int): ID de la reserva asociada
            servicio_nombre (str): Nombre del servicio
            disenador_nombre (str, optional): Nombre del diseñador
            fecha_propuesta (datetime, optional): Fecha propuesta para realizar el servicio
            productos_lista (list, optional): Lista de productos incluidos
            imagenes_count (int): Cantidad de imágenes del diseño
        
        Returns:
            bool: True si el email fue enviado exitosamente
        """
        try:
            logger.info(f"📧 [EmailService] Iniciando envío de notificación de propuesta de diseño")
            logger.info(f"   📮 Para: {cliente_email}")
            logger.info(f"   🎨 Diseño ID: {diseno_id}")
            
            subject = f'🎨 Nueva Propuesta de Diseño Disponible - Reserva #{reserva_id}'
            
            # Formatear fecha propuesta
            fecha_texto = ''
            if fecha_propuesta:
                fecha_texto = fecha_propuesta.strftime('%d/%m/%Y')
            
            message = f"""
¡Hola {cliente_nombre}!

¡Tenemos excelentes noticias! 🎉

Tu propuesta de diseño está lista para ser revisada.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 DETALLES DE LA PROPUESTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Título: {titulo_diseno}
🔢 Diseño N°: #{diseno_id}
🌿 Servicio: {servicio_nombre}
🔢 Reserva N°: #{reserva_id}
"""
            
            if disenador_nombre:
                message += f"👨‍🎨 Diseñador: {disenador_nombre}\n"
            
            if fecha_propuesta:
                message += f"📅 Fecha Propuesta: {fecha_texto}\n"
            
            message += f"""
💰 Presupuesto Total: ${presupuesto:,.2f} ARS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 DESCRIPCIÓN DEL PROYECTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{descripcion}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
            
            if productos_lista and len(productos_lista) > 0:
                message += """
🛠️ MATERIALES Y PRODUCTOS INCLUIDOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"""
                for producto in productos_lista:
                    nombre = producto.get('nombre', 'Producto')
                    cantidad = producto.get('cantidad', 0)
                    precio = producto.get('precio_unitario', 0)
                    subtotal = cantidad * precio
                    message += f"• {nombre}\n"
                    message += f"  Cantidad: {cantidad} | Precio: ${precio:,.2f} | Subtotal: ${subtotal:,.2f}\n\n"
                
                message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            
            if imagenes_count > 0:
                message += f"""
🖼️ IMÁGENES DEL DISEÑO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Esta propuesta incluye {imagenes_count} imagen(es) de referencia que podrás ver en el sistema.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"""
            
            message += f"""
📋 PRÓXIMOS PASOS:

1. 🔍 Revisa la propuesta completa en tu panel
2. 💭 Evalúa el diseño, presupuesto y materiales
3. ✅ APRUEBA el diseño si te gusta
4. 💵 Realiza el pago del monto restante
5. 🚀 ¡Comenzamos a trabajar en tu jardín!

O si tienes observaciones:
• 📝 Solicita cambios o revisiones
• ❌ Rechaza la propuesta con tus comentarios

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 INFORMACIÓN DE PAGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Presupuesto Total: ${presupuesto:,.2f} ARS

Recuerda que ya pagaste la seña inicial.
El monto restante se abonará después de aprobar esta propuesta.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 VER Y APROBAR PROPUESTA:
{settings.FRONTEND_URL}/mis-servicios

⚠️ IMPORTANTE: Debes iniciar sesión y acceder a "Mis Servicios" para ver todos los detalles de la propuesta, incluyendo las imágenes, y aprobarla o solicitar cambios.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

¿Tienes preguntas? No dudes en contactarnos.

¡Esperamos que te encante nuestra propuesta! 🌱

Saludos cordiales,
El equipo de El Edén
            """.strip()
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[cliente_email],
                fail_silently=False,
            )
            
            logger.info(f"✅ [EmailService] Notificación de propuesta de diseño enviada exitosamente")
            logger.info(f"   📬 Destinatario: {cliente_email}")
            logger.info(f"   🎨 Diseño: #{diseno_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ [EmailService] Error al enviar notificación de propuesta de diseño")
            logger.error(f"   📧 Destinatario: {cliente_email}")
            logger.error(f"   ❌ Error: {str(e)}")
            logger.error(f"   🔍 Tipo: {type(e).__name__}")
            return False

    @staticmethod
    def send_design_rejection_notification(disenador_email, disenador_nombre, diseno_id, titulo_diseno, cliente_nombre, servicio_nombre, reserva_id, feedback_cliente, presupuesto, cancelar_servicio=False):
        """
        Envía un email al diseñador/empleado cuando el cliente rechaza su propuesta de diseño
        
        Args:
            disenador_email (str): Email del diseñador
            disenador_nombre (str): Nombre completo del diseñador
            diseno_id (int): ID del diseño rechazado
            titulo_diseno (str): Título del diseño
            cliente_nombre (str): Nombre completo del cliente
            servicio_nombre (str): Nombre del servicio
            reserva_id (int): ID de la reserva asociada
            feedback_cliente (str): Comentarios/feedback del cliente sobre el rechazo
            presupuesto (Decimal): Presupuesto del diseño rechazado
            cancelar_servicio (bool): Si el cliente canceló todo el servicio o solo rechazó el diseño
        
        Returns:
            bool: True si el email fue enviado exitosamente
        """
        try:
            logger.info(f"📧 [EmailService] Iniciando envío de notificación de rechazo de diseño")
            logger.info(f"   📮 Para: {disenador_email}")
            logger.info(f"   🎨 Diseño ID: {diseno_id}")
            
            if cancelar_servicio:
                subject = f'❌ Servicio Cancelado - El cliente rechazó la propuesta #{diseno_id}'
                accion_cliente = 'CANCELÓ EL SERVICIO'
            else:
                subject = f'🔄 Diseño Rechazado - Requiere Nueva Propuesta #{diseno_id}'
                accion_cliente = 'RECHAZÓ EL DISEÑO'
            
            message = f"""
Hola {disenador_nombre},

Te informamos que el cliente ha revisado tu propuesta de diseño.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ NOTIFICACIÓN DE RECHAZO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El cliente {accion_cliente}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 INFORMACIÓN DEL DISEÑO RECHAZADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎨 Diseño N°: #{diseno_id}
📋 Título: {titulo_diseno}
🌿 Servicio: {servicio_nombre}
🔢 Reserva N°: #{reserva_id}
💰 Presupuesto Propuesto: ${presupuesto:,.2f} ARS
👤 Cliente: {cliente_nombre}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 COMENTARIOS DEL CLIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{feedback_cliente if feedback_cliente else 'El cliente no dejó comentarios específicos.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
            
            if cancelar_servicio:
                message += """
⚠️ ACCIÓN REQUERIDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El cliente decidió cancelar completamente el servicio.

📋 Próximos pasos:
• ❌ El servicio ha sido cancelado
• 📞 Contacta al cliente si necesitas aclaraciones
• 📊 Revisa el feedback para futuros proyectos
• 🔄 La reserva fue marcada como cancelada

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
            else:
                message += """
🔄 ACCIÓN REQUERIDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

El cliente rechazó esta propuesta pero mantiene el interés en el servicio.

📋 Próximos pasos:
1. 📝 Revisa cuidadosamente el feedback del cliente
2. 💭 Considera los cambios o ajustes solicitados
3. 🎨 Prepara una NUEVA propuesta de diseño
4. 📞 Opcionalmente, contacta al cliente para aclaraciones
5. ✅ Presenta la nueva propuesta cuando esté lista

💡 TIPS:
• Enfócate en los puntos específicos mencionados en el feedback
• Ajusta el presupuesto si el cliente lo considera muy alto
• Verifica que los materiales propuestos sean de su agrado
• Considera alternativas que se ajusten mejor a sus expectativas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
            
            message += f"""
🔗 ACCEDER AL SISTEMA:
{settings.FRONTEND_URL}/admin/disenos

Desde allí podrás:
• Ver todos los detalles de la propuesta rechazada
• Revisar las imágenes y productos incluidos
• Crear una nueva propuesta para el cliente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recuerda que el cliente ya pagó la seña y está esperando una propuesta que se ajuste a sus expectativas.

¡Ánimo! Esta es una oportunidad para crear algo aún mejor. 💪

Saludos,
Sistema de Gestión - El Edén
            """.strip()
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[disenador_email],
                fail_silently=False,
            )
            
            logger.info(f"✅ [EmailService] Notificación de rechazo de diseño enviada exitosamente")
            logger.info(f"   📬 Destinatario: {disenador_email}")
            logger.info(f"   🎨 Diseño: #{diseno_id}")
            logger.info(f"   ❌ Cancelar servicio: {cancelar_servicio}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ [EmailService] Error al enviar notificación de rechazo de diseño")
            logger.error(f"   📧 Destinatario: {disenador_email}")
            logger.error(f"   ❌ Error: {str(e)}")
            logger.error(f"   🔍 Tipo: {type(e).__name__}")
            return False

    @staticmethod
    def send_employee_work_assignment_notification(empleado_email, empleado_nombre, reserva_id, cliente_nombre, servicio_nombre, fecha_servicio, hora_servicio, direccion, observaciones=None, rol='operador'):
        """
        Envía un email al empleado cuando se le asigna un trabajo
        
        Args:
            empleado_email (str): Email del empleado
            empleado_nombre (str): Nombre completo del empleado
            reserva_id (int): ID de la reserva
            cliente_nombre (str): Nombre completo del cliente
            servicio_nombre (str): Nombre del servicio
            fecha_servicio (datetime): Fecha y hora del servicio
            hora_servicio (str): Hora formateada del servicio
            direccion (str): Dirección donde se realizará el servicio
            observaciones (str, optional): Observaciones del cliente
            rol (str): Rol del empleado en el servicio
        
        Returns:
            bool: True si el email fue enviado exitosamente
        """
        try:
            logger.info(f"📧 [EmailService] Iniciando envío de notificación de asignación de trabajo")
            logger.info(f"   📮 Para: {empleado_email}")
            logger.info(f"   🔢 Reserva: #{reserva_id}")
            
            rol_texto = {
                'responsable': 'Responsable',
                'operador': 'Operador',
                'diseñador': 'Diseñador',
                'asistente': 'Asistente'
            }.get(rol, 'Operador')
            
            subject = f'🔔 Nuevo Trabajo Asignado - Reserva #{reserva_id}'
            
            # Formatear fecha
            fecha_formateada = fecha_servicio.strftime('%d/%m/%Y') if fecha_servicio else 'No especificada'
            dia_semana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][fecha_servicio.weekday()] if fecha_servicio else ''
            
            message = f"""
¡Hola {empleado_nombre}!

Se te ha asignado un nuevo trabajo. 📋

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 INFORMACIÓN DEL SERVICIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔢 Reserva N°: #{reserva_id}
👤 Cliente: {cliente_nombre}
🌿 Servicio: {servicio_nombre}
👷 Tu Rol: {rol_texto}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 FECHA Y HORA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📆 Fecha: {dia_semana}, {fecha_formateada}
🕐 Hora: {hora_servicio}

⚠️ IMPORTANTE: Debes presentarte en el domicilio a la hora indicada.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 UBICACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{direccion}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
            
            if observaciones:
                message += f"""
📝 OBSERVACIONES DEL CLIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{observaciones}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
            
            message += f"""
📋 PRÓXIMOS PASOS:

1. ✅ Confirma que has recibido esta asignación
2. 📅 Agenda la fecha en tu calendario
3. 🛠️ Prepara las herramientas necesarias
4. 📍 Revisa la ubicación con anticipación
5. 🕐 Preséntate puntualmente el día del servicio

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 Ver detalles en el panel:
{settings.FRONTEND_URL}/empleado/reservas

Si tienes alguna duda o inconveniente, contacta con tu supervisor inmediatamente.

¡Gracias por tu compromiso! 🌱

Saludos cordiales,
El equipo de El Edén
            """.strip()
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[empleado_email],
                fail_silently=False,
            )
            
            logger.info(f"✅ [EmailService] Notificación de asignación de trabajo enviada exitosamente")
            logger.info(f"   📬 Destinatario: {empleado_email}")
            logger.info(f"   🔢 Reserva: #{reserva_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ [EmailService] Error al enviar notificación de asignación de trabajo")
            logger.error(f"   📧 Destinatario: {empleado_email}")
            logger.error(f"   ❌ Error: {str(e)}")
            logger.error(f"   🔍 Tipo: {type(e).__name__}")
            return False

    @staticmethod
    def send_survey_request_email(cliente_email, cliente_nombre, reserva_id, servicio_nombre, encuesta_titulo):
        """
        Envía un email al cliente solicitando que complete una encuesta de satisfacción
        cuando finaliza el servicio
        
        Args:
            cliente_email (str): Email del cliente
            cliente_nombre (str): Nombre completo del cliente
            reserva_id (int): ID de la reserva completada
            servicio_nombre (str): Nombre del servicio completado
            encuesta_titulo (str): Título de la encuesta
        
        Returns:
            bool: True si el email fue enviado exitosamente
        """
        try:
            logger.info(f"📧 [EmailService] Iniciando envío de solicitud de encuesta")
            logger.info(f"   📮 Para: {cliente_email}")
            logger.info(f"   🔢 Reserva: #{reserva_id}")
            
            subject = f'📋 ¡Tu opinión nos importa! - Servicio Completado #{reserva_id}'

            # Enlace autenticado (requiere iniciar sesión). Se elimina soporte de token público.
            survey_url = f"{settings.FRONTEND_URL}/servicios/reservas/{reserva_id}#encuesta"
            
            message = f"""
¡Hola {cliente_nombre}!

¡Nos complace informarte que tu servicio ha sido completado exitosamente! 🎉

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SERVICIO COMPLETADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔢 Reserva N°: #{reserva_id}
🌿 Servicio: {servicio_nombre}
📅 Estado: FINALIZADO

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TU OPINIÓN ES MUY VALIOSA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nos encantaría conocer tu experiencia con nuestro servicio.

Por favor, tómate unos minutos para completar nuestra encuesta de satisfacción:

"{encuesta_titulo}"

Tu feedback nos ayuda a mejorar continuamente y a brindar un mejor servicio.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 COMPLETAR ENCUESTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Haz clic en el siguiente enlace para acceder a la encuesta:

{survey_url}

⚠️ IMPORTANTE: 
- Deberás iniciar sesión con tu cuenta
- La encuesta se abrirá automáticamente
- Solo tomará unos minutos completarla

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

¿Algún problema o consulta adicional?
No dudes en contactarnos.

¡Gracias por confiar en El Edén! 🌱

Saludos cordiales,
El equipo de El Edén
            """.strip()
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[cliente_email],
                fail_silently=False,
            )
            
            logger.info(f"✅ [EmailService] Solicitud de encuesta enviada exitosamente")
            logger.info(f"   📬 Destinatario: {cliente_email}")
            logger.info(f"   🔢 Reserva: #{reserva_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ [EmailService] Error al enviar solicitud de encuesta")
            logger.error(f"   📧 Destinatario: {cliente_email}")
            logger.error(f"   ❌ Error: {str(e)}")
            logger.error(f"   🔍 Tipo: {type(e).__name__}")
            return False
