// Sistema unificado de notificaciones para El Edén
import { toast } from 'react-hot-toast';

// Funciones principales
export const success = (message, options = {}) => {
  console.log('🟢 Success notification:', message); // Debug log
  return toast.success(message, {
    duration: 3000,
    ...options
  });
};

export const error = (message, options = {}) => {
  console.log('🔴 Error notification:', message); // Debug log
  return toast.error(message, {
    duration: 5000,
    ...options
  });
};

export const warning = (message, options = {}) => {
  console.log('🟡 Warning notification:', message); // Debug log
  return toast(message, {
    icon: '⚠️',
    duration: 4000,
    ...options
  });
};

export const info = (message, options = {}) => {
  console.log('🔵 Info notification:', message); // Debug log
  return toast(message, {
    icon: 'ℹ️',
    duration: 4000,
    ...options
  });
};

export const loading = (message, options = {}) => {
  console.log('⏳ Loading notification:', message); // Debug log
  return toast.loading(message, {
    duration: Infinity,
    ...options
  });
};

// Método para manejar errores de API de forma consistente
export const handleApiError = (apiError, customMessage = null) => {
  console.log('🔴 API Error details:', apiError); // Debug log
  
  // Ignorar errores relacionados con Private Network / loopback bloqueados por CORS (PNA)
  const lowerMsg = (apiError?.message || '').toLowerCase();
  if (!apiError.response && (lowerMsg.includes('loopback') || lowerMsg.includes('private network') || lowerMsg.includes('permission was denied') || lowerMsg.includes('blocked by cors') || lowerMsg.includes('access to xmlhttprequest') || lowerMsg.includes('failed to fetch'))) {
    // No mostrar notificación al usuario, solo loguear para debug
    console.warn('🔇 Ignorado error de red/CORS/PNA (no se mostrará notificación):', apiError?.message || apiError);
    return null;
  }

  let message = customMessage || 'Ocurrió un error inesperado';
  
  // Error de red (servidor caído, sin conexión, etc.)
  if (!apiError.response && (apiError.code === 'ERR_NETWORK' || apiError.message?.includes('Network Error'))) {
    message = 'No se puede conectar al servidor. Verifica tu conexión o intenta más tarde.';
  }
  // Error de timeout
  else if (apiError.code === 'ECONNABORTED' || apiError.message?.includes('timeout')) {
    message = 'La solicitud tardó demasiado. Intenta nuevamente.';
  }
  // Error con respuesta del servidor
  else if (apiError.response?.data) {
    const responseData = apiError.response.data;
    
    // Detectar si la respuesta es HTML (página de error de Django)
    if (typeof responseData === 'string' && responseData.trim().startsWith('<!DOCTYPE html>')) {
      // Extraer el título del error si está disponible
      const titleMatch = responseData.match(/<title>(.*?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        const errorTitle = titleMatch[1].trim();
        // Limpiar el título del error
        if (errorTitle.includes('at /api/')) {
          const errorType = errorTitle.split(' at ')[0];
          message = `Error del servidor: ${errorType}. Contacta al administrador.`;
        } else {
          message = `Error del servidor: ${errorTitle}. Contacta al administrador.`;
        }
      } else {
        message = 'Error interno del servidor. Contacta al administrador.';
      }
    }
    // Manejo específico de errores JSON del backend
    else if (typeof responseData === 'object') {
      if (responseData.message) {
        message = responseData.message;
      } else if (responseData.detail) {
        message = responseData.detail;
      } else if (responseData.non_field_errors) {
        message = responseData.non_field_errors.join('. ');
      } else {
        // Errores de campo
        const fieldErrors = [];
        Object.entries(responseData).forEach(([, errors]) => {
          if (Array.isArray(errors)) {
            fieldErrors.push(...errors);
          } else if (typeof errors === 'string') {
            fieldErrors.push(errors);
          }
        });
        if (fieldErrors.length > 0) {
          message = fieldErrors.join('. ');
        }
      }
    } else if (typeof responseData === 'string' && !responseData.includes('<html>')) {
      // Solo usar strings que no sean HTML
      message = responseData;
    }
  } 
  // Error con código de estado pero sin data
  else if (apiError.response?.status) {
    switch (apiError.response.status) {
      case 400:
        message = 'Solicitud incorrecta. Verifica los datos enviados.';
        break;
      case 401:
        message = 'No tienes autorización. Por favor, inicia sesión nuevamente.';
        break;
      case 403:
        message = 'No tienes permisos para realizar esta acción.';
        break;
      case 404:
        message = 'El recurso solicitado no fue encontrado.';
        break;
      case 500:
        message = 'Error interno del servidor. Intenta más tarde.';
        break;
      case 502:
      case 503:
      case 504:
        message = 'El servidor no está disponible. Intenta más tarde.';
        break;
      default:
        message = `Error del servidor (${apiError.response.status}). Intenta más tarde.`;
    }
  }
  // Error genérico con mensaje
  else if (apiError.message) {
    message = apiError.message;
  }

  error(message);
  return message;
};

// Método para validaciones de formulario
export const validation = (fieldErrors) => {
  if (Array.isArray(fieldErrors)) {
    fieldErrors.forEach(err => error(err));
  } else if (typeof fieldErrors === 'object') {
    Object.entries(fieldErrors).forEach(([field, errors]) => {
      const errorList = Array.isArray(errors) ? errors : [errors];
      errorList.forEach(err => error(`${field}: ${err}`));
    });
  } else {
    error(fieldErrors);
  }
};

// Método para descartar notificaciones
export const dismiss = (toastId = null) => {
  if (toastId) {
    toast.dismiss(toastId);
  } else {
    toast.dismiss();
  }
};

// Método para promesas (automático success/error)
export const promise = (promiseToExecute, messages, options = {}) => {
  return toast.promise(
    promiseToExecute,
    {
      loading: messages.loading || 'Procesando...',
      success: messages.success || '¡Operación exitosa!',
      error: messages.error || 'Algo salió mal',
    },
    options
  );
};

// Exportar todo como default también
const notifications = {
  success,
  error,
  warning,
  info,
  loading,
  handleApiError,
  validation,
  dismiss,
  promise
};

export default notifications;
