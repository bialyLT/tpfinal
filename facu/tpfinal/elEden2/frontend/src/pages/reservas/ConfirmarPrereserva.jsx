import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { serviciosService } from '../../services';
import { success, error as showError } from '../../utils/notifications';

// Variable global para prevenir múltiples ejecuciones entre montajes de componentes
// (Útil para React StrictMode que monta/desmonta componentes en desarrollo)
const globalLock = {
  processing: false,
  timestamp: null,
  reservaId: null
};

const ConfirmarPrereserva = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);
  // Usar useRef en lugar de useState para evitar re-renders
  const isProcessingRef = useRef(false);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // Prevenir ejecuciones múltiples - nivel 1: dentro del mismo componente
    if (hasProcessedRef.current || isProcessingRef.current) {
      console.log('⚠️ Ya se está procesando esta confirmación (ref local), saliendo...');
      return;
    }

    // Prevenir ejecuciones múltiples - nivel 2: entre montajes de componentes
    const reservaId = searchParams.get('reserva_id');
    const now = Date.now();
    
    if (globalLock.processing && 
        globalLock.reservaId === reservaId && 
        globalLock.timestamp && 
        (now - globalLock.timestamp) < 60000) {
      console.log('⚠️ Confirmación ya en proceso globalmente para reserva', reservaId, 
                  '(hace', Math.round((now - globalLock.timestamp) / 1000), 'segundos), saliendo...');
      return;
    }

    // Marcar como procesando
    isProcessingRef.current = true;
    hasProcessedRef.current = true;
    globalLock.processing = true;
    globalLock.timestamp = now;
    globalLock.reservaId = reservaId;
    
    const confirmarReserva = async () => {
      // Marcar como procesando INMEDIATAMENTE
      if (isProcessingRef.current) {
        console.log('⚠️ Ya hay un proceso en curso, abortando duplicado...');
        return;
      }
      
      isProcessingRef.current = true;
      hasProcessedRef.current = true;
      
      try {
        // Verificar que haya token de autenticación
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.error('❌ No hay token de autenticación');
          showError('Sesión expirada. Por favor, inicia sesión nuevamente.');
          // Guardar la URL actual para redirigir después del login
          localStorage.setItem('redirectAfterLogin', window.location.href);
          navigate('/login');
          return;
        }
        
        console.log('🔵 ==========================================');
        console.log('🔵 CONFIRMANDO PRE-RESERVA - INICIO');
        console.log('🔵 ==========================================');
        console.log('🔵 URL completa:', window.location.href);
        console.log('🔵 Search params:', window.location.search);
        
        // Log de TODOS los parámetros
        const allParams = {};
        for (const [key, value] of searchParams.entries()) {
          allParams[key] = value;
        }
        console.log('🔍 TODOS los parámetros URL:', JSON.stringify(allParams, null, 2));
        
        // Obtener datos de la URL - MEJORADO para capturar todos los posibles nombres
        const paymentId = searchParams.get('payment_id') || 
                         searchParams.get('collection_id') || 
                         searchParams.get('payment_method_id') ||
                         searchParams.get('merchant_order_id');
        const status = searchParams.get('status') || searchParams.get('collection_status');
        const collectionStatus = searchParams.get('collection_status');
        const reservaId = searchParams.get('reserva_id');
        const externalReference = searchParams.get('external_reference');
        const preferenceId = searchParams.get('preference_id');

        console.log('💳 Payment ID (raw):', paymentId);
        console.log('💳 payment_id param:', searchParams.get('payment_id'));
        console.log('💳 collection_id param:', searchParams.get('collection_id'));
        console.log('💳 merchant_order_id param:', searchParams.get('merchant_order_id'));
        console.log('📊 Status:', status);
        console.log('📊 Collection Status:', collectionStatus);
        console.log('📋 Reserva ID:', reservaId);
        console.log('🔗 External Reference:', externalReference);
        console.log('🎫 Preference ID:', preferenceId);

        // CRÍTICO: Validar que el pago sea exitoso ANTES de intentar confirmar
        console.log('🔍 Validando estado del pago...');
        console.log('   Status recibido:', status);
        console.log('   Collection Status:', collectionStatus);
        
        if (status !== 'approved' && collectionStatus !== 'approved') {
          console.error('❌ Pago no aprobado:', { status, collectionStatus });
          showError('El pago no fue aprobado');
          navigate('/servicios');
          return;
        }
        
        console.log('✅ Pago aprobado, continuando...');

        if (!reservaId) {
          console.error('❌ No se recibió reserva_id en la URL');
          showError('No se recibió el ID de reserva');
          navigate('/servicios');
          return;
        }
        
        console.log('✅ Reserva ID validado:', reservaId);

        // Si NO hay payment_id, esperar más tiempo para que MercadoPago lo registre
        if (!paymentId) {
          console.warn('⚠️ No se recibió payment_id inmediatamente');
          console.log('⏳ Esperando 5 segundos adicionales para que MercadoPago registre el pago...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Recargar la página para obtener los parámetros actualizados
          console.log('🔄 Recargando página para obtener payment_id actualizado...');
          window.location.reload();
          return;
        }
        
        console.log('✅ Payment ID validado:', paymentId);

        // Usar el MISMO endpoint que funciona para el pago de seña desde el modal
        console.log('📤 Enviando confirmación de pago al backend...');

        // Llamar al endpoint confirmar_pago_sena (el que funciona perfectamente)
        const response = await serviciosService.confirmarPagoSena(reservaId, {
          payment_id: paymentId
        });

        console.log('✅ Respuesta del backend:', response);

        success('¡Pago de seña confirmado exitosamente!');
        
        // Redirigir a la página de éxito con los mismos parámetros
        setTimeout(() => {
          navigate(`/reservas/pago-exitoso?tipo=sena&reserva_id=${reservaId}&payment_id=${paymentId}&status=approved`);
        }, 1000);

      } catch (err) {
        console.error('❌ Error al confirmar reserva:', err);
        
        const errorMessage = err.response?.data?.error || 
          'No pudimos confirmar tu pago en este momento. Tu reserva fue cancelada, pero tu pago está seguro. Por favor, intenta nuevamente o contacta con soporte.';
        
        showError(errorMessage);
        
        setTimeout(() => {
          navigate('/servicios');
        }, 2000);
      } finally {
        setProcessing(false);
      }
    };

    confirmarReserva();
  }, []); // Ejecutar SOLO una vez al montar el componente

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="text-center bg-white p-8 rounded-lg shadow-xl max-w-md">
        <Loader className="w-16 h-16 animate-spin mx-auto mb-4 text-green-600" />
        <h2 className="text-2xl font-bold mb-2 text-gray-800">Procesando tu reserva...</h2>
        <p className="text-gray-600">Por favor espera mientras confirmamos tu pago</p>
        <div className="mt-4 flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarPrereserva;
