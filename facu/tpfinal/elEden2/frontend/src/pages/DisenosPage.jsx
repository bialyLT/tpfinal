import React, { useState, useEffect } from 'react';
import { serviciosService } from '../services';
import { useAuth } from '../context/AuthContext';
import { handleApiError } from '../utils/notifications';
import { 
  Palette, Search, Filter, Eye, Calendar, 
  User, DollarSign, CheckCircle, XCircle, 
  Clock, Package, Image as ImageIcon, Edit
} from 'lucide-react';
import CrearDisenoModal from './CrearDisenoModal';
import Pagination from '../components/Pagination';

const DisenosPage = () => {
  const [disenosData, setDisenosData] = useState({
    results: [],
    count: 0,
    total_pages: 0,
    current_page: 1
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [selectedDiseno, setSelectedDiseno] = useState(null);
  const [isDetalleModalOpen, setIsDetalleModalOpen] = useState(false);
  const [isDisenoModalOpen, setIsDisenoModalOpen] = useState(false);
  const [disenoParaEditar, setDisenoParaEditar] = useState(null);
  const [disenosPage, setDisenosPage] = useState(1);
  const [disenosPageSize, setDisenosPageSize] = useState(10);
  const { user } = useAuth();

  const isAdmin = user?.groups?.includes('Administradores');
  const isEmpleado = user?.groups?.includes('Empleados');

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      if (disenosPage !== 1) {
        setDisenosPage(1); // Resetear a primera página cuando se busca
      } else {
        fetchDisenos();
      }
    }, 500); // Esperar 500ms después de que el usuario deje de escribir

    return () => clearTimeout(timer);
  }, [searchTerm, estadoFilter]);

  useEffect(() => {
    fetchDisenos();
  }, [disenosPage, disenosPageSize]);

  const fetchDisenos = async () => {
    try {
      setLoading(true);
      const params = {
        page: disenosPage,
        page_size: disenosPageSize
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      if (estadoFilter) {
        params.estado = estadoFilter;
      }
      
      const data = await serviciosService.getDisenos(params);
      setDisenosData({
        results: data.results || [],
        count: data.count || 0,
        total_pages: data.total_pages || 1,
        current_page: data.current_page || 1
      });
    } catch (error) {
      handleApiError(error, 'Error al cargar los diseños');
    } finally {
      setLoading(false);
    }
  };

  const handleEditarDiseno = (diseno) => {
    console.log('🔧 handleEditarDiseno llamado con:', diseno);
    console.log('🔧 isDisenoModalOpen antes:', isDisenoModalOpen);
    setDisenoParaEditar(diseno);
    setIsDisenoModalOpen(true);
    console.log('🔧 Estado actualizado - isDisenoModalOpen debería ser true');
  };

  const handleCloseDisenoModal = () => {
    console.log('🔧 handleCloseDisenoModal llamado');
    setIsDisenoModalOpen(false);
    setDisenoParaEditar(null);
    fetchDisenos(); // Recargar lista después de editar
  };

  const handleDisenoActualizado = () => {
    console.log('🔧 handleDisenoActualizado llamado');
    fetchDisenos(); // Recargar lista después de actualizar
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Diseños</p>
              <p className="text-2xl font-bold text-white">{disenosData.count}</p>
            </div>
            <Palette className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">En esta página</p>
              <p className="text-2xl font-bold text-white">
                {disenosData.results.length}
              </p>
            </div>
            <Package className="w-8 h-8 text-blue-400" />
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
              {disenosData.results.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-6 py-8 text-center text-gray-400">
                    <Palette className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No se encontraron diseños</p>
                  </td>
                </tr>
              ) : (
                disenosData.results.map((diseno) => (
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
                        
                        {/* Botón Editar - Solo para diseños en borrador y si el usuario es el creador o admin */}
                        {diseno.estado === 'borrador' && (isAdmin || isEmpleado) && (() => {
                          // Los admins siempre pueden editar
                          if (isAdmin) return true;
                          
                          // Los empleados solo pueden editar si son el creador
                          const empleadoId = user?.perfil?.empleado_id || user?.empleado?.id_empleado;
                          if (!empleadoId) return false;
                          
                          return diseno.disenador_id === empleadoId;
                        })() && (
                          <button
                            onClick={() => handleEditarDiseno(diseno)}
                            className="inline-flex items-center px-3 py-1 text-sm font-medium rounded text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </button>
                        )}
                        
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
        
        {/* Paginación */}
        <Pagination
          currentPage={disenosData.current_page}
          totalPages={disenosData.total_pages}
          totalItems={disenosData.count}
          pageSize={disenosPageSize}
          onPageChange={setDisenosPage}
          onPageSizeChange={setDisenosPageSize}
          loading={loading}
        />
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

        {/* Modal de Editar Diseño */}
        {console.log('🔧 Renderizando modal - isOpen:', isDisenoModalOpen, 'diseno:', disenoParaEditar)}
        <CrearDisenoModal
          servicio={null}
          diseno={disenoParaEditar}
          isOpen={isDisenoModalOpen}
          onClose={handleCloseDisenoModal}
          onDisenoCreado={handleDisenoActualizado}
        />
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

          {/* Feedback del Cliente (si existe y el diseño fue rechazado o tiene observaciones) */}
          {diseno.observaciones_cliente && (
            <div className={`rounded-lg p-4 ${
              diseno.estado === 'rechazado' 
                ? 'bg-red-900 bg-opacity-30 border border-red-500' 
                : 'bg-blue-900 bg-opacity-30 border border-blue-500'
            }`}>
              <div className="flex items-start mb-2">
                <User className={`w-5 h-5 mr-2 mt-0.5 ${
                  diseno.estado === 'rechazado' ? 'text-red-400' : 'text-blue-400'
                }`} />
                <div className="flex-1">
                  <h3 className={`font-semibold mb-1 ${
                    diseno.estado === 'rechazado' ? 'text-red-300' : 'text-blue-300'
                  }`}>
                    {diseno.estado === 'rechazado' ? 'Motivo del Rechazo' : 'Observaciones del Cliente'}
                  </h3>
                  <p className="text-gray-300 whitespace-pre-wrap">
                    {(() => {
                      try {
                        // Intentar parsear como JSON por si viene el objeto completo
                        const parsed = JSON.parse(diseno.observaciones_cliente);
                        return parsed.feedback || diseno.observaciones_cliente;
                      } catch {
                        // Si no es JSON, mostrar el texto directamente
                        return diseno.observaciones_cliente;
                      }
                    })()}
                  </p>
                </div>
              </div>
              {diseno.fecha_respuesta && (
                <p className="text-xs text-gray-400 mt-2">
                  Fecha de respuesta: {new Date(diseno.fecha_respuesta).toLocaleString('es-AR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
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
                  <div key={imagen.id_imagen} className="relative aspect-square rounded-lg overflow-hidden group">
                    <img
                      src={imagen.imagen}
                      alt={imagen.descripcion || 'Imagen del diseño'}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-75 transition-opacity"
                      onClick={() => window.open(imagen.imagen, '_blank')}
                    />
                    {imagen.descripcion && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-2 rounded-b-lg">
                        {imagen.descripcion}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Productos */}
          {diseno.productos && diseno.productos.length > 0 && (
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <Package className="w-5 h-5 mr-2 text-gray-400" />
                <h3 className="font-semibold text-white">Productos Utilizados</h3>
              </div>
              <div className="space-y-3">
                {diseno.productos.map((producto, index) => {
                  const cantidad = parseInt(producto.cantidad) || 0;
                  const precioUnitario = parseFloat(producto.precio_unitario) || 0;
                  const subtotal = cantidad * precioUnitario;
                  
                  return (
                    <div key={index} className="bg-gray-600 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="text-white font-semibold text-lg">{producto.producto_nombre}</p>
                          {producto.producto_codigo && (
                            <p className="text-xs text-gray-400 mt-1">Código: {producto.producto_codigo}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-gray-500">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Cantidad</p>
                          <p className="text-white font-medium">{cantidad} unidad{cantidad !== 1 ? 'es' : ''}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Precio Unitario</p>
                          <p className="text-white font-medium">{formatCurrency(precioUnitario)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400 mb-1">Subtotal</p>
                          <p className="text-green-400 font-bold text-lg">{formatCurrency(subtotal)}</p>
                        </div>
                      </div>
                      
                      {producto.notas && (
                        <div className="mt-3 pt-3 border-t border-gray-500">
                          <p className="text-xs text-gray-400 mb-1">Notas</p>
                          <p className="text-gray-300 text-sm">{producto.notas}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Total de Productos */}
              <div className="mt-4 pt-4 border-t border-gray-600">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Subtotal Productos:</span>
                  <span className="text-white font-bold text-lg">
                    {formatCurrency(
                      diseno.productos.reduce((total, prod) => {
                        const cantidad = parseInt(prod.cantidad) || 0;
                        const precio = parseFloat(prod.precio_unitario) || 0;
                        return total + (cantidad * precio);
                      }, 0)
                    )}
                  </span>
                </div>
              </div>
              
              {/* Costo de Mano de Obra (Presupuesto - Subtotal Productos) */}
              <div className="mt-3 pt-3 border-t border-gray-600">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-blue-400" />
                    <span className="text-gray-300 font-medium">Mano de Obra:</span>
                  </div>
                  <span className="text-white font-bold text-lg">
                    {formatCurrency(
                      Math.max(0, (parseFloat(diseno.presupuesto) || 0) - diseno.productos.reduce((total, prod) => {
                        const cantidad = parseInt(prod.cantidad) || 0;
                        const precio = parseFloat(prod.precio_unitario) || 0;
                        return total + (cantidad * precio);
                      }, 0))
                    )}
                  </span>
                </div>
              </div>
              
              {/* Total Final de la Propuesta */}
              <div className="mt-4 pt-4 border-t-2 border-green-500 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <DollarSign className="w-6 h-6 mr-2 text-green-400" />
                    <span className="text-white font-bold text-lg">TOTAL DE LA PROPUESTA:</span>
                  </div>
                  <span className="text-green-400 font-bold text-2xl">
                    {formatCurrency(parseFloat(diseno.presupuesto) || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DisenosPage;
