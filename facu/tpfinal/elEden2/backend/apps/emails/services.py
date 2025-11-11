"""
Servicios para envío de emails
"""
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
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
