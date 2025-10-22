import React, { useState, useEffect } from 'react';
import { serviciosService } from '../services';
import { useAuth } from '../context/AuthContext';
import { success, handleApiError } from '../utils/notifications';
import { Calendar, Clock, CheckCircle, XCircle, Users, Filter, Search, Eye, Palette } from 'lucide-react';
import ServicioDetalleModal from './ServicioDetalleModal';
import CrearDisenoModal from './CrearDisenoModal';
import DisenoClienteModal from './DisenoClienteModal';

const ServiciosPage = () => {
  const [servicios, setServicios] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [tiposServicio, setTiposServicio] = useState([]);
  const [disenos, setDisenos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('solicitudes');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedServicioId, setSelectedServicioId] = useState(null);
  const [selectedItemType, setSelectedItemType] = useState(null); // 'servicio' o 'reserva'
  const [isDetalleModalOpen, setIsDetalleModalOpen] = useState(false);
  const [isDisenoModalOpen, setIsDisenoModalOpen] = useState(false);
  const [isDisenoClienteModalOpen, setIsDisenoClienteModalOpen] = useState(false);
  const [servicioParaDiseno, setServicioParaDiseno] = useState(null);
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);
  const { user } = useAuth();

  const isAdmin = user?.groups?.includes('Administradores');
  const isEmpleado = user?.groups?.includes('Empleados');
  const isCliente = !isAdmin && !isEmpleado;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const promises = [
        serviciosService.getServicios(),
        serviciosService.getReservas()
      ];
      
      // Si es cliente, también obtener sus diseños
      if (isCliente) {
        promises.push(serviciosService.getDisenos());
      }
      
      const results = await Promise.all(promises);
      const [serviciosData, reservasData, disenosData] = results;
      
      setServicios(serviciosData.results || serviciosData);
      setSolicitudes(reservasData.results || reservasData);
      setTiposServicio(serviciosData.results || serviciosData);
      
      if (disenosData) {
        setDisenos(disenosData.results || disenosData);
      }
    } catch (error) {
      handleApiError(error, 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEstado = async (id, nuevoEstado) => {
    try {
      // Determinar si es reserva o servicio según el tab activo
      if (activeTab === 'solicitudes') {
        await serviciosService.updateReserva(id, { estado: nuevoEstado });
      } else {
        await serviciosService.updateServicio(id, { activo: nuevoEstado === 'activo' });
      }
      success('Estado actualizado correctamente');
      fetchData();
    } catch (error) {
      handleApiError(error, 'Error al actualizar el estado');
    }
  };

  const handleVerDetalle = (servicioId, tipo) => {
    setSelectedServicioId(servicioId);
    setSelectedItemType(tipo);
    setIsDetalleModalOpen(true);
  };

  const handleCloseDetalle = () => {
    setIsDetalleModalOpen(false);
    setSelectedServicioId(null);
    setSelectedItemType(null);
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

  const filteredData = activeTab === 'solicitudes' 
    ? solicitudes.filter(item => 
        (item.servicio_nombre || item.observaciones || '')?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (!statusFilter || item.estado === statusFilter)
      )
    : servicios.filter(item => 
        (item.nombre || item.descripcion || '')?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (!statusFilter || item.activo === (statusFilter === 'activo'))
      );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-400"></div>
          <p className="text-gray-300 mt-4">Cargando servicios...</p>
        </div>
      </div>
    );
  }

  // Contar diseños pendientes para clientes
  const disenosPendientes = isCliente ? disenos.filter(d => d.estado === 'presentado').length : 0;

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
                <option value="en_curso">En Curso</option>
                <option value="completado">Completado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('solicitudes')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'solicitudes'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Solicitudes ({solicitudes.length})
            </button>
            <button
              onClick={() => setActiveTab('servicios')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'servicios'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Servicios ({servicios.length})
            </button>
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
                  <th scope="col" className="px-6 py-3">Fecha</th>
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
                    const fecha = esReserva ? (item.fecha_reserva || item.fecha_solicitud) : item.fecha_creacion;
                    
                    return (
                      <tr key={id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-600">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-white">
                              {nombre || 'Sin título'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              #{id}
                            </p>
                            {item.observaciones && (
                              <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                                {item.observaciones}
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
                          {fecha ? new Date(fecha).toLocaleDateString() : 'N/A'}
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
                                {/* Botón crear diseño para reservas */}
                                {!item.diseno && (
                                  <button
                                    onClick={() => handleCrearDiseno(item)}
                                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                                    title="Crear diseño para este servicio"
                                  >
                                    <Palette className="w-3 h-3 mr-1" />
                                    Crear Diseño
                                  </button>
                                )}
                                {/* Select para cambiar estado de reserva */}
                                <select
                                  value={item.estado}
                                  onChange={(e) => handleUpdateEstado(id, e.target.value)}
                                  className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1"
                                >
                                  <option value="pendiente">Pendiente</option>
                                  <option value="confirmada">Confirmada</option>
                                  <option value="en_curso">En Curso</option>
                                  <option value="completada">Completada</option>
                                  <option value="cancelada">Cancelada</option>
                                </select>
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
        </div>
      </div>

      {/* Modal de Detalle */}
      <ServicioDetalleModal
        servicioId={selectedServicioId}
        itemType={selectedItemType}
        isOpen={isDetalleModalOpen}
        onClose={handleCloseDetalle}
        onVerDiseno={(disenoId) => {
          // Cerrar el modal de detalle y abrir el modal de diseño
          handleCloseDetalle();
          // Si es cliente, buscar la reserva asociada al diseño
          if (isCliente) {
            const diseno = disenos.find(d => d.id_diseno === disenoId);
            if (diseno) {
              setReservaSeleccionada(diseno.reserva || diseno.reserva_id);
              setIsDisenoClienteModalOpen(true);
            }
          }
        }}
      />

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
