import React, { useState, useEffect } from 'react';
import { X, Calendar, User, MapPin, FileText, Image as ImageIcon, Palette, DollarSign, Eye, CreditCard, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import { serviciosService } from '../services';
import { error as showError } from '../utils/notifications';
import { useAuth } from '../context/AuthContext';

const ServicioDetalleModal = ({ servicioId, itemType, isOpen, onClose, onVerDiseno }) => {
  const { user } = useAuth();
  const [servicio, setServicio] = useState(null);
  const [diseno, setDiseno] = useState(null);
  const [loading, setLoading] = useState(false);
  const [procesandoPago, setProcesandoPago] = useState(false);

  // Verificar roles de usuario (igual que en Sidebar.jsx)
  const isAdmin = user && (user.is_staff || user.is_superuser || user.perfil?.tipo_usuario === 'administrador' || user.groups?.includes('Administradores'));
  const isEmpleado = user && (user.perfil?.tipo_usuario === 'empleado' || user.groups?.includes('Empleados'));
  const isCliente = user && !isAdmin && !isEmpleado;

  // Imagen placeholder base64 (1x1 pixel gris)
  const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjNEY0RjRGIi8+CjxwYXRoIGQ9Ik0zMCA1MEw0NSA2NUw3MCAzNUw5MCA2NVY4NUgxMFY2NUwzMCA1MFoiIGZpbGw9IiM2MzYzNjMiLz4KPGNpcmNsZSBjeD0iMzUiIGN5PSIzNSIgcj0iNSIgZmlsbD0iIzYzNjM2MyIvPgo8L3N2Zz4K';

  useEffect(() => {
    if (isOpen && servicioId) {
      fetchServicioDetalle();
    }
  }, [isOpen, servicioId, itemType]);

  const fetchServicioDetalle = async () => {
    try {
      setLoading(true);
      let data;
      
      // Usar el endpoint correcto según el tipo
      if (itemType === 'reserva') {
        try {
          data = await serviciosService.getReservaById(servicioId);
        } catch (err) {
          if (err.response?.status === 404) {
            showError(`La reserva #${servicioId} no existe o no tienes permisos para verla`);
            console.error(`❌ Reserva #${servicioId} no encontrada`);
            onClose();
            return;
          }
          throw err;
        }
        
        // Buscar el diseño asociado a esta reserva
        try {
          const disenosData = await serviciosService.getDisenos();
          const disenosArray = disenosData.results || disenosData;
          const disenoEncontrado = disenosArray.find(d => 
            d.reserva === servicioId || d.reserva_id === servicioId
          );
          setDiseno(disenoEncontrado || null);
        } catch (err) {
          console.log('No se pudo cargar el diseño:', err);
          setDiseno(null);
        }
      } else {
        data = await serviciosService.getServicioById(servicioId);
      }
      
      setServicio(data);
      console.log('Datos recibidos:', data); // Debug
      console.log('Diseño encontrado:', diseno); // Debug
    } catch (error) {
      showError('Error al cargar los detalles');
      console.error(error);
      onClose(); // Cerrar el modal si hay error
    } finally {
      setLoading(false);
    }
  };

  const handlePagarReserva = async (tipoPago) => {
    try {
      setProcesandoPago(true);
      
      // Llamar al servicio correspondiente según el tipo de pago
      let response;
      if (tipoPago === 'sena') {
        response = await serviciosService.crearPreferenciaSena(servicioId);
      } else if (tipoPago === 'final') {
        response = await serviciosService.crearPreferenciaFinal(servicioId);
      }
      
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
                {servicio ? `#${servicio.id_reserva || servicio.id_servicio || 'N/A'}` : 'Cargando...'}
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
                        {servicio.cliente_nombre && servicio.cliente_apellido 
                          ? `${servicio.cliente_nombre} ${servicio.cliente_apellido}` 
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Palette className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">Servicio:</span>
                      <span className="text-white font-medium">
                        {servicio.servicio_nombre || 'N/A'}
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
                    {servicio.fecha_reserva && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">Fecha a realizarse el servicio:</span>
                        <span className="text-white">
                          {new Date(servicio.fecha_reserva).toLocaleString('es-AR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                    {servicio.direccion && (
                      <div className="flex items-start space-x-2 bg-gray-600 p-3 rounded-lg">
                        <MapPin className="w-5 h-5 text-blue-400 mt-0.5" />
                        <div className="flex-1">
                          <span className="text-gray-300 text-sm block mb-1">Dirección del servicio:</span>
                          <p className="text-white font-semibold text-base">{servicio.direccion}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Información de Pago */}
              {itemType === 'reserva' && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <CreditCard className="w-5 h-5 mr-2 text-green-400" />
                    Información de Pago
                  </h3>
                  
                  {/* Pago de Seña */}
                  <div className="space-y-4">
                    <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-blue-500">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-md font-semibold text-white">Pago de Seña</h4>
                        {servicio.estado_pago_sena === 'aprobado' || servicio.estado_pago_sena === 'sena_pagada' ? (
                          <span className="flex items-center px-3 py-1 bg-green-500 text-white text-sm rounded-full">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Pagado
                          </span>
                        ) : servicio.estado_pago_sena === 'rechazado' ? (
                          <span className="flex items-center px-3 py-1 bg-red-500 text-white text-sm rounded-full">
                            <XCircle className="w-4 h-4 mr-1" />
                            Rechazado
                          </span>
                        ) : (
                          <span className="flex items-center px-3 py-1 bg-yellow-500 text-white text-sm rounded-full">
                            <Clock className="w-4 h-4 mr-1" />
                            Pendiente
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-400">Monto:</span>
                          <p className="text-white font-semibold text-lg">
                            ${servicio.monto_sena ? Number(servicio.monto_sena).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} ARS
                          </p>
                        </div>
                        
                        {servicio.fecha_pago_sena && (
                          <div>
                            <span className="text-gray-400">Fecha de pago:</span>
                            <p className="text-white font-medium">
                              {new Date(servicio.fecha_pago_sena).toLocaleString('es-AR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        )}
                        
                        {servicio.payment_id_sena && (
                          <div className="md:col-span-2">
                            <span className="text-gray-400">ID de Transacción:</span>
                            <p className="text-white font-mono text-xs bg-gray-900 px-2 py-1 rounded mt-1 break-all">
                              {servicio.payment_id_sena}
                            </p>
                            
                            {/* Link al comprobante de MercadoPago */}
                            <a
                              href={`https://www.mercadopago.com.ar/activities?q=${servicio.payment_id_sena}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Ver Comprobante en MercadoPago
                            </a>
                          </div>
                        )}
                        
                        {/* Botón para pagar la seña - Solo si está pendiente y es cliente */}
                        {isCliente && (servicio.estado_pago_sena === 'pendiente_pago_sena' || servicio.estado_pago_sena === 'pendiente') && (
                          <div className="md:col-span-2">
                            <button
                              onClick={() => handlePagarReserva('sena')}
                              disabled={procesandoPago}
                              className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                              {procesandoPago ? (
                                <>
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                  Procesando...
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-5 h-5 mr-2" />
                                  Pagar Seña con MercadoPago
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pago Final */}
                    {(servicio.monto_final > 0 || servicio.estado_pago_final !== 'pendiente') && (
                      <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-purple-500">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-md font-semibold text-white">Pago Final</h4>
                          {servicio.estado_pago_final === 'aprobado' ? (
                            <span className="flex items-center px-3 py-1 bg-green-500 text-white text-sm rounded-full">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Pagado
                            </span>
                          ) : servicio.estado_pago_final === 'rechazado' ? (
                            <span className="flex items-center px-3 py-1 bg-red-500 text-white text-sm rounded-full">
                              <XCircle className="w-4 h-4 mr-1" />
                              Rechazado
                            </span>
                          ) : (
                            <span className="flex items-center px-3 py-1 bg-yellow-500 text-white text-sm rounded-full">
                              <Clock className="w-4 h-4 mr-1" />
                              Pendiente
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-400">Monto:</span>
                            <p className="text-white font-semibold text-lg">
                              ${servicio.monto_final ? Number(servicio.monto_final).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} ARS
                            </p>
                          </div>
                          
                          {servicio.fecha_pago_final && (
                            <div>
                              <span className="text-gray-400">Fecha de pago:</span>
                              <p className="text-white font-medium">
                                {new Date(servicio.fecha_pago_final).toLocaleString('es-AR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          )}
                          
                          {servicio.payment_id_final && (
                            <div className="md:col-span-2">
                              <span className="text-gray-400">ID de Transacción:</span>
                              <p className="text-white font-mono text-xs bg-gray-900 px-2 py-1 rounded mt-1 break-all">
                                {servicio.payment_id_final}
                              </p>
                              
                              {/* Link al comprobante de MercadoPago */}
                              <a
                                href={`https://www.mercadopago.com.ar/activities?q=${servicio.payment_id_final}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Ver Comprobante en MercadoPago
                              </a>
                            </div>
                          )}
                          
                          {/* Botón para pagar el monto final - Solo si está pendiente y es cliente */}
                          {isCliente && servicio.estado_pago_final === 'pendiente' && (
                            <div className="md:col-span-2">
                              <button
                                onClick={() => handlePagarReserva('final')}
                                disabled={procesandoPago}
                                className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                              >
                                {procesandoPago ? (
                                  <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Procesando...
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="w-5 h-5 mr-2" />
                                    Pagar Monto Final con MercadoPago
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Resumen Total */}
                    {servicio.monto_total > 0 && (
                      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-semibold">Monto Total del Servicio:</span>
                          <span className="text-white font-bold text-2xl">
                            ${Number(servicio.monto_total).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Descripción del Usuario/Observaciones */}
              {servicio.observaciones && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-400" />
                    Descripción del Cliente
                  </h3>
                  <p className="text-gray-300 whitespace-pre-wrap">
                    {servicio.observaciones}
                  </p>
                </div>
              )}

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

              {/* Diseño */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Palette className="w-5 h-5 mr-2 text-green-400" />
                  Información del Diseño
                </h3>
                {diseno ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <span className="text-gray-400 text-sm font-medium">Título:</span>
                          <p className="text-white font-medium">{diseno.titulo}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm font-medium">Estado:</span>
                          <p className="text-white capitalize">{diseno.estado?.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {diseno.disenador_nombre && (
                          <div>
                            <span className="text-gray-400 text-sm font-medium">Diseñador:</span>
                            <p className="text-white">{diseno.disenador_nombre}</p>
                          </div>
                        )}
                        {diseno.presupuesto && (
                          <div>
                            <span className="text-gray-400 text-sm font-medium">Presupuesto:</span>
                            <p className="text-white font-medium">${diseno.presupuesto}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {diseno.descripcion && (
                      <div>
                        <span className="text-gray-400 text-sm font-medium">Descripción:</span>
                        <p className="text-gray-300 mt-1 p-3 bg-gray-600 rounded">
                          {diseno.descripcion}
                        </p>
                      </div>
                    )}
                    
                    {/* Botón para ver el diseño completo */}
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          if (onVerDiseno) {
                            onVerDiseno(diseno.id_diseno);
                          }
                        }}
                        className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
                      >
                        <Eye className="w-5 h-5 mr-2" />
                        Ver Diseño Completo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Palette className="w-16 h-16 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400 text-lg font-medium mb-2">
                      No hay diseño disponible
                    </p>
                    <p className="text-gray-500 text-sm">
                      El diseño está pendiente de creación o no ha sido asignado aún
                    </p>
                  </div>
                )}
              </div>

              {/* Empleados Asignados - Solo visible para administradores y empleados */}
              {!isCliente && (
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