import React, { useState, useEffect } from 'react';
import { serviciosService } from '../services';
import { handleApiError, success } from '../utils/notifications';
import { 
  Palette, Eye, CheckCircle, XCircle, 
  Calendar, DollarSign, Package, 
  Image as ImageIcon, AlertCircle
} from 'lucide-react';

const MisDisenosPage = () => {
  const [disenos, setDisenos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiseno, setSelectedDiseno] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchDisenos();
  }, []);

  const fetchDisenos = async () => {
    try {
      setLoading(true);
      const data = await serviciosService.getDisenos();
      setDisenos(data.results || data);
    } catch (error) {
      handleApiError(error, 'Error al cargar los diseños');
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = async (disenoId) => {
    try {
      const data = await serviciosService.getDisenoById(disenoId);
      setSelectedDiseno(data);
      setShowModal(true);
    } catch (error) {
      handleApiError(error, 'Error al cargar el diseño');
    }
  };

  const handleAceptarDiseno = async () => {
    if (!selectedDiseno) return;
    
    try {
      setActionLoading(true);
      await serviciosService.aceptarDisenoCliente(selectedDiseno.id_diseno);
      success('¡Diseño aceptado! Su servicio pasó a estado "En Curso"');
      setShowModal(false);
      setSelectedDiseno(null);
      fetchDisenos(); // Recargar la lista
    } catch (error) {
      handleApiError(error, 'Error al aceptar el diseño');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRechazarClick = () => {
    setShowModal(false);
    setShowFeedbackModal(true);
  };

  const handleRechazarDiseno = async () => {
    if (!selectedDiseno) return;
    
    try {
      setActionLoading(true);
      await serviciosService.rechazarDisenoCliente(selectedDiseno.id_diseno, feedback);
      success('Diseño rechazado. La reserva volvió a estado pendiente.');
      setShowFeedbackModal(false);
      setSelectedDiseno(null);
      setFeedback('');
      fetchDisenos(); // Recargar la lista
    } catch (error) {
      handleApiError(error, 'Error al rechazar el diseño');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const getEstadoColor = (estado) => {
    const colors = {
      'borrador': 'bg-gray-500',
      'presentado': 'bg-blue-500',
      'aceptado': 'bg-green-500',
      'rechazado': 'bg-red-500',
      'revision': 'bg-yellow-500',
    };
    return colors[estado] || 'bg-gray-500';
  };

  const getEstadoLabel = (estado) => {
    const labels = {
      'borrador': 'Borrador',
      'presentado': 'Pendiente de tu aprobación',
      'aceptado': 'Aceptado',
      'rechazado': 'Rechazado',
      'revision': 'En Revisión',
    };
    return labels[estado] || estado;
  };

  // Filtrar diseños presentados (pendientes de aprobación)
  const disenosPendientes = disenos.filter(d => d.estado === 'presentado');
  const disenosAceptados = disenos.filter(d => d.estado === 'aceptado');
  const disenosRechazados = disenos.filter(d => d.estado === 'rechazado');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-400"></div>
          <p className="text-gray-300 mt-4">Cargando diseños...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Palette className="w-8 h-8 mr-3 text-green-400" />
            Mis Diseños de Jardín
          </h1>
          <p className="text-gray-400 mt-1">
            Revisa las propuestas de diseño para tus servicios solicitados
          </p>
        </div>

        {/* Alert de diseños pendientes */}
        {disenosPendientes.length > 0 && (
          <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-400 mr-3 mt-0.5" />
              <div>
                <h3 className="text-blue-400 font-semibold">
                  Tienes {disenosPendientes.length} diseño{disenosPendientes.length > 1 ? 's' : ''} pendiente{disenosPendientes.length > 1 ? 's' : ''} de aprobación
                </h3>
                <p className="text-blue-300 text-sm mt-1">
                  Por favor revisa y decide si aceptas o rechazas la propuesta de diseño.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pendientes</p>
                <p className="text-2xl font-bold text-blue-400">{disenosPendientes.length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Aceptados</p>
                <p className="text-2xl font-bold text-green-400">{disenosAceptados.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Rechazados</p>
                <p className="text-2xl font-bold text-red-400">{disenosRechazados.length}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Diseños Pendientes de Aprobación */}
        {disenosPendientes.length > 0 && (
          <div className="bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <AlertCircle className="w-6 h-6 mr-2 text-blue-400" />
              Pendientes de Aprobación
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {disenosPendientes.map((diseno) => (
                <DisenoCard 
                  key={diseno.id_diseno} 
                  diseno={diseno}
                  onVerDetalle={handleVerDetalle}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  getEstadoColor={getEstadoColor}
                  getEstadoLabel={getEstadoLabel}
                  isPendiente={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Otros Diseños */}
        {(disenosAceptados.length > 0 || disenosRechazados.length > 0) && (
          <div className="bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-white mb-4">Historial de Diseños</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...disenosAceptados, ...disenosRechazados].map((diseno) => (
                <DisenoCard 
                  key={diseno.id_diseno} 
                  diseno={diseno}
                  onVerDetalle={handleVerDetalle}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  getEstadoColor={getEstadoColor}
                  getEstadoLabel={getEstadoLabel}
                  isPendiente={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sin diseños */}
        {disenos.length === 0 && (
          <div className="bg-gray-800 rounded-lg shadow p-12 text-center">
            <Palette className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              No tienes diseños aún
            </h3>
            <p className="text-gray-500">
              Los diseños propuestos para tus servicios aparecerán aquí.
            </p>
          </div>
        )}

        {/* Modal de Detalle */}
        {showModal && selectedDiseno && (
          <DisenoDetalleModal
            diseno={selectedDiseno}
            onClose={() => {
              setShowModal(false);
              setSelectedDiseno(null);
            }}
            onAceptar={handleAceptarDiseno}
            onRechazar={handleRechazarClick}
            loading={actionLoading}
            formatCurrency={formatCurrency}
          />
        )}

        {/* Modal de Feedback al Rechazar */}
        {showFeedbackModal && selectedDiseno && (
          <FeedbackModal
            onClose={() => {
              setShowFeedbackModal(false);
              setFeedback('');
            }}
            onSubmit={handleRechazarDiseno}
            feedback={feedback}
            setFeedback={setFeedback}
            loading={actionLoading}
          />
        )}
      </div>
    </div>
  );
};

// Componente de tarjeta de diseño
const DisenoCard = ({ diseno, onVerDetalle, formatCurrency, formatDate, getEstadoColor, getEstadoLabel, isPendiente }) => {
  return (
    <div className={`bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors ${isPendiente ? 'border-2 border-blue-500' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">{diseno.titulo}</h3>
          <p className="text-sm text-gray-400">#{diseno.id_diseno}</p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getEstadoColor(diseno.estado)}`}>
          {getEstadoLabel(diseno.estado)}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-300">
          <DollarSign className="w-4 h-4 mr-2 text-green-400" />
          <span className="font-semibold">{formatCurrency(diseno.presupuesto)}</span>
        </div>
        <div className="flex items-center text-sm text-gray-400">
          <Calendar className="w-4 h-4 mr-2" />
          {formatDate(diseno.fecha_creacion)}
        </div>
        {diseno.disenador_nombre && (
          <div className="flex items-center text-sm text-gray-400">
            <Package className="w-4 h-4 mr-2" />
            Diseñador: {diseno.disenador_nombre}
          </div>
        )}
      </div>

      <button
        onClick={() => onVerDetalle(diseno.id_diseno)}
        className={`w-full flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors ${
          isPendiente 
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
        }`}
      >
        <Eye className="w-4 h-4 mr-2" />
        {isPendiente ? 'Revisar y Decidir' : 'Ver Detalles'}
      </button>
    </div>
  );
};

// Modal de Detalle con opciones de aceptar/rechazar
const DisenoDetalleModal = ({ diseno, onClose, onAceptar, onRechazar, loading, formatCurrency }) => {
  const isPresentado = diseno.estado === 'presentado';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Palette className="w-6 h-6 text-green-400" />
            <div>
              <h2 className="text-xl font-bold text-white">{diseno.titulo}</h2>
              <p className="text-sm text-gray-400">Diseño #{diseno.id_diseno}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
            disabled={loading}
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6 space-y-6">
          {/* Alert si está pendiente */}
          {isPresentado && (
            <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-blue-400 font-semibold">Propuesta de Diseño</h3>
                  <p className="text-blue-300 text-sm mt-1">
                    Por favor revisa cuidadosamente esta propuesta. Si la aceptas, se descontará el stock de los productos y el servicio pasará a estado "En Curso".
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Información Principal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2">Presupuesto Total</h3>
              <p className="text-3xl font-bold text-green-400">{formatCurrency(diseno.presupuesto)}</p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2">Diseñador</h3>
              <p className="text-gray-300">{diseno.disenador_nombre || 'N/A'}</p>
            </div>
          </div>

          {/* Descripción */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">Descripción del Diseño</h3>
            <p className="text-gray-300 whitespace-pre-wrap">{diseno.descripcion || 'Sin descripción'}</p>
          </div>

          {/* Productos */}
          {diseno.productos && diseno.productos.length > 0 && (
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <Package className="w-5 h-5 mr-2 text-gray-400" />
                <h3 className="font-semibold text-white">Productos Incluidos</h3>
              </div>
              <div className="space-y-2">
                {diseno.productos.map((producto, index) => (
                  <div key={index} className="flex justify-between items-center bg-gray-600 rounded p-3">
                    <div>
                      <p className="text-white font-medium">{producto.producto_nombre}</p>
                      <p className="text-sm text-gray-400">Cantidad: {producto.cantidad} unidades</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">{formatCurrency(producto.precio_unitario)}</p>
                      <p className="text-xs text-gray-400">c/u</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Imágenes */}
          {diseno.imagenes && diseno.imagenes.length > 0 && (
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <ImageIcon className="w-5 h-5 mr-2 text-gray-400" />
                <h3 className="font-semibold text-white">Imágenes de Referencia</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {diseno.imagenes.map((imagen) => (
                  <div key={imagen.id_imagen} className="relative aspect-square rounded-lg overflow-hidden">
                    <img
                      src={imagen.imagen}
                      alt={imagen.descripcion || 'Imagen del diseño'}
                      className="w-full h-full object-cover hover:scale-110 transition-transform"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer con botones de acción */}
        {isPresentado && (
          <div className="border-t border-gray-700 p-6 bg-gray-750">
            <div className="flex justify-end space-x-3">
              <button
                onClick={onRechazar}
                disabled={loading}
                className="flex items-center px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Rechazar Diseño
              </button>
              <button
                onClick={onAceptar}
                disabled={loading}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Aceptar Diseño
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Modal de Feedback al rechazar
const FeedbackModal = ({ onClose, onSubmit, feedback, setFeedback, loading }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <XCircle className="w-6 h-6 mr-2 text-red-400" />
            Rechazar Diseño
          </h3>
          
          <p className="text-gray-300 mb-4">
            Por favor, cuéntanos por qué no te convence esta propuesta. Tu feedback ayudará al diseñador a crear una mejor propuesta.
          </p>

          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Ejemplo: Me gustaría más plantas de color, el presupuesto es muy alto, necesito un diseño más minimalista..."
            rows={5}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          />

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onSubmit}
              disabled={loading || !feedback.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Confirmar Rechazo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MisDisenosPage;
