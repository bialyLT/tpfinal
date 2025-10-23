import React, { useState, useEffect } from 'react';
import { serviciosService } from '../services';
import { useAuth } from '../context/AuthContext';
import { handleApiError } from '../utils/notifications';
import { 
  Palette, Search, Filter, Eye, Calendar, 
  User, DollarSign, CheckCircle, XCircle, 
  Clock, Package, Image as ImageIcon 
} from 'lucide-react';

const DisenosPage = () => {
  const [disenos, setDisenos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [selectedDiseno, setSelectedDiseno] = useState(null);
  const [isDetalleModalOpen, setIsDetalleModalOpen] = useState(false);
  const { user } = useAuth();

  const isAdmin = user?.groups?.includes('Administradores');

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
      'presentado': 'Presentado',
      'aceptado': 'Aceptado',
      'rechazado': 'Rechazado',
      'revision': 'En Revisión',
    };
    return labels[estado] || estado;
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

  const handleVerDetalle = async (disenoId) => {
    try {
      const data = await serviciosService.getDisenoById(disenoId);
      setSelectedDiseno(data);
      setIsDetalleModalOpen(true);
    } catch (error) {
      handleApiError(error, 'Error al cargar el diseño');
    }
  };

  const handlePresentarDiseno = async (disenoId) => {
    if (!window.confirm('¿Está seguro de que desea presentar esta propuesta al cliente? Una vez presentada, el cliente podrá verla y aprobarla o rechazarla.')) {
      return;
    }

    try {
      await serviciosService.presentarDiseno(disenoId);
      // Mostrar mensaje de éxito
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMessage.textContent = '✅ Propuesta presentada al cliente exitosamente';
      document.body.appendChild(successMessage);
      
      setTimeout(() => {
        successMessage.remove();
      }, 3000);
      
      // Recargar la lista de diseños
      fetchDisenos();
    } catch (error) {
      handleApiError(error, 'Error al presentar el diseño');
    }
  };

  const filteredDisenos = disenos.filter(diseno => {
    const matchesSearch = 
      diseno.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      diseno.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      diseno.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEstado = !estadoFilter || diseno.estado === estadoFilter;
    
    return matchesSearch && matchesEstado;
  });

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center">
              <Palette className="w-8 h-8 mr-3 text-green-400" />
              Diseños de Jardines
            </h1>
            <p className="text-gray-400 mt-1">
              {isAdmin 
                ? 'Vista general de todos los diseños creados'
                : 'Mis diseños creados'
              }
            </p>
          </div>
        </div>

      {/* Filtros */}
      <div className="bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por título, descripción o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Filtro de Estado */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="presentado">Presentado</option>
              <option value="aceptado">Aceptado</option>
              <option value="rechazado">Rechazado</option>
              <option value="revision">En Revisión</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Diseños</p>
              <p className="text-2xl font-bold text-white">{disenos.length}</p>
            </div>
            <Palette className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Presentados</p>
              <p className="text-2xl font-bold text-white">
                {disenos.filter(d => d.estado === 'presentado').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Aceptados</p>
              <p className="text-2xl font-bold text-white">
                {disenos.filter(d => d.estado === 'aceptado').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Rechazados</p>
              <p className="text-2xl font-bold text-white">
                {disenos.filter(d => d.estado === 'rechazado').length}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Tabla de Diseños */}
      <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Diseño
                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Diseñador
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Presupuesto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Fecha Creación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredDisenos.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-6 py-8 text-center text-gray-400">
                    <Palette className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No se encontraron diseños</p>
                  </td>
                </tr>
              ) : (
                filteredDisenos.map((diseno) => (
                  <tr key={diseno.id_diseno} className="bg-gray-800 hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-white">{diseno.titulo}</p>
                        <p className="text-xs text-gray-400 mt-1">#{diseno.id_diseno}</p>
                        {diseno.descripcion && (
                          <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                            {diseno.descripcion}
                          </p>
                        )}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="text-white">{diseno.disenador_nombre || 'N/A'}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className="text-white">{diseno.cliente_nombre || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-1 text-green-400" />
                        <span className="text-white font-medium">
                          {formatCurrency(diseno.presupuesto)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getEstadoColor(diseno.estado)}`}>
                        {getEstadoLabel(diseno.estado)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-gray-300 text-sm">
                        <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                        {formatDate(diseno.fecha_creacion)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleVerDetalle(diseno.id_diseno)}
                          className="inline-flex items-center px-3 py-1 text-sm font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver Detalle
                        </button>
                        
                        {/* Botón Presentar Propuesta - Solo para diseños en borrador */}
                        {diseno.estado === 'borrador' && (
                          <button
                            onClick={() => handlePresentarDiseno(diseno.id_diseno)}
                            className="inline-flex items-center px-3 py-1 text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Presentar Propuesta
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

        {/* Modal de Detalle */}
        {isDetalleModalOpen && selectedDiseno && (
          <DisenoDetalleModal
            diseno={selectedDiseno}
            isOpen={isDetalleModalOpen}
            onClose={() => {
              setIsDetalleModalOpen(false);
              setSelectedDiseno(null);
            }}
            onUpdate={fetchDisenos}
          />
        )}
      </div>
    </div>
  );
};

// Modal de Detalle del Diseño
const DisenoDetalleModal = ({ diseno, isOpen, onClose, onUpdate }) => {
  if (!isOpen) return null;

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
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 space-y-6">
          {/* Estado */}
          <div className="flex items-center space-x-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white ${getEstadoColor(diseno.estado)}`}>
              {diseno.estado}
            </span>
            <span className="text-gray-400">Creado: {formatDate(diseno.fecha_creacion)}</span>
          </div>

          {/* Información del Diseño */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <User className="w-5 h-5 mr-2 text-gray-400" />
                <h3 className="font-semibold text-white">Diseñador</h3>
              </div>
              <p className="text-gray-300">{diseno.disenador_nombre || 'N/A'}</p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <User className="w-5 h-5 mr-2 text-gray-400" />
                <h3 className="font-semibold text-white">Cliente</h3>
              </div>
              <p className="text-gray-300">{diseno.cliente_nombre || 'N/A'}</p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <DollarSign className="w-5 h-5 mr-2 text-green-400" />
                <h3 className="font-semibold text-white">Presupuesto</h3>
              </div>
              <p className="text-xl font-bold text-green-400">{formatCurrency(diseno.presupuesto)}</p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Calendar className="w-5 h-5 mr-2 text-gray-400" />
                <h3 className="font-semibold text-white">Servicio</h3>
              </div>
              <p className="text-gray-300">{diseno.servicio_nombre || 'N/A'}</p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Calendar className="w-5 h-5 mr-2 text-blue-400" />
                <h3 className="font-semibold text-white">Fecha Propuesta</h3>
              </div>
              <p className="text-gray-300">
                {diseno.fecha_propuesta 
                  ? new Date(diseno.fecha_propuesta).toLocaleString('es-AR', {
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

          {/* Descripción */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">Descripción</h3>
            <p className="text-gray-300 whitespace-pre-wrap">{diseno.descripcion || 'Sin descripción'}</p>
          </div>

          {/* Productos */}
          {diseno.productos && diseno.productos.length > 0 && (
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <Package className="w-5 h-5 mr-2 text-gray-400" />
                <h3 className="font-semibold text-white">Productos Utilizados</h3>
              </div>
              <div className="space-y-2">
                {diseno.productos.map((producto, index) => (
                  <div key={index} className="flex justify-between items-center bg-gray-600 rounded p-3">
                    <div>
                      <p className="text-white font-medium">{producto.producto_nombre}</p>
                      <p className="text-sm text-gray-400">Cantidad: {producto.cantidad}</p>
                    </div>
                    <p className="text-white font-medium">{formatCurrency(producto.precio_unitario)}</p>
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
                <h3 className="font-semibold text-white">Imágenes del Diseño</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {diseno.imagenes.map((imagen) => (
                  <div key={imagen.id_imagen} className="relative aspect-square rounded-lg overflow-hidden">
                    <img
                      src={imagen.imagen}
                      alt={imagen.descripcion || 'Imagen del diseño'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DisenosPage;
