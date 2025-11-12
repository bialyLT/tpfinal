import { serviciosService } from '../services';
import { error as showError } from './notifications';

/**
 * Función general para manejar el pago de seña de una reserva
 * Crea una preferencia de pago en MercadoPago y redirige al usuario
 * 
 * @param {number|string} reservaId - ID de la reserva
 * @param {Function} setProcesandoPago - Función para actualizar el estado de procesamiento (opcional)
 * @returns {Promise<void>}
 */

export const handlePagarSena = async (servicioId, setProcesandoPago = null) => {
    try {
      // Activar estado de procesamiento si se proporcionó la función
      if (setProcesandoPago) {
        setProcesandoPago(true);
      }

      // Llamar al servicio correspondiente según el tipo de pago
      let response;
      response = await serviciosService.crearPreferenciaSena(servicioId);
      
      if (response && response.init_point) {
        // Redirigir a MercadoPago
        window.location.href = response.init_point;
      } else {
        showError('No se pudo obtener el enlace de pago');
      }
    } catch (error) {
      showError('Error al procesar el pago');
      console.error(error);
    } finally {
      setProcesandoPago(false);
    }
  };

  export const handlePagarFinal = async (servicioId, setProcesandoPago = null) => {
    try {
      // Activar estado de procesamiento si se proporcionó la función
      if (setProcesandoPago) {
        setProcesandoPago(true);
      }
      // Llamar al servicio correspondiente según el tipo de pago
      let response;
      response = await serviciosService.crearPreferenciaFinal(servicioId);
      if (response && response.init_point) {
        // Redirigir a MercadoPago
        window.location.href = response.init_point;
      } else {
        showError('No se pudo obtener el enlace de pago');
      }
    } catch (error) {
      showError('Error al procesar el pago');
      console.error(error);
    } finally {
      setProcesandoPago(false);
    }
  };