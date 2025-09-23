import React, { useState, useEffect } from 'react';
import { serviciosService } from '../services';
import { useAuth } from '../context/AuthContext';
import { success, handleApiError } from '../utils/notifications';
import { Calendar, Clock, CheckCircle, XCircle, Users, Filter, Search, Eye } from 'lucide-react';
import ServicioDetalleModal from './ServicioDetalleModal';

const ServiciosPage = () => {
  const [servicios, setServicios] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [tiposServicio, setTiposServicio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('solicitudes');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedServicioId, setSelectedServicioId] = useState(null);
  const [isDetalleModalOpen, setIsDetalleModalOpen] = useState(false);
  const { user } = useAuth();

  const isAdmin = user?.groups?.includes('Administradores');
  const isEmpleado = user?.groups?.includes('Empleados');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [serviciosData, solicitudesData, tiposData] = await Promise.all([
        serviciosService.getServicios(),
        serviciosService.getSolicitudes(),
        serviciosService.getTiposServicio()
      ]);
      setServicios(serviciosData.results || []);
      setSolicitudes(solicitudesData.results || []);
      setTiposServicio(tiposData.results || []);
    } catch (error) {
      handleApiError(error, 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEstado = async (servicioId, nuevoEstado) => {
    try {
      await serviciosService.updateServicio(servicioId, { estado: nuevoEstado });
      success('Estado actualizado correctamente');
      fetchData();
    } catch (error) {
      handleApiError(error, 'Error al actualizar el estado');
    }
  };

  const handleVerDetalle = (servicioId) => {
    setSelectedServicioId(servicioId);
    setIsDetalleModalOpen(true);
  };

  const handleCloseDetalle = () => {
    setIsDetalleModalOpen(false);
    setSelectedServicioId(null);
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
        (item.tipo_servicio_nombre || item.tipo_servicio?.nombre || item.notas_adicionales || '')?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (!statusFilter || item.estado === statusFilter)
      )
    : servicios.filter(item => 
        (item.tipo_servicio_nombre || item.tipo_servicio?.nombre || item.notas_adicionales || '')?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (!statusFilter || item.estado === statusFilter)
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
                  <th scope="col" className="px-6 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((item) => (
                    <tr key={item.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-600">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-white">
                            {item.tipo_servicio_nombre || item.tipo_servicio?.nombre || 'Servicio sin título'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            #{item.numero_servicio}
                          </p>
                          {item.notas_adicionales && (
                            <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                              {item.notas_adicionales}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2 text-gray-400" />
                          {item.cliente_nombre || item.cliente?.username || item.cliente?.get_full_name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {new Date(item.fecha_solicitud || item.fecha_preferida || item.fecha_inicio).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`h-2.5 w-2.5 rounded-full ${getStatusColor(item.estado)} mr-2`}></div>
                          <span className="capitalize">{item.estado?.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleVerDetalle(item.id)}
                            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(isAdmin || isEmpleado) && (
                            <select
                              value={item.estado}
                              onChange={(e) => handleUpdateEstado(item.id, e.target.value)}
                              className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1"
                            >
                              <option value="solicitud">Solicitud Inicial</option>
                              <option value="en_revision">En Revisión</option>
                              <option value="en_diseño">En Diseño</option>
                              <option value="diseño_enviado">Diseño Enviado</option>
                              <option value="revision_diseño">En Revisión de Diseño</option>
                              <option value="aprobado">Diseño Aprobado</option>
                              <option value="en_curso">En Ejecución</option>
                              <option value="pausado">Pausado</option>
                              <option value="completado">Completado</option>
                              <option value="cancelado">Cancelado</option>
                              <option value="rechazado">Rechazado</option>
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
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
        isOpen={isDetalleModalOpen}
        onClose={handleCloseDetalle}
      />
    </div>
  );
};

export default ServiciosPage;
