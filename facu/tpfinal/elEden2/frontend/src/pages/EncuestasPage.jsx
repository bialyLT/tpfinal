import React, { useState, useEffect } from 'react';
import { encuestasService } from '../services';
import { useAuth } from '../context/AuthContext';
import { handleApiError, success } from '../utils/notifications';
import { 
  ClipboardDocumentListIcon, 
  FunnelIcon, 
  MagnifyingGlassIcon,
  StarIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const EncuestasPage = () => {
  const [encuestas, setEncuestas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const { user } = useAuth();

  const isAdmin = user?.groups?.includes('Administradores');
  const isEmpleado = user?.groups?.includes('Empleados');

  useEffect(() => {
    fetchEncuestas();
  }, []);

  const fetchEncuestas = async () => {
    try {
      setLoading(true);
      const data = await encuestasService.getEncuestas();
      setEncuestas(data.results || data);
    } catch (error) {
      handleApiError(error, 'Error al cargar las encuestas');
    } finally {
      setLoading(false);
    }
  };

  const getCalificacionStars = (calificacion) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        i <= calificacion ? (
          <StarIconSolid key={i} className="w-4 h-4 text-yellow-400" />
        ) : (
          <StarIcon key={i} className="w-4 h-4 text-gray-500" />
        )
      );
    }
    return stars;
  };

  const getPromedioCalificaciones = () => {
    if (encuestas.length === 0) return 0;
    const encuestasCompletas = encuestas.filter(e => e.estado === 'respondida' && e.puntuacion_general);
    if (encuestasCompletas.length === 0) return 0;
    const total = encuestasCompletas.reduce((sum, encuesta) => sum + (encuesta.puntuacion_general || 0), 0);
    return (total / encuestasCompletas.length).toFixed(1);
  };

  const getEstadoColor = (estado) => {
    const colors = {
      'enviada': 'bg-blue-500',
      'respondida': 'bg-green-500',
      'expirada': 'bg-red-500'
    };
    return colors[estado] || 'bg-gray-500';
  };

  const getEstadoLabel = (estado) => {
    const labels = {
      'enviada': 'Enviada',
      'respondida': 'Completada',
      'expirada': 'Expirada'
    };
    return labels[estado] || estado;
  };

  const filteredEncuestas = encuestas.filter(encuesta => {
    const matchesSearch = encuesta.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         encuesta.servicio?.solicitud?.titulo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || encuesta.estado === statusFilter;
    return matchesSearch && matchesStatus;
  });
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-400"></div>
          <p className="text-gray-300 mt-4">Cargando encuestas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <ClipboardDocumentListIcon className="w-8 h-8 text-green-400" />
            <h1 className="text-3xl font-bold text-white">
              {isAdmin || isEmpleado ? 'Encuestas de Satisfacción' : 'Mis Evaluaciones'}
            </h1>
          </div>
          <p className="text-gray-400">
            {isAdmin || isEmpleado ? 'Gestión y análisis de encuestas de satisfacción del cliente' : 'Encuestas que has completado'}
          </p>
        </div>

        {/* Stats Cards */}
        {(isAdmin || isEmpleado) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Encuestas</p>
                  <p className="text-2xl font-bold text-white">{encuestas.length}</p>
                </div>
                <ChartBarIcon className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Promedio General</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-white">{getPromedioCalificaciones()}</p>
                    <div className="flex">
                      {getCalificacionStars(Math.round(getPromedioCalificaciones()))}
                    </div>
                  </div>
                </div>
                <StarIconSolid className="w-8 h-8 text-yellow-400" />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Completadas</p>
                  <p className="text-2xl font-bold text-green-400">
                    {encuestas.filter(e => e.estado === 'respondida').length}
                  </p>
                </div>
                <CheckCircleIcon className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {encuestas.filter(e => e.estado === 'enviada').length}
                  </p>
                </div>
                <ClockIcon className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar encuestas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <FunnelIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Todos los estados</option>
                <option value="enviada">Enviadas</option>
                <option value="respondida">Completadas</option>
                <option value="expirada">Expiradas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Encuestas List */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-6">
            <h2 className="text-xl font-bold text-white mb-6">
              Lista de Encuestas ({filteredEncuestas.length})
            </h2>
            
            {filteredEncuestas.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardDocumentListIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-400 mb-2">
                  {searchTerm || statusFilter ? 'No se encontraron encuestas' : 'No hay encuestas'}
                </h3>
                <p className="text-gray-500">
                  {searchTerm || statusFilter 
                    ? 'Intenta ajustar los filtros de búsqueda'
                    : isAdmin || isEmpleado 
                      ? 'Aún no se han generado encuestas de satisfacción.'
                      : 'No tienes encuestas pendientes o completadas.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEncuestas.map(encuesta => (
                  <div key={encuesta.id} className="bg-gray-700 rounded-lg p-6 border border-gray-600">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg text-white">
                            {encuesta.titulo || `Encuesta #${encuesta.id}`}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getEstadoColor(encuesta.estado)}`}>
                            {getEstadoLabel(encuesta.estado)}
                          </span>
                        </div>
                        <p className="text-gray-300 mb-1">
                          Servicio: {encuesta.servicio?.solicitud?.titulo || 'No especificado'}
                        </p>
                        <p className="text-sm text-gray-400 mb-1">
                          Cliente: {encuesta.cliente?.first_name && encuesta.cliente?.last_name 
                            ? `${encuesta.cliente.first_name} ${encuesta.cliente.last_name}`
                            : encuesta.cliente?.username || 'No especificado'}
                        </p>
                        <p className="text-sm text-gray-400">
                          Fecha: {new Date(encuesta.fecha_envio).toLocaleDateString('es-ES')}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        {encuesta.estado === 'respondida' && encuesta.puntuacion_general && (
                          <div className="text-center">
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-sm font-medium text-white">
                                {encuesta.puntuacion_general}/5
                              </span>
                              <div className="flex">
                                {getCalificacionStars(encuesta.puntuacion_general)}
                              </div>
                            </div>
                          </div>
                        )}

                        <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors">
                          <EyeIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {encuesta.estado === 'respondida' && encuesta.comentarios && (
                      <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
                        <h4 className="font-medium text-gray-300 mb-2">Comentarios:</h4>
                        <p className="text-gray-400 italic">"{encuesta.comentarios}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EncuestasPage;
