import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { serviciosService } from '../services';
import { useAuth } from '../context/AuthContext';
import { success, handleApiError } from '../utils/notifications';
import { Calendar, Clock, CheckCircle, XCircle, Users, Filter, Search, Eye, Palette, MapPin } from 'lucide-react';
import CrearDisenoModal from './CrearDisenoModal';
import DisenoClienteModal from './DisenoClienteModal';
import Pagination from '../components/Pagination';

const ServiciosPage = () => {
  const navigate = useNavigate();
  const [servicios, setServicios] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [disenos, setDisenos] = useState([]);
  const [loading, setLoading] = useState(true);
  const activeTab = 'solicitudes';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [isDisenoModalOpen, setIsDisenoModalOpen] = useState(false);
  const [isDisenoClienteModalOpen, setIsDisenoClienteModalOpen] = useState(false);
  const [servicioParaDiseno, setServicioParaDiseno] = useState(null);
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);
  const { user } = useAuth();

  // Estados de paginación
  const [solicitudesPagination, setSolicitudesPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 5
  });
  const [disenosPagination, setDisenosPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 10
  });

  const isAdmin = user?.groups?.includes('Administradores');
  const isEmpleado = user?.groups?.includes('Empleados');
  const isCliente = !isAdmin && !isEmpleado;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const promises = [
        serviciosService.getServicios(),
        serviciosService.getReservas({
          page: solicitudesPagination.currentPage,
          page_size: solicitudesPagination.pageSize,
          estado: statusFilter || undefined,
          fecha_solicitud: dateFilter || undefined,
          estado_pago_sena: paymentFilter || undefined,
          search: searchTerm || undefined
        })
      ];

      // Si es cliente, también obtener sus diseños
      if (isCliente) {
        promises.push(serviciosService.getDisenos({
          page: disenosPagination.currentPage,
          page_size: disenosPagination.pageSize
        }));
      }

      const results = await Promise.all(promises);
      const [serviciosData, reservasData, disenosData] = results;

      setServicios(serviciosData.results || serviciosData);

      // Actualizar solicitudes con datos de paginación
      if (reservasData.results) {
        setSolicitudes(reservasData.results);
        setSolicitudesPagination(prev => ({
          ...prev,
          totalPages: reservasData.total_pages || 1,
          totalItems: reservasData.count || 0,
          currentPage: reservasData.current_page || prev.currentPage
        }));
      } else {
        setSolicitudes(reservasData);
      }

      // Actualizar diseños con datos de paginación
      if (disenosData) {
        if (disenosData.results) {
          setDisenos(disenosData.results);
          setDisenosPagination(prev => ({
            ...prev,
            totalPages: disenosData.total_pages || 1,
            totalItems: disenosData.count || 0,
            currentPage: disenosData.current_page || prev.currentPage
          }));
        } else {
          setDisenos(disenosData);
        }
      }
    } catch (error) {
      handleApiError(error, 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [
    disenosPagination.currentPage,
    disenosPagination.pageSize,
    solicitudesPagination.currentPage,
    solicitudesPagination.pageSize,
    isCliente,
    statusFilter,
    dateFilter,
    paymentFilter,
    searchTerm
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFinalizarServicio = async (id) => {
    if (!window.confirm('¿Está seguro de finalizar este servicio?')) {
      return;
    }

    try {
      await serviciosService.finalizarServicio(id);
      success('Servicio finalizado correctamente');
      fetchData();
    } catch (error) {
      handleApiError(error, 'Error al finalizar el servicio');
    }
  };

  // Función para verificar si el usuario actual puede finalizar el servicio
  const puedeFinalizarServicio = (reserva) => {
    // Administradores siempre pueden
    if (isAdmin) {
      return true;
    }

    // Verificar si es empleado asignado
    if (isEmpleado && reserva.empleados_asignados) {
      const empleadoAsignado = reserva.empleados_asignados.find(
        emp => emp.empleado_email === user.email
      );
      return !!empleadoAsignado;
    }

    return false;
  };

  const handleVerDetalle = (servicioId, tipo) => {
    if (tipo === 'reserva') {
      navigate(`/servicios/reservas/${servicioId}`);
    }
  };

  const handleCrearDiseno = (reserva) => {
    // Pasar la reserva completa al modal
    setServicioParaDiseno(reserva);
    setIsDisenoModalOpen(true);
  };

  const handleCloseDisenoModal = () => {
    setIsDisenoModalOpen(false);
    setServicioParaDiseno(null);
  };

  const handleDisenoCreado = () => {
    // Recargar los servicios después de crear el diseño
    fetchData();
    setIsDisenoModalOpen(false);
    setServicioParaDiseno(null);
  };

  const handleVerDiseno = (reservaId) => {
    setReservaSeleccionada(reservaId);
    setIsDisenoClienteModalOpen(true);
  };

  const handleCloseDisenoCliente = () => {
    setIsDisenoClienteModalOpen(false);
    setReservaSeleccionada(null);
  };

  const handleDisenoActualizado = () => {
    fetchData(); // Recargar datos después de aceptar/rechazar
  };

  // Helper para obtener el diseño de una reserva
  const getDisenoDeReserva = (reservaId) => {
    // Buscar el diseño que coincida con esta reserva
    // Comparamos tanto reserva_id (id_reserva del modelo) como reserva (FK directo)
    return disenos.find(d => d.reserva_id === reservaId || d.reserva === reservaId);
  };

  const getStatusColor = (status) => {
    const colors = {
      // Estados de Reserva
      'pendiente': 'bg-yellow-500',
      'confirmada': 'bg-blue-500',
      'en_curso': 'bg-cyan-500',
      'completada': 'bg-green-500',
      'cancelada': 'bg-red-500',
      // Estados legacy (por compatibilidad)
      'solicitud': 'bg-blue-500',
      'en_revision': 'bg-yellow-500',
      'en_diseño': 'bg-purple-500',
      'diseño_enviado': 'bg-indigo-500',
      'revision_diseño': 'bg-orange-500',
      'aprobado': 'bg-green-500',
      'pausado': 'bg-gray-500',
      'completado': 'bg-green-500',
      'cancelado': 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  // Contar diseños pendientes para clientes
  const disenosPendientes = isCliente ? disenos.filter(d => d.estado === 'presentado').length : 0;

  // Determinar qué datos mostrar según el tab activo
  const filteredData = activeTab === 'solicitudes' ? solicitudes : [];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Gestión de Servicios
          </h1>
          <p className="text-gray-400">
            {isAdmin ? 'Vista completa de todos los servicios' : 'Mis servicios asignados'}
          </p>
        </div>

        {/* Alert de diseños pendientes para clientes */}
        {isCliente && disenosPendientes > 0 && (() => {
          // Obtener la primera reserva con diseño presentado
          const primerDisenosPendiente = disenos.find(d => d.estado === 'presentado');
          return (
            <div className="mb-6 bg-blue-600/10 border-2 border-blue-600/50 rounded-lg p-4 animate-pulse">
              <div className="flex items-start">
                <Palette className="w-6 h-6 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-blue-400 font-bold text-lg mb-1">
                    ¡Tienes {disenosPendientes} diseño{disenosPendientes > 1 ? 's' : ''} pendiente{disenosPendientes > 1 ? 's' : ''} de aprobación!
                  </h3>
                  <p className="text-blue-300 mb-3">
                    Revisa {disenosPendientes > 1 ? 'las propuestas' : 'la propuesta'} de diseño y decide si {disenosPendientes > 1 ? 'las aceptas o rechazas' : 'la aceptas o rechazas'}.
                  </p>
                  <button
                    onClick={() => handleVerDiseno(primerDisenosPendiente?.reserva || primerDisenosPendiente?.reserva_id)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Palette className="w-4 h-4 mr-2" />
                    Ver Propuesta
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Filters and Tabs */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar servicios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="confirmada">Confirmada</option>
                <option value="en_curso">En Curso</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="relative">
              <Calendar className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Payment Filter */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-bold">$</div>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="pl-10 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Todos los pagos</option>
                <option value="pendiente">Pendiente</option>
                <option value="pendiente_pago_sena">Pendiente Seña</option>
                <option value="sena_pagada">Seña Pagada</option>
                <option value="pagado">Pagado Total</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Table */}
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3">
                    {activeTab === 'solicitudes' ? 'Solicitud' : 'Servicio'}
                  </th>
                  <th scope="col" className="px-6 py-3">Cliente</th>
                  <th scope="col" className="px-6 py-3">Fecha Solicitud</th>
                  <th scope="col" className="px-6 py-3">Fecha Cita</th>
                  <th scope="col" className="px-6 py-3">Realización</th>
                  <th scope="col" className="px-6 py-3">Estado</th>
                  {isCliente && activeTab === 'solicitudes' && (
                    <th scope="col" className="px-6 py-3">Diseño</th>
                  )}
                  <th scope="col" className="px-6 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((item) => {
                    // Determinar si es reserva o servicio según el tab activo
                    const esReserva = activeTab === 'solicitudes';
                    const id = esReserva ? item.id_reserva : item.id_servicio;
                    const nombre = esReserva ? item.servicio_nombre : item.nombre;
                    const cliente = esReserva ? `${item.cliente_nombre || ''} ${item.cliente_apellido || ''}`.trim() : 'N/A';
                    const fechaSolicitud = esReserva ? item.fecha_solicitud : item.fecha_creacion;
                    const fechaCita = esReserva ? item.fecha_reserva : null;
                    const fechaRealizacion = esReserva ? item.fecha_realizacion : null;

                    return (
                      <tr key={id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-600">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-white text-lg">
                              #{id}
                            </p>
                            <p className="text-sm text-gray-300 mt-1">
                              {nombre || 'Sin título'}
                            </p>
                            {item.observaciones && (
                              <p className="text-xs text-gray-400 mt-1 truncate max-w-xs">
                                {item.observaciones}
                              </p>
                            )}
                            {item.direccion && (
                              <p className="text-sm text-blue-400 mt-1 flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {item.direccion}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2 text-gray-400" />
                            {cliente}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {fechaSolicitud ? new Date(fechaSolicitud).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          {fechaCita ? new Date(fechaCita).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4">
                          {fechaRealizacion ? new Date(fechaRealizacion).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className={`h-2.5 w-2.5 rounded-full ${getStatusColor(item.estado)} mr-2`}></div>
                            <span className="capitalize">{item.estado?.replace('_', ' ')}</span>
                          </div>
                        </td>
                        {isCliente && activeTab === 'solicitudes' && (() => {
                          const diseno = getDisenoDeReserva(id);
                          return (
                            <td className="px-6 py-4">
                              {diseno ? (
                                // Si tiene diseño, mostrar según el estado
                                diseno.estado === 'presentado' ? (
                                  // DISEÑO PRESENTADO - Botón llamativo
                                  <button
                                    onClick={() => handleVerDiseno(id)}
                                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
                                  >
                                    <Palette className="w-4 h-4 mr-2 animate-pulse" />
                                    Ver Propuesta
                                  </button>
                                ) : diseno.estado === 'aceptado' ? (
                                  // DISEÑO ACEPTADO - Permitir ver detalles
                                  <button
                                    onClick={() => handleVerDiseno(id)}
                                    className="flex items-center text-green-400 hover:text-green-300 transition-colors"
                                  >
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    <span className="font-medium">Aceptado</span>
                                  </button>
                                ) : diseno.estado === 'rechazado' ? (
                                  // DISEÑO RECHAZADO - Permitir ver detalles
                                  <button
                                    onClick={() => handleVerDiseno(id)}
                                    className="flex items-center text-red-400 hover:text-red-300 transition-colors"
                                  >
                                    <XCircle className="w-5 h-5 mr-2" />
                                    <span className="font-medium">Rechazado</span>
                                  </button>
                                ) : (
                                  // DISEÑO EN BORRADOR (empleado trabajando)
                                  <div className="flex items-center">
                                    <Clock className="w-5 h-5 text-yellow-400 mr-2 animate-spin" />
                                    <span className="text-yellow-400 font-medium">Diseño en progreso...</span>
                                  </div>
                                )
                              ) : (
                                // SIN DISEÑO AÚN
                                <div className="flex items-center">
                                  <Clock className="w-5 h-5 text-gray-500 mr-2" />
                                  <span className="text-gray-500">Diseño en progreso...</span>
                                </div>
                              )}
                            </td>
                          );
                        })()}
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleVerDetalle(id, esReserva ? 'reserva' : 'servicio')}
                              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {(isAdmin || isEmpleado) && esReserva && (
                              <>
                                {/* Botón crear diseño para reservas - solo si no hay diseño o fue rechazado */}
                                {(() => {
                                  // Verificar si hay diseños
                                  const tieneDisenos = item.disenos && item.disenos.length > 0;

                                  // Si no hay diseños, mostrar botón
                                  if (!tieneDisenos) return true;

                                  // Si hay diseños, verificar que todos estén rechazados
                                  const todosRechazados = item.disenos.every(d => d.estado === 'rechazado');
                                  return todosRechazados;
                                })() && (
                                    <button
                                      onClick={() => handleCrearDiseno(item)}
                                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                                      title="Crear diseño para este servicio"
                                    >
                                      <Palette className="w-3 h-3 mr-1" />
                                      Crear Diseño
                                    </button>
                                  )}

                                {/* Botón Finalizar Servicio - solo para empleados asignados y administradores */}
                                {puedeFinalizarServicio(item) && item.estado !== 'completada' && item.estado !== 'cancelada' && (
                                  <button
                                    onClick={() => handleFinalizarServicio(id)}
                                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    title="Finalizar servicio"
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Finalizar Servicio
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                      No se encontraron {activeTab} para mostrar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {activeTab === 'solicitudes' && (
            <Pagination
              currentPage={solicitudesPagination.currentPage}
              totalPages={solicitudesPagination.totalPages}
              totalItems={solicitudesPagination.totalItems}
              pageSize={solicitudesPagination.pageSize}
              onPageChange={(page) => setSolicitudesPagination(prev => ({ ...prev, currentPage: page }))}
              onPageSizeChange={(pageSize) => setSolicitudesPagination(prev => ({ ...prev, pageSize, currentPage: 1 }))}
              loading={loading}
            />
          )}

          {activeTab === 'disenos' && isCliente && (
            <Pagination
              currentPage={disenosPagination.currentPage}
              totalPages={disenosPagination.totalPages}
              totalItems={disenosPagination.totalItems}
              pageSize={disenosPagination.pageSize}
              onPageChange={(page) => setDisenosPagination(prev => ({ ...prev, currentPage: page }))}
              onPageSizeChange={(pageSize) => setDisenosPagination(prev => ({ ...prev, pageSize, currentPage: 1 }))}
              loading={loading}
            />
          )}
        </div>
      </div>

      {/* Modal de Crear Diseño */}
      <CrearDisenoModal
        servicio={servicioParaDiseno}
        isOpen={isDisenoModalOpen}
        onClose={handleCloseDisenoModal}
        onDisenoCreado={handleDisenoCreado}
      />

      {/* Modal de Diseño para Clientes */}
      {isCliente && (
        <DisenoClienteModal
          isOpen={isDisenoClienteModalOpen}
          onClose={handleCloseDisenoCliente}
          reservaId={reservaSeleccionada}
          onDisenoActualizado={handleDisenoActualizado}
        />
      )}
    </div>
  );
};

export default ServiciosPage;
