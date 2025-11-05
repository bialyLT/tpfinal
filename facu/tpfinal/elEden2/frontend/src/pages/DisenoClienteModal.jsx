import React, { useState, useEffect } from 'react';
import { X, Calendar, User, DollarSign, CheckCircle, XCircle, Clock, Package, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { serviciosService } from '../services';
import { handleApiError, success } from '../utils/notifications';

const DisenoClienteModal = ({ isOpen, onClose, reservaId, onDisenoActualizado }) => {
  const [disenos, setDisenos] = useState([]);
  const [disenoActual, setDisenoActual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showReagendamientoModal, setShowReagendamientoModal] = useState(false);
  const [reagendamientoData, setReagendamientoData] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [cancelarServicio, setCancelarServicio] = useState(false);

  useEffect(() => {
    if (isOpen && reservaId) {
      fetchDisenos();
    }
  }, [isOpen, reservaId]);

  const fetchDisenos = async () => {
    try {
      setLoading(true);
      // Obtener todos los diseños del cliente
      const response = await serviciosService.getDisenos();
      const disenosData = response.results || response;
      
      // Filtrar los diseños de esta reserva
      const disenosReserva = disenosData.filter(d => d.reserva === reservaId || d.reserva_id === reservaId);
      
      // Ordenar por fecha de creación (más reciente primero)
      disenosReserva.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
      
      setDisenos(disenosReserva);
      
      // El diseño actual es el primero que esté en estado 'presentado'
      const presentado = disenosReserva.find(d => d.estado === 'presentado');
      if (presentado) {
        // Obtener detalles completos del diseño
        const detalles = await serviciosService.getDisenoById(presentado.id_diseno);
        setDisenoActual(detalles);
      } else {
        setDisenoActual(null);
      }
    } catch (error) {
      handleApiError(error, 'Error al cargar los diseños');
    } finally {
      setLoading(false);
    }
  };

  const handleAceptar = async () => {
    if (!disenoActual) return;
    
    try {
      setProcesando(true);
      const response = await serviciosService.aceptarDisenoCliente(disenoActual.id_diseno, {
        feedback: observaciones || 'Diseño aceptado por el cliente',
        observaciones: observaciones || 'Diseño aceptado por el cliente'
      });
      
      // Verificar si requiere reagendamiento por falta de stock
      if (response.requiere_reagendamiento) {
        setReagendamientoData(response);
        setShowReagendamientoModal(true);
        setProcesando(false);
        return;
      }
      
      success('¡Diseño aceptado! El servicio comenzará pronto.');
      if (onDisenoActualizado) onDisenoActualizado();
      onClose();
    } catch (error) {
      // Error 409 indica conflicto por stock
      if (error.response && error.response.status === 409) {
        const data = error.response.data;
        setReagendamientoData(data);
        setShowReagendamientoModal(true);
      } else {
        handleApiError(error, 'Error al aceptar el diseño');
      }
    } finally {
      setProcesando(false);
    }
  };

  const handleAceptarReagendamiento = async () => {
    if (!disenoActual || !reagendamientoData) return;
    
    try {
      setProcesando(true);
      await serviciosService.aceptarDisenoCliente(disenoActual.id_diseno, {
        feedback: observaciones || 'Diseño aceptado con reagendamiento por falta de stock',
        observaciones: observaciones || 'Diseño aceptado con reagendamiento',
        acepta_reagendamiento: true,
        nueva_fecha: reagendamientoData.fecha_propuesta
      });
      
      success('¡Diseño aceptado! El servicio se realizará en la nueva fecha.');
      setShowReagendamientoModal(false);
      if (onDisenoActualizado) onDisenoActualizado();
      onClose();
    } catch (error) {
      handleApiError(error, 'Error al aceptar el reagendamiento');
    } finally {
      setProcesando(false);
    }
  };

  const handleRechazarReagendamiento = () => {
    setShowReagendamientoModal(false);
    setCancelarServicio(true);
    setShowFeedbackModal(true);
  };

  const handleRechazar = () => {
    setShowFeedbackModal(true);
  };

  const handleEnviarRechazo = async () => {
    if (!disenoActual || !feedback.trim()) {
      handleApiError({ message: 'Por favor ingresa un motivo para el rechazo' });
      return;
    }

    try {
      setProcesando(true);
      await serviciosService.rechazarDisenoCliente(disenoActual.id_diseno, {
        feedback: feedback,
        cancelar_servicio: cancelarServicio
      });
      
      if (cancelarServicio) {
        success('Diseño rechazado y servicio cancelado.');
      } else {
        success('Diseño rechazado. El empleado recibirá tu feedback para crear un nuevo diseño.');
      }
      
      setShowFeedbackModal(false);
      setFeedback('');
      setCancelarServicio(false);
      if (onDisenoActualizado) onDisenoActualizado();
      onClose();
    } catch (error) {
      handleApiError(error, 'Error al rechazar el diseño');
    } finally {
      setProcesando(false);
    }
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      'presentado': { color: 'bg-blue-600', icon: Clock, text: 'Pendiente de Aprobación' },
      'aceptado': { color: 'bg-green-600', icon: CheckCircle, text: 'Aceptado' },
      'rechazado': { color: 'bg-red-600', icon: XCircle, text: 'Rechazado' },
      'borrador': { color: 'bg-yellow-600', icon: Clock, text: 'En Desarrollo' },
      'revision': { color: 'bg-orange-600', icon: AlertCircle, text: 'En Revisión' }
    };
    
    const badge = badges[estado] || badges['borrador'];
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color} text-white`}>
        <Icon className="w-4 h-4 mr-1" />
        {badge.text}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center z-10">
            <h2 className="text-2xl font-bold text-white">Propuesta de Diseño</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-400">Cargando diseños...</p>
              </div>
            ) : disenoActual ? (
              <>
                {/* Diseño Actual */}
                <div className="bg-gray-900 rounded-lg p-6 mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-2">Propuesta de Diseño</h3>
                      <p className="text-gray-300 whitespace-pre-wrap">{disenoActual.descripcion}</p>
                    </div>
                    <div className="ml-4">
                      {getEstadoBadge(disenoActual.estado)}
                    </div>
                  </div>

                  {/* Fecha Propuesta */}
                  <div className="mb-6 bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center">
                      <Calendar className="w-5 h-5 text-purple-400 mr-2" />
                      <div>
                        <p className="text-gray-400 text-sm">Fecha Propuesta para el Servicio</p>
                        <p className="text-white font-semibold text-lg">
                          {disenoActual.fecha_propuesta 
                            ? new Date(disenoActual.fecha_propuesta).toLocaleString('es-AR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'No definida'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Imágenes del diseño */}
                  {disenoActual.imagenes && disenoActual.imagenes.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                        <ImageIcon className="w-5 h-5 mr-2" />
                        Imágenes del Diseño
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {disenoActual.imagenes.map((imagen) => (
                          <div key={imagen.id_imagen_diseno} className="bg-gray-800 rounded-lg overflow-hidden">
                            <img
                              src={imagen.imagen_url}
                              alt={imagen.descripcion || 'Imagen del diseño'}
                              className="w-full h-48 object-cover"
                            />
                            {imagen.descripcion && (
                              <div className="p-2">
                                <p className="text-sm text-gray-400">{imagen.descripcion}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Productos del diseño */}
                  {disenoActual.productos && disenoActual.productos.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                        <Package className="w-5 h-5 mr-2" />
                        Productos Incluidos
                      </h4>
                      <div className="space-y-3">
                        {disenoActual.productos.map((producto) => {
                          const cantidad = parseInt(producto.cantidad) || 0;
                          const precioUnitario = parseFloat(producto.precio_unitario) || 0;
                          const subtotal = cantidad * precioUnitario;
                          
                          return (
                            <div key={producto.id_diseno_producto} className="bg-gray-800 rounded-lg p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <p className="text-white font-semibold text-lg">{producto.producto_nombre}</p>
                                  {producto.producto_codigo && (
                                    <p className="text-xs text-gray-400 mt-1">Código: {producto.producto_codigo}</p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-gray-700">
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">Cantidad</p>
                                  <p className="text-white font-medium">{cantidad} unidad{cantidad !== 1 ? 'es' : ''}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">Precio Unitario</p>
                                  <p className="text-white font-medium">${precioUnitario.toFixed(2)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-400 mb-1">Subtotal</p>
                                  <p className="text-green-400 font-bold text-lg">${subtotal.toFixed(2)}</p>
                                </div>
                              </div>
                              
                              {producto.notas && (
                                <div className="mt-3 pt-3 border-t border-gray-700">
                                  <p className="text-xs text-gray-400 mb-1">Notas</p>
                                  <p className="text-gray-300 text-sm">{producto.notas}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Desglose de Costos */}
                      <div className="mt-4 bg-gray-800 rounded-lg p-4 space-y-3">
                        {/* Subtotal Productos */}
                        <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                          <span className="text-gray-300 font-medium">Subtotal Productos:</span>
                          <span className="text-white font-bold text-lg">
                            ${disenoActual.productos.reduce((total, prod) => {
                              const cantidad = parseInt(prod.cantidad) || 0;
                              const precio = parseFloat(prod.precio_unitario) || 0;
                              return total + (cantidad * precio);
                            }, 0).toFixed(2)}
                          </span>
                        </div>
                        
                        {/* Costo de Mano de Obra */}
                        <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                          <div className="flex items-center">
                            <DollarSign className="w-5 h-5 mr-2 text-blue-400" />
                            <span className="text-gray-300 font-medium">Mano de Obra:</span>
                          </div>
                          <span className="text-white font-bold text-lg">
                            ${Math.max(0, (parseFloat(disenoActual.presupuesto) || 0) - disenoActual.productos.reduce((total, prod) => {
                              const cantidad = parseInt(prod.cantidad) || 0;
                              const precio = parseFloat(prod.precio_unitario) || 0;
                              return total + (cantidad * precio);
                            }, 0)).toFixed(2)}
                          </span>
                        </div>
                        
                        {/* Total de la Propuesta */}
                        <div className="pt-3 bg-gradient-to-r from-gray-700 to-gray-600 rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <DollarSign className="w-6 h-6 mr-2 text-green-400" />
                              <span className="text-white font-bold text-lg">TOTAL DE LA PROPUESTA:</span>
                            </div>
                            <span className="text-green-400 font-bold text-2xl">
                              ${parseFloat(disenoActual.presupuesto).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Observaciones del cliente */}
                  {disenoActual.estado === 'presentado' && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Observaciones (opcional)
                      </label>
                      <textarea
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows="3"
                        placeholder="Agrega cualquier comentario sobre el diseño..."
                      />
                    </div>
                  )}

                  {/* Botones de acción */}
                  {disenoActual.estado === 'presentado' && (
                    <div className="flex gap-4">
                      <button
                        onClick={handleAceptar}
                        disabled={procesando}
                        className="flex-1 flex items-center justify-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        {procesando ? 'Procesando...' : 'Aceptar Diseño'}
                      </button>
                      <button
                        onClick={handleRechazar}
                        disabled={procesando}
                        className="flex-1 flex items-center justify-center px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-5 h-5 mr-2" />
                        Rechazar Diseño
                      </button>
                    </div>
                  )}
                </div>

                {/* Diseños anteriores */}
                {disenos.length > 1 && (
                  <div>
                    <h3 className="text-xl font-bold text-white mb-4">Propuestas Anteriores</h3>
                    <div className="space-y-4">
                      {disenos.slice(1).map((diseno) => (
                        <div key={diseno.id_diseno} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-lg font-semibold text-white">{diseno.titulo}</h4>
                              <p className="text-gray-400 text-sm mt-1">{diseno.descripcion}</p>
                              <p className="text-gray-500 text-xs mt-2">
                                Creado el {new Date(diseno.fecha_creacion).toLocaleDateString()}
                              </p>
                            </div>
                            {getEstadoBadge(diseno.estado)}
                          </div>
                          {diseno.observaciones_cliente && (
                            <div className="mt-3 p-3 bg-gray-800 rounded">
                              <p className="text-gray-400 text-sm">
                                <strong>Tu feedback:</strong> {diseno.observaciones_cliente}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No hay diseños para aprobar</h3>
                <p className="text-gray-400">
                  El equipo está trabajando en tu diseño. Te notificaremos cuando esté listo para revisión.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Feedback para rechazo */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[60]">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                {cancelarServicio ? '¿Por qué cancelas el servicio?' : '¿Por qué rechazas este diseño?'}
              </h3>
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  setCancelarServicio(false);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400 mb-4">
              {cancelarServicio 
                ? 'Por favor cuéntanos el motivo de la cancelación.'
                : 'Tu feedback ayudará al diseñador a crear una propuesta que se ajuste mejor a tus expectativas.'
              }
            </p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              rows="4"
              placeholder={cancelarServicio 
                ? "Ejemplo: No puedo aceptar el reagendamiento, la fecha no me sirve..."
                : "Ejemplo: Me gustaría más plantas nativas, el presupuesto es muy alto, prefiero un estilo más moderno..."
              }
              required
            />
            {!cancelarServicio && (
              <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  El diseño será rechazado y el empleado creará una nueva propuesta basada en tu feedback.
                </p>
              </div>
            )}
            {cancelarServicio && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
                <p className="text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  El servicio será cancelado completamente.
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  setCancelarServicio(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Volver
              </button>
              <button
                onClick={handleEnviarRechazo}
                disabled={procesando || !feedback.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {procesando ? 'Enviando...' : cancelarServicio ? 'Cancelar Servicio' : 'Enviar Rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reagendamiento por falta de stock */}
      {showReagendamientoModal && reagendamientoData && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[60]">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <AlertCircle className="w-6 h-6 mr-2 text-yellow-400" />
                Stock Insuficiente - Reagendamiento Necesario
              </h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                {reagendamientoData.mensaje}
              </p>
              
              {/* Productos faltantes */}
              <div className="bg-gray-900 rounded-lg p-4 mb-4">
                <h4 className="text-white font-semibold mb-3 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-red-400" />
                  Productos sin stock suficiente:
                </h4>
                <div className="space-y-2">
                  {reagendamientoData.productos_faltantes.map((prod, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-gray-300">{prod.producto} (ID: {prod.id_producto})</span>
                      <span className="text-red-400">
                        Faltan: {prod.faltante} unidad{prod.faltante > 1 ? 'es' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Información de fechas */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-900 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Fecha Original</p>
                  <p className="text-white font-semibold">
                    {new Date(reagendamientoData.fecha_actual).toLocaleString('es-AR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Nueva Fecha Propuesta</p>
                  <p className="text-green-400 font-semibold">
                    {new Date(reagendamientoData.fecha_propuesta).toLocaleString('es-AR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-green-300 text-xs mt-1">
                    +{reagendamientoData.tiempo_espera_dias} días de espera para reabastecimiento
                  </p>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                <p className="text-blue-300 text-sm">
                  <strong>Nota:</strong> Este tiempo permitirá reabastecer el stock de los productos necesarios para tu servicio.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRechazarReagendamiento}
                disabled={procesando}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                No Acepto - Cancelar Servicio
              </button>
              <button
                onClick={handleAceptarReagendamiento}
                disabled={procesando}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {procesando ? 'Procesando...' : 'Acepto Nueva Fecha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DisenoClienteModal;
