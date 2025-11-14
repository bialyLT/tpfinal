import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight, Eye, BarChart3 } from 'lucide-react';
import api from '../services/api';
import CrearEncuestaModal from './CrearEncuestaModal';
import VerEncuestaModal from './VerEncuestaModal';

const GestionEncuestasPage = () => {
  const [encuestas, setEncuestas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [showVerModal, setShowVerModal] = useState(false);
  const [encuestaSeleccionada, setEncuestaSeleccionada] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [filtroActiva, setFiltroActiva] = useState('todas');

  const cargarEncuestas = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/encuestas/';
      
      if (filtroActiva === 'activas') {
        url += '?activa=true';
      } else if (filtroActiva === 'inactivas') {
        url += '?activa=false';
      }

      const response = await api.get(url);
      // DRF devuelve un objeto paginado con 'results'
      setEncuestas(response.data.results || response.data);
    } catch (error) {
      console.error('Error al cargar encuestas:', error);
    } finally {
      setLoading(false);
    }
  }, [filtroActiva]);

  useEffect(() => {
    cargarEncuestas();
  }, [filtroActiva, cargarEncuestas]);

  const handleCrear = () => {
    setModoEdicion(false);
    setEncuestaSeleccionada(null);
    setShowCrearModal(true);
  };

  const handleEditar = async (id) => {
    try {
      const response = await api.get(`/encuestas/${id}/`);
      setModoEdicion(true);
      setEncuestaSeleccionada(response.data);
      setShowCrearModal(true);
    } catch (error) {
      console.error('Error al cargar encuesta:', error);
      alert('Error al cargar la encuesta');
    }
  };

  const handleVer = async (id) => {
    try {
      const response = await api.get(`/encuestas/${id}/`);
      setEncuestaSeleccionada(response.data);
      setShowVerModal(true);
    } catch (error) {
      console.error('Error al cargar encuesta:', error);
      alert('Error al cargar la encuesta');
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta encuesta? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await api.delete(`/encuestas/${id}/`);
      cargarEncuestas();
    } catch (error) {
      console.error('Error al eliminar encuesta:', error);
      alert('Error al eliminar la encuesta');
    }
  };

  const handleToggleActiva = async (encuesta) => {
    try {
      await api.post(`/encuestas/${encuesta.id_encuesta}/toggle_activa/`);
      cargarEncuestas();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('Error al cambiar el estado de la encuesta');
    }
  };

  const encuestasFiltradas = encuestas.filter(encuesta =>
    encuesta.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    encuesta.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 mb-6 border border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Gestión de Encuestas</h1>
              <p className="text-gray-400">Administra las encuestas personalizadas</p>
            </div>
            <button
              onClick={handleCrear}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nueva Encuesta
            </button>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 mb-6 border border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar encuestas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFiltroActiva('todas')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filtroActiva === 'todas'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFiltroActiva('activas')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filtroActiva === 'activas'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Activas
              </button>
              <button
                onClick={() => setFiltroActiva('inactivas')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filtroActiva === 'inactivas'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Inactivas
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Encuestas */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Cargando encuestas...</p>
          </div>
        ) : encuestasFiltradas.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-12 text-center border border-gray-700">
            <p className="text-gray-400 text-lg">No se encontraron encuestas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {encuestasFiltradas.map((encuesta) => (
              <div
                key={encuesta.id_encuesta}
                className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      encuesta.activa
                        ? 'bg-green-900/50 text-green-400 border border-green-500'
                        : 'bg-red-900/50 text-red-400 border border-red-500'
                    }`}
                  >
                    {encuesta.activa ? 'Activa' : 'Inactiva'}
                  </span>
                  <button
                    onClick={() => handleToggleActiva(encuesta)}
                    className="text-gray-400 hover:text-white transition-colors"
                    title={encuesta.activa ? 'Desactivar' : 'Activar'}
                  >
                    {encuesta.activa ? (
                      <ToggleRight className="w-6 h-6 text-green-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-gray-400" />
                    )}
                  </button>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{encuesta.titulo}</h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {encuesta.descripcion || 'Sin descripción'}
                </p>

                <div className="flex gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1 text-blue-400">
                    <Eye className="w-4 h-4" />
                    <span>{encuesta.total_preguntas} preguntas</span>
                  </div>
                  <div className="flex items-center gap-1 text-green-400">
                    <BarChart3 className="w-4 h-4" />
                    <span>{encuesta.total_respuestas} respuestas</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-4">
                  Creada: {new Date(encuesta.fecha_creacion).toLocaleDateString('es-ES')}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleVer(encuesta.id_encuesta)}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    Ver
                  </button>
                  <button
                    onClick={() => handleEditar(encuesta.id_encuesta)}
                    className="flex items-center justify-center bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEliminar(encuesta.id_encuesta)}
                    className="flex items-center justify-center bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modales */}
      {showCrearModal && (
        <CrearEncuestaModal
          show={showCrearModal}
          onClose={() => {
            setShowCrearModal(false);
            setEncuestaSeleccionada(null);
            setModoEdicion(false);
          }}
          onSuccess={() => {
            cargarEncuestas();
            setShowCrearModal(false);
            setEncuestaSeleccionada(null);
            setModoEdicion(false);
          }}
          encuesta={encuestaSeleccionada}
          modoEdicion={modoEdicion}
        />
      )}

      {showVerModal && (
        <VerEncuestaModal
          show={showVerModal}
          onClose={() => {
            setShowVerModal(false);
            setEncuestaSeleccionada(null);
          }}
          encuesta={encuestaSeleccionada}
        />
      )}
    </div>
  );
};

export default GestionEncuestasPage;
