import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Printer, FileText, Calendar, DollarSign, CreditCard, User, Mail, Phone, AlertCircle, Loader } from 'lucide-react';
import api from '../../services/api';
import { serviciosService } from '../../services';
import { error as showError, success as showSuccess } from '../../utils/notifications';
import { useAuth } from '../../context/AuthContext';

const PagoExitoso = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [comprobante, setComprobante] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const reservaId = searchParams.get('reserva_id');
  const tipoPago = searchParams.get('tipo') || 'sena';
  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const collectionStatus = searchParams.get('collection_status');
  const collectionId = searchParams.get('collection_id'); // Otro posible parámetro de MP
  const preferenceId = searchParams.get('preference_id');
  const externalReference = searchParams.get('external_reference');

  // Log de todos los parámetros para debug
  useEffect(() => {
    console.log('🔍 Parámetros recibidos de MercadoPago:');
    console.log('  - reserva_id:', reservaId);
    console.log('  - tipo:', tipoPago);
    console.log('  - payment_id:', paymentId);
    console.log('  - status:', status);
    console.log('  - collection_status:', collectionStatus);
    console.log('  - collection_id:', collectionId);
    console.log('  - preference_id:', preferenceId);
    console.log('  - external_reference:', externalReference);
    console.log('📝 Todos los parámetros:', Object.fromEntries(searchParams));
  }, [
    reservaId,
    tipoPago,
    paymentId,
    status,
    collectionStatus,
    collectionId,
    preferenceId,
    externalReference,
    searchParams
  ]);

  // Esperar a que el usuario se autentique antes de procesar el pago
  useEffect(() => {
    if (authLoading) {
      console.log('⏳ Esperando autenticación...');
      return; // Esperar a que termine de cargar la autenticación
    }

    if (!user) {
      console.log('⚠️ Usuario no autenticado, esperando...');
      // Dar un poco más de tiempo para que se autentique
      const timer = setTimeout(() => {
        if (!user) {
          setErrorMsg('Debes iniciar sesión para ver el comprobante de pago');
          setLoading(false);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }

    console.log('✅ Usuario autenticado:', user.email);
    
    if (!reservaId) {
      setErrorMsg('No se especificó el ID de la reserva');
      setLoading(false);
      return;
    }

    if (status === 'failure') {
      setErrorMsg('El pago fue rechazado. Por favor, intenta nuevamente.');
      setLoading(false);
      return;
    }

    if (status === 'pending' || collectionStatus === 'pending') {
      setErrorMsg('El pago está pendiente de confirmación. Te notificaremos cuando sea procesado.');
      setLoading(false);
      return;
    }

    const confirmarYCargarPago = async () => {
      try {
        setLoading(true);
        
        // Obtener el payment_id correcto (puede venir como payment_id o collection_id)
        const finalPaymentId = paymentId || collectionId;
        
        console.log('💳 Intentando confirmar pago con ID:', finalPaymentId);
        
        // Si tenemos payment_id, primero confirmar el pago en el backend
        if (finalPaymentId && (status === 'approved' || collectionStatus === 'approved')) {
          try {
            console.log(`🔄 Confirmando pago de ${tipoPago} para reserva ${reservaId}`);
            if (tipoPago === 'sena') {
              await serviciosService.confirmarPagoSena(reservaId, { payment_id: finalPaymentId });
              showSuccess('¡Pago de seña confirmado exitosamente!');
            } else if (tipoPago === 'final') {
              await serviciosService.confirmarPagoFinal(reservaId, { payment_id: finalPaymentId });
              showSuccess('¡Pago final confirmado exitosamente!');
            }
            console.log('✅ Pago confirmado exitosamente');
          } catch (err) {
            console.error('❌ Error al confirmar pago:', err);
            console.error('Detalles del error:', err.response?.data);
            // No bloquear si falla la confirmación, tal vez ya fue confirmado
            if (err.response?.status !== 400) {
              showError('Hubo un problema al confirmar el pago. Por favor contacta con soporte.');
            }
          }
        } else if (preferenceId || externalReference) {
          // Si no tenemos payment_id pero tenemos preference_id, intentar obtener el pago desde el backend
          console.log('⚠️ No hay payment_id, intentando buscar por preferencia:', preferenceId);
          try {
            const response = await api.post(`/mercadopago/reservas/${reservaId}/buscar-pago-por-preferencia/`, {
              preference_id: preferenceId,
              tipo_pago: tipoPago
            });
            
            if (response.data.payment_id) {
              console.log('✅ Pago encontrado:', response.data.payment_id);
              showSuccess('¡Pago confirmado exitosamente!');
            }
          } catch (err) {
            console.error('❌ Error al buscar pago por preferencia:', err);
          }
        } else {
          console.warn('⚠️ No se pudo confirmar el pago: faltan parámetros o estado no aprobado');
          console.warn('  - finalPaymentId:', finalPaymentId);
          console.warn('  - status:', status);
          console.warn('  - collectionStatus:', collectionStatus);
        }
        
        // Esperar un poco para que el backend procese
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Cargar comprobante
        console.log('📄 Cargando comprobante...');
        const response = await api.get(
          `/servicios/reservas/${reservaId}/comprobante-pago/`,
          { params: { tipo: tipoPago } }
        );
        console.log('✅ Comprobante cargado:', response.data);
        setComprobante(response.data);
      } catch (err) {
        console.error('❌ Error al cargar comprobante:', err);
        console.error('Detalles del error:', err.response?.data);
        const mensaje = err.response?.data?.error || 'Error al cargar el comprobante de pago';
        setErrorMsg(mensaje);
        showError(mensaje);
      } finally {
        setLoading(false);
      }
    };

    // Esperar 2 segundos antes de cargar (para dar más tiempo a MP)
    const timer = setTimeout(() => {
      confirmarYCargarPago();
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    authLoading,
    collectionId,
    collectionStatus,
    externalReference,
    navigate,
    paymentId,
    preferenceId,
    reservaId,
    status,
    tipoPago,
    user
  ]);

  const handlePrint = () => {
    window.print();
  };

  const handleGoToReservas = () => {
    navigate('/mis-reservas');
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatearMonto = (monto) => {
    if (!monto) return '$0.00';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(monto);
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      'aprobado': 'bg-green-100 text-green-800',
      'pendiente': 'bg-yellow-100 text-yellow-800',
      'rechazado': 'bg-red-100 text-red-800'
    };
    return badges[estado] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Loader className="w-16 h-16 mx-auto mb-4 text-green-600 animate-spin" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Procesando tu pago...
          </h2>
          <p className="text-gray-600">
            Estamos verificando la información de tu pago. Por favor espera un momento.
          </p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {status === 'failure' ? 'Pago Rechazado' : status === 'pending' ? 'Pago Pendiente' : 'Error'}
            </h2>
            <p className="text-gray-600">{errorMsg}</p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleGoToReservas}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Ver Mis Reservas
            </button>
            {status === 'failure' && reservaId && (
              <button
                onClick={() => navigate(`/solicitar-servicio?reserva=${reservaId}`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Reintentar Pago
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!comprobante) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header de éxito */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 text-center">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ¡Pago Exitoso!
          </h1>
          <p className="text-gray-600 text-lg">
            Tu pago de {tipoPago === 'sena' ? 'seña' : 'saldo final'} ha sido procesado correctamente
          </p>
        </div>

        {/* Comprobante de Pago */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none" id="comprobante">
          {/* Header del comprobante */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">Comprobante de Pago</h2>
                <p className="text-green-100">
                  {tipoPago === 'sena' ? 'Seña de Reserva' : 'Pago Final'}
                </p>
              </div>
              <FileText className="w-12 h-12 opacity-80" />
            </div>
          </div>

          {/* Información del Pago */}
          <div className="p-6 space-y-6">
            {/* Detalles de la transacción */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                Detalles de la Transacción
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Monto Pagado</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatearMonto(comprobante.monto)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Estado</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getEstadoBadge(comprobante.estado)}`}>
                    {comprobante.estado.charAt(0).toUpperCase() + comprobante.estado.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Fecha de Pago</p>
                  <p className="text-gray-800 font-medium flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    {formatearFecha(comprobante.fecha_pago)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">ID de Transacción</p>
                  <p className="text-gray-800 font-mono text-sm">
                    {comprobante.payment_id || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Información adicional de MercadoPago */}
              {comprobante.pago_info && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <CreditCard className="w-4 h-4 mr-2 text-blue-600" />
                    Detalles del Método de Pago
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {comprobante.pago_info.metodo_pago && (
                      <div>
                        <p className="text-gray-600">Método</p>
                        <p className="font-medium text-gray-800">{comprobante.pago_info.metodo_pago}</p>
                      </div>
                    )}
                    {comprobante.pago_info.ultimos_digitos && (
                      <div>
                        <p className="text-gray-600">Tarjeta</p>
                        <p className="font-medium text-gray-800">**** {comprobante.pago_info.ultimos_digitos}</p>
                      </div>
                    )}
                    {comprobante.pago_info.cuotas && (
                      <div>
                        <p className="text-gray-600">Cuotas</p>
                        <p className="font-medium text-gray-800">{comprobante.pago_info.cuotas}x</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Información del Cliente */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-green-600" />
                Información del Cliente
              </h3>
              <div className="space-y-2">
                <p className="text-gray-800">
                  <span className="font-semibold">Nombre:</span> {comprobante.cliente.nombre}
                </p>
                <p className="text-gray-800 flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-gray-500" />
                  {comprobante.cliente.email}
                </p>
                {comprobante.cliente.telefono && (
                  <p className="text-gray-800 flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-gray-500" />
                    {comprobante.cliente.telefono}
                  </p>
                )}
              </div>
            </div>

            {/* Información del Servicio */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-green-600" />
                Detalles del Servicio
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold text-gray-800 mb-2">
                  {comprobante.servicio.nombre}
                </p>
                <p className="text-gray-600 text-sm">
                  {comprobante.servicio.descripcion}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Reserva #{comprobante.reserva_id}
                </p>
              </div>
            </div>

            {/* Nota informativa */}
            {tipoPago === 'sena' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Nota:</span> Has pagado la seña de tu reserva. 
                  El saldo restante deberá ser abonado una vez que nuestro diseñador presente la propuesta 
                  y sea aceptada por ti.
                </p>
              </div>
            )}
          </div>

          {/* Footer del comprobante */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <p className="text-xs text-gray-500 text-center">
              Este es un comprobante electrónico. Conservalo para tus registros.
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-lg border-2 border-gray-300 transition-colors duration-200 flex items-center justify-center"
          >
            <Printer className="w-5 h-5 mr-2" />
            Imprimir Comprobante
          </button>
          <button
            onClick={handleGoToReservas}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Ver Mis Reservas
          </button>
        </div>
      </div>
    </div>
  );
};

export default PagoExitoso;
