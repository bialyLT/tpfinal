import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit, Trash2, Search, ListChecks, X } from 'lucide-react';
import { tareasService } from '../services';
import { success, handleApiError } from '../utils/notifications';

const TareasPage = () => {
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTarea, setSelectedTarea] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    nombre: '',
    duracion_base: 0,
    cantidad_personal_minimo: 1,
  });

  useEffect(() => {
    fetchTareas();
  }, []);

  const fetchTareas = async () => {
    try {
      setLoading(true);
      const data = await tareasService.getAll();
      setTareas(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      handleApiError(error, 'Error al cargar las tareas');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (tarea = null) => {
    if (tarea) {
      setSelectedTarea(tarea);
      setFormData({
        nombre: tarea.nombre || '',
        duracion_base: Number(tarea.duracion_base ?? 0),
        cantidad_personal_minimo: Number(tarea.cantidad_personal_minimo ?? 1),
      });
    } else {
      setSelectedTarea(null);
      setFormData({
        nombre: '',
        duracion_base: 0,
        cantidad_personal_minimo: 1,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTarea(null);
    setFormData({
      nombre: '',
      duracion_base: 0,
      cantidad_personal_minimo: 1,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      nombre: formData.nombre,
      duracion_base: Number(formData.duracion_base),
      cantidad_personal_minimo: Number(formData.cantidad_personal_minimo),
    };

    try {
      if (selectedTarea) {
        await tareasService.update(selectedTarea.id_tarea, payload);
        success('Tarea actualizada exitosamente');
      } else {
        await tareasService.create(payload);
        success('Tarea creada exitosamente');
      }

      handleCloseModal();
      fetchTareas();
    } catch (error) {
      handleApiError(error, 'Error al guardar la tarea');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta tarea?')) {
      return;
    }

    try {
      await tareasService.delete(id);
      success('Tarea eliminada exitosamente');
      fetchTareas();
    } catch (error) {
      handleApiError(error, 'Error al eliminar la tarea');
    }
  };

  const filteredTareas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return tareas;
    return tareas.filter((t) => (t.nombre || '').toLowerCase().includes(term));
  }, [tareas, searchTerm]);

  if (loading && tareas.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-400"></div>
          <p className="text-gray-300 mt-4">Cargando tareas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                <ListChecks className="w-8 h-8 mr-3 text-green-400" />
                Gestión de Tareas
              </h1>
              <p className="text-gray-400">Administra tareas asociables a productos</p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nueva Tarea
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 bg-gray-800 p-4 rounded-lg">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar tareas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Duración (min)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Personal mín.</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredTareas.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                      {searchTerm ? 'No se encontraron tareas' : 'No hay tareas registradas'}
                    </td>
                  </tr>
                ) : (
                  filteredTareas.map((tarea) => (
                    <tr key={tarea.id_tarea} className="hover:bg-gray-750 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-400">#{tarea.id_tarea}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-white">{tarea.nombre}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-300">{tarea.duracion_base}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-300">{tarea.cantidad_personal_minimo}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleOpenModal(tarea)}
                            className="p-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tarea.id_tarea)}
                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-400 text-center">
          {filteredTareas.length} tarea{filteredTareas.length !== 1 ? 's' : ''} encontrada{filteredTareas.length !== 1 ? 's' : ''}
        </div>

        {/* Modal */}
        {showModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleCloseModal}
          >
            <div
              className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h3 className="text-xl font-bold text-white">
                  {selectedTarea ? 'Editar Tarea' : 'Nueva Tarea'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nombre *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Ej: Poda"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Duración base (min) *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.duracion_base}
                    onChange={(e) => setFormData({ ...formData, duracion_base: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Personal mínimo *</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.cantidad_personal_minimo}
                    onChange={(e) => setFormData({ ...formData, cantidad_personal_minimo: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {selectedTarea ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TareasPage;
