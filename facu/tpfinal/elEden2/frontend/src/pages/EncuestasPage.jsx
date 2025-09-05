import React, { useState, useEffect } from 'react';
import { encuestasService } from '../services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Star, 
  Eye,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  BarChart3,
  Users,
  FileText,
  TrendingUp
} from 'lucide-react';

const EncuestasPage = () => {
  const [encuestas, setEncuestas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');
  const { user } = useAuth();

  // Determinar permisos del usuario
  const isAdmin = user?.perfil?.tipo_usuario === 'administrador' || 
                  user?.groups?.includes('Administradores') || 
                  user?.is_staff || 
                  user?.is_superuser;
  
  const isEmpleado = user?.perfil?.tipo_usuario === 'empleado' || 
                    user?.groups?.includes('Empleados') || 
                    user?.is_staff;

  useEffect(() => {
    fetchEncuestas();
  }, []);

  const fetchEncuestas = async () => {
    try {
      setLoading(true);
      const data = await encuestasService.getEncuestas();
      setEncuestas(data.results || data || []);
    } catch (error) {
      toast.error('Error al cargar las encuestas');
      console.error('Error fetching encuestas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCalificacionStars = (calificacion) => {
    const stars = [];
    const rating = calificacion || 0;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-4 h-4 ${i <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
        />
      );
    }
    return stars;
  };

  const getEstadoBadge = (estado) => {
    const estados = {
      'enviada': { color: 'bg-blue-100 text-blue-800', icon: <Send className="w-3 h-3" />, text: 'Enviada' },
      'respondida': { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" />, text: 'Respondida' },
      'expirada': { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3" />, text: 'Expirada' },
      'pendiente': { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3" />, text: 'Pendiente' }
    };
    
    const estadoInfo = estados[estado] || estados['pendiente'];
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${estadoInfo.color}`}>
        {estadoInfo.icon}
        {estadoInfo.text}
      </span>
    );
  };

  const getPromedioCalificaciones = () => {
    const encuestasRespondidas = encuestas.filter(e => e.estado === 'respondida' && e.puntuacion_general);
    if (encuestasRespondidas.length === 0) return 0;
    const total = encuestasRespondidas.reduce((sum, encuesta) => sum + (encuesta.puntuacion_general || 0), 0);
    return (total / encuestasRespondidas.length).toFixed(1);
  };

  const filteredEncuestas = encuestas.filter(encuesta => {
    const matchesSearch = encuesta.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         encuesta.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         encuesta.servicio_titulo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = !selectedEstado || encuesta.estado === selectedEstado;
    return matchesSearch && matchesEstado;
  });

  const stats = [
    {
      title: 'Total Encuestas',
      value: encuestas.length,
      icon: <FileText className="w-6 h-6 text-blue-600" />,
      color: 'border-blue-200 bg-blue-50'
    },
    {
      title: 'Respondidas',
      value: encuestas.filter(e => e.estado === 'respondida').length,
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      color: 'border-green-200 bg-green-50'
    },
    {
      title: 'Promedio General',
      value: getPromedioCalificaciones(),
      icon: <Star className="w-6 h-6 text-yellow-600" />,
      color: 'border-yellow-200 bg-yellow-50'
    },
    {
      title: 'Pendientes',
      value: encuestas.filter(e => e.estado === 'enviada').length,
      icon: <Clock className="w-6 h-6 text-orange-600" />,
      color: 'border-orange-200 bg-orange-50'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando encuestas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <ClipboardList className="w-8 h-8 text-blue-600" />
                {isAdmin || isEmpleado ? 'Gestión de Encuestas' : 'Mis Evaluaciones'}
              </h1>
              <p className="mt-1 text-gray-600">
                {isAdmin || isEmpleado 
                  ? 'Gestiona y analiza las encuestas de satisfacción de los clientes' 
                  : 'Revisa y completa tus encuestas pendientes'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards - Solo para admin/empleados */}
        {(isAdmin || isEmpleado) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className={`bg-white p-6 rounded-lg shadow-sm border-2 ${stat.color}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  {stat.icon}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar encuestas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedEstado}
                onChange={(e) => setSelectedEstado(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="">Todos los estados</option>
                <option value="enviada">Enviadas</option>
                <option value="respondida">Respondidas</option>
                <option value="expirada">Expiradas</option>
                <option value="pendiente">Pendientes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Encuestas List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {filteredEncuestas.length} Encuestas {selectedEstado && `- ${selectedEstado}`}
            </h2>
          </div>
          
          {filteredEncuestas.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay encuestas</h3>
              <p className="text-gray-600">
                {searchTerm || selectedEstado 
                  ? 'No se encontraron encuestas con los filtros aplicados.'
                  : isAdmin || isEmpleado 
                    ? 'Aún no se han generado encuestas de satisfacción.'
                    : 'No tienes encuestas pendientes o completadas.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredEncuestas.map(encuesta => (
                <div key={encuesta.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {encuesta.titulo || `Encuesta #${encuesta.id}`}
                        </h3>
                        {getEstadoBadge(encuesta.estado)}
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">Cliente:</span> {encuesta.cliente_nombre || 'No especificado'}
                        </p>
                        <p>
                          <span className="font-medium">Servicio:</span> {encuesta.servicio_titulo || 'No especificado'}
                        </p>
                        <p>
                          <span className="font-medium">Fecha de envío:</span> {
                            encuesta.fecha_envio ? new Date(encuesta.fecha_envio).toLocaleDateString() : 'No enviada'
                          }
                        </p>
                        {encuesta.fecha_respuesta && (
                          <p>
                            <span className="font-medium">Fecha de respuesta:</span> {
                              new Date(encuesta.fecha_respuesta).toLocaleDateString()
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {encuesta.estado === 'respondida' && encuesta.puntuacion_general && (
                        <div className="text-center">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {encuesta.puntuacion_general}/5
                            </span>
                            <div className="flex">
                              {getCalificacionStars(encuesta.puntuacion_general)}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">Calificación</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
                          <Eye className="w-4 h-4" />
                          Ver Detalles
                        </button>
                        
                        {encuesta.estado === 'enviada' && !isAdmin && !isEmpleado && (
                          <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                            <ClipboardList className="w-4 h-4" />
                            Completar
                          </button>
                        )}
                        
                        {(isAdmin || isEmpleado) && (
                          <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                            <BarChart3 className="w-4 h-4" />
                            Analizar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {encuesta.estado === 'respondida' && encuesta.comentarios_adicionales && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Comentarios adicionales:</h4>
                      <p className="text-gray-700 italic">"{encuesta.comentarios_adicionales}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EncuestasPage;