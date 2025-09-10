// Test simple para verificar si las notificaciones funcionan
import { success, error, handleApiError } from '../utils/notifications';

// Test básico - ejecutar en consola del navegador
window.testNotifications = () => {
  console.log('🧪 Probando sistema de notificaciones...');
  
  // Test 1: Mensaje de éxito
  success('✅ Test de éxito funcionando');
  
  // Test 2: Mensaje de error
  setTimeout(() => {
    error('❌ Test de error funcionando');
  }, 1000);
  
  // Test 3: Simulación de error de red
  setTimeout(() => {
    const fakeNetworkError = {
      code: 'ERR_NETWORK',
      message: 'Network Error'
    };
    handleApiError(fakeNetworkError, 'Test de error de red');
  }, 2000);
  
  // Test 4: Simulación de error del servidor
  setTimeout(() => {
    const fakeServerError = {
      response: {
        status: 500,
        data: {
          detail: 'Error interno del servidor'
        }
      }
    };
    handleApiError(fakeServerError, 'Test de error del servidor');
  }, 3000);
  
  console.log('🧪 Tests programados. Deberías ver 4 notificaciones en los próximos 3 segundos.');
};

export default window.testNotifications;
