from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone
from datetime import timedelta

from apps.servicios.models import Servicio
from .models import Encuesta, TipoEncuesta, EncuestaServicio, Pregunta


@receiver(post_save, sender=Servicio)
def crear_encuesta_satisfaccion(sender, instance, created, **kwargs):
    """Crear encuesta de satisfacción cuando un servicio se completa"""
    if not created and instance.estado == 'completado':
        # Verificar si ya tiene encuesta
        if hasattr(instance, 'encuesta'):
            return
        
        # Obtener o crear tipo de encuesta de satisfacción
        tipo_encuesta, _ = TipoEncuesta.objects.get_or_create(
            nombre='Satisfacción de Servicio',
            defaults={
                'descripcion': 'Encuesta de satisfacción del cliente después del servicio'
            }
        )
        
        # Crear encuesta
        fecha_expiracion = timezone.now() + timedelta(days=30)  # 30 días para responder
        
        encuesta = Encuesta.objects.create(
            tipo_encuesta=tipo_encuesta,
            cliente=instance.cliente,
            titulo=f'Encuesta de Satisfacción - {instance.numero_servicio}',
            descripcion=f'Por favor califique nuestro servicio: {instance.solicitud.titulo}',
            fecha_expiracion=fecha_expiracion
        )
        
        # Relacionar con el servicio
        EncuestaServicio.objects.create(
            encuesta=encuesta,
            servicio=instance
        )
        
        # Crear preguntas por defecto
        crear_preguntas_por_defecto(encuesta)
        
        # Enviar email (si está configurado)
        try:
            enviar_email_encuesta(encuesta, instance)
        except Exception as e:
            print(f"Error enviando email de encuesta: {e}")


def crear_preguntas_por_defecto(encuesta):
    """Crear preguntas estándar para encuesta de satisfacción"""
    preguntas_defecto = [
        {
            'texto': '¿Cómo calificaría la calidad general del servicio?',
            'tipo': 'rating',
            'orden': 1,
            'obligatoria': True
        },
        {
            'texto': '¿El servicio se completó en el tiempo esperado?',
            'tipo': 'boolean',
            'orden': 2,
            'obligatoria': True
        },
        {
            'texto': '¿Cómo calificaría la profesionalidad del equipo?',
            'tipo': 'escala',
            'orden': 3,
            'obligatoria': True
        },
        {
            'texto': '¿Qué aspectos del servicio le gustaron más?',
            'tipo': 'multiple_choice',
            'orden': 4,
            'obligatoria': False,
            'opciones': [
                'Puntualidad',
                'Calidad del trabajo',
                'Profesionalismo',
                'Comunicación',
                'Limpieza',
                'Precio'
            ]
        },
        {
            'texto': '¿Recomendaría nuestros servicios a otros?',
            'tipo': 'boolean',
            'orden': 5,
            'obligatoria': True
        },
        {
            'texto': 'Comentarios adicionales y sugerencias de mejora:',
            'tipo': 'texto',
            'orden': 6,
            'obligatoria': False
        }
    ]
    
    for pregunta_data in preguntas_defecto:
        opciones = pregunta_data.pop('opciones', None)
        pregunta = Pregunta.objects.create(
            encuesta=encuesta,
            texto_pregunta=pregunta_data['texto'],
            tipo_pregunta=pregunta_data['tipo'],
            orden=pregunta_data['orden'],
            obligatoria=pregunta_data['obligatoria']
        )
        
        if opciones:
            pregunta.opciones_json = opciones
            pregunta.save()


def enviar_email_encuesta(encuesta, servicio):
    """Enviar email con la encuesta al cliente"""
    if not encuesta.cliente.email:
        return
    
    # URL de la encuesta (deberás ajustar según tu frontend)
    url_encuesta = f"{settings.FRONTEND_URL}/encuesta/{encuesta.token_acceso}"
    
    contexto = {
        'cliente_nombre': encuesta.cliente.first_name or encuesta.cliente.username,
        'numero_servicio': servicio.numero_servicio,
        'titulo_servicio': servicio.solicitud.titulo,
        'url_encuesta': url_encuesta,
        'fecha_expiracion': encuesta.fecha_expiracion,
        'empresa_nombre': 'El Edén - Servicios de Jardinería'
    }
    
    # Renderizar plantilla de email
    asunto = f'Encuesta de Satisfacción - Servicio {servicio.numero_servicio}'
    mensaje_html = render_to_string('emails/encuesta_satisfaccion.html', contexto)
    mensaje_texto = f"""
    Hola {contexto['cliente_nombre']},

    Esperamos que esté satisfecho con nuestro servicio "{contexto['titulo_servicio']}" (#{contexto['numero_servicio']}).

    Su opinión es muy importante para nosotros. Por favor, dedique unos minutos a completar nuestra encuesta de satisfacción:

    {url_encuesta}

    La encuesta estará disponible hasta el {contexto['fecha_expiracion'].strftime('%d/%m/%Y')}.

    Gracias por confiar en {contexto['empresa_nombre']}.

    Saludos cordiales,
    El equipo de El Edén
    """
    
    try:
        send_mail(
            asunto,
            mensaje_texto,
            settings.DEFAULT_FROM_EMAIL,
            [encuesta.cliente.email],
            html_message=mensaje_html,
            fail_silently=False
        )
        encuesta.email_enviado = True
        encuesta.save()
    except Exception as e:
        print(f"Error enviando email: {e}")
        raise
