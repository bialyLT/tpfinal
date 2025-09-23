import React, { useState, useEffect } from 'react';
import { X, Calendar, User, MapPin, FileText, Image as ImageIcon, Palette, DollarSign } from 'lucide-react';
import { serviciosService } from '../services';
import { error as showError } from '../utils/notifications';

const ServicioDetalleModal = ({ servicioId, isOpen, onClose }) => {
  const [servicio, setServicio] = useState(null);
  const [loading, setLoading] = useState(false);

  // Imagen placeholder base64 (1x1 pixel gris)
  const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjNEY0RjRGIi8+CjxwYXRoIGQ9Ik0zMCA1MEw0NSA2NUw3MCAzNUw5MCA2NVY4NUgxMFY2NUwzMCA1MFoiIGZpbGw9IiM2MzYzNjMiLz4KPGNpcmNsZSBjeD0iMzUiIGN5PSIzNSIgcj0iNSIgZmlsbD0iIzYzNjM2MyIvPgo8L3N2Zz4K';

  useEffect(() => {
    if (isOpen && servicioId) {
      fetchServicioDetalle();
    }
  }, [isOpen, servicioId]);

  const fetchServicioDetalle = async () => {
    try {
      setLoading(true);
      const data = await serviciosService.getServicioById(servicioId);
      setServicio(data);
      console.log('Datos del servicio recibidos:', data); // Debug
    } catch (error) {
      showError('Error al cargar los detalles del servicio');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'solicitud': 'bg-blue-500',
      'en_revision': 'bg-yellow-500',
      'en_diseño': 'bg-purple-500',
      'diseño_enviado': 'bg-indigo-500',
      'revision_diseño': 'bg-orange-500',
      'aprobado': 'bg-green-500',
      'en_curso': 'bg-cyan-500',
      'pausado': 'bg-gray-500',
      'completado': 'bg-emerald-500',
      'cancelado': 'bg-red-500',
      'rechazado': 'bg-red-700'
    };
    return colors[status] || 'bg-gray-500';
  };

  const formatEstado = (estado) => {
    const estados = {
      'solicitud': 'Solicitud Inicial',
      'en_revision': 'En Revisión',
      'en_diseño': 'En Diseño',
      'diseño_enviado': 'Diseño Enviado',
      'revision_diseño': 'En Revisión de Diseño',
      'aprobado': 'Diseño Aprobado',
      'en_curso': 'En Ejecución',
      'pausado': 'Pausado',
      'completado': 'Completado',
      'cancelado': 'Cancelado',
      'rechazado': 'Rechazado'
    };
    return estados[estado] || estado;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-green-400" />
            <div>
              <h2 className="text-xl font-bold text-white">
                Detalle del Servicio
              </h2>
              <p className="text-gray-400 text-sm">
                {servicio ? `#${servicio.numero_servicio}` : 'Cargando...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
              <span className="ml-3 text-gray-300">Cargando detalles...</span>
            </div>
          ) : servicio ? (
            <div className="p-6 space-y-6">
              {/* Información Básica */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-green-400" />
                  Información General
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">Cliente:</span>
                      <span className="text-white font-medium">
                        {servicio.cliente_nombre || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Palette className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">Tipo de servicio:</span>
                      <span className="text-white font-medium">
                        {servicio.tipo_servicio_nombre || servicio.tipo_servicio?.nombre || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`h-3 w-3 rounded-full ${getStatusColor(servicio.estado)}`}></div>
                      <span className="text-gray-300">Estado:</span>
                      <span className="text-white font-medium">
                        {formatEstado(servicio.estado)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">Fecha solicitud:</span>
                      <span className="text-white">
                        {servicio.fecha_solicitud ? new Date(servicio.fecha_solicitud).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    {servicio.fecha_preferida && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">Fecha preferida:</span>
                        <span className="text-white">
                          {new Date(servicio.fecha_preferida).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">Dirección:</span>
                      <span className="text-white">
                        {servicio.direccion_servicio || 'No especificada'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notas Adicionales */}
              {servicio.notas_adicionales && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-green-400" />
                    Notas Adicionales
                  </h3>
                  <p className="text-gray-300 whitespace-pre-wrap">
                    {servicio.notas_adicionales}
                  </p>
                </div>
              )}

              {/* Diseño */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Palette className="w-5 h-5 mr-2 text-green-400" />
                  Información del Diseño
                </h3>
                {servicio.diseño ? (
                  <div className="space-y-3">
                    {servicio.diseño.descripcion_deseada && (
                      <div>
                        <span className="text-gray-400 text-sm font-medium">Descripción deseada por el cliente:</span>
                        <p className="text-gray-300 mt-1 p-3 bg-gray-600 rounded">
                          {servicio.diseño.descripcion_deseada}
                        </p>
                      </div>
                    )}
                    {servicio.diseño.descripcion_tecnica ? (
                      <div>
                        <span className="text-gray-400 text-sm font-medium">Descripción técnica:</span>
                        <p className="text-gray-300 mt-1 p-3 bg-gray-600 rounded">
                          {servicio.diseño.descripcion_tecnica}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-gray-400 text-sm font-medium">Descripción técnica:</span>
                        <p className="text-gray-500 mt-1 p-3 bg-gray-600 rounded italic">
                          Pendiente de elaboración por el diseñador
                        </p>
                      </div>
                    )}
                    {servicio.diseño.diseñador_nombre ? (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">Diseñador asignado:</span>
                        <span className="text-white font-medium">
                          {servicio.diseño.diseñador_nombre}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">Diseñador asignado:</span>
                        <span className="text-gray-500 italic">
                          Por asignar
                        </span>
                      </div>
                    )}
                    {servicio.diseño.presupuesto ? (
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">Presupuesto:</span>
                        <span className="text-white font-medium">
                          ${servicio.diseño.presupuesto}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">Presupuesto:</span>
                        <span className="text-gray-500 italic">
                          Pendiente de cotización
                        </span>
                      </div>
                    )}
                    {servicio.diseño.motivo_rechazo && (
                      <div>
                        <span className="text-red-400 text-sm font-medium">Motivo de rechazo:</span>
                        <p className="text-red-300 mt-1 p-3 bg-red-900 bg-opacity-20 rounded">
                          {servicio.diseño.motivo_rechazo}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Palette className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-500 italic">
                      {servicio.tipo_servicio_requiere_diseño === false 
                        ? 'Este tipo de servicio no requiere diseño'
                        : 'El diseño está pendiente de crear'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Imágenes */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <ImageIcon className="w-5 h-5 mr-2 text-green-400" />
                  Imágenes del Servicio
                </h3>
                
                {servicio.imagenes && servicio.imagenes.length > 0 ? (
                  <>
                    {/* Imágenes del Jardín */}
                    {servicio.imagenes.some(img => img.tipo_imagen === 'jardin') ? (
                      <div className="mb-4">
                        <h4 className="text-md font-medium text-white mb-2">Imágenes del Jardín Actual</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {servicio.imagenes
                            .filter(img => img.tipo_imagen === 'jardin')
                            .map((imagen, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={imagen.imagen.startsWith('http') ? imagen.imagen : `http://localhost:8000${imagen.imagen}`}
                                  alt={`Jardín ${index + 1}`}
                                  className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-75 transition-opacity"
                                  onClick={() => window.open(imagen.imagen.startsWith('http') ? imagen.imagen : `http://localhost:8000${imagen.imagen}`, '_blank')}
                                  onError={(e) => {
                                    e.target.src = placeholderImage;
                                    e.target.alt = 'Imagen no disponible';
                                  }}
                                />
                                {imagen.descripcion && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 rounded-b-lg">
                                    {imagen.descripcion}
                                  </div>
                                )}
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    ) : null}

                    {/* Imágenes de Ideas */}
                    {servicio.imagenes.some(img => img.tipo_imagen === 'ideas') ? (
                      <div>
                        <h4 className="text-md font-medium text-white mb-2">Ideas y Referencias</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {servicio.imagenes
                            .filter(img => img.tipo_imagen === 'ideas')
                            .map((imagen, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={imagen.imagen.startsWith('http') ? imagen.imagen : `http://localhost:8000${imagen.imagen}`}
                                  alt={`Idea ${index + 1}`}
                                  className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-75 transition-opacity"
                                  onClick={() => window.open(imagen.imagen.startsWith('http') ? imagen.imagen : `http://localhost:8000${imagen.imagen}`, '_blank')}
                                  onError={(e) => {
                                    e.target.src = placeholderImage;
                                    e.target.alt = 'Imagen no disponible';
                                  }}
                                />
                                {imagen.descripcion && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 rounded-b-lg">
                                    {imagen.descripcion}
                                  </div>
                                )}
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <ImageIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-500 italic">
                      No hay imágenes adjuntas para este servicio
                    </p>
                  </div>
                )}
              </div>

              {/* Empleados Asignados */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-green-400" />
                  Empleados Asignados
                </h3>
                {servicio.empleados_asignados && servicio.empleados_asignados.length > 0 ? (
                  <div className="space-y-2">
                    {servicio.empleados_asignados.map((asignacion, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-600 rounded">
                        <span className="text-white font-medium">
                          {asignacion.empleado}
                        </span>
                        <span className="text-gray-300 text-sm">
                          Asignado: {new Date(asignacion.fecha_asignacion).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <User className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-500 italic">
                      No hay empleados asignados aún
                    </p>
                  </div>
                )}
              </div>

              {/* Información de Precio */}
              {servicio.precio_final && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-green-400" />
                    Información de Precio
                  </h3>
                  <div className="text-2xl font-bold text-green-400">
                    ${servicio.precio_final}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">
              No se pudo cargar la información del servicio
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServicioDetalleModal;