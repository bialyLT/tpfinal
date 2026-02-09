import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Search, Leaf, X } from 'lucide-react';
import { especiesService } from '../services';
import { success, handleApiError } from '../utils/notifications';

const EspeciesPage = () => {
  const [especies, setEspecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEspecie, setSelectedEspecie] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    nombre_especie: '',
    descripcion: '',
  });

  useEffect(() => {
    fetchEspecies();
  }, []);

  const fetchEspecies = async () => {
    try {
      setLoading(true);
      const data = await especiesService.getAll();
      setEspecies(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      handleApiError(error, 'Error al cargar las especies');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (especie = null) => {
    if (especie) {
      setSelectedEspecie(especie);
      setFormData({
        nombre_especie: especie.nombre_especie,
        descripcion: especie.descripcion || '',
      });
    } else {
      setSelectedEspecie(null);
      setFormData({
        nombre_especie: '',
        descripcion: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEspecie(null);
    setFormData({
      nombre_especie: '',
      descripcion: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (selectedEspecie) {
        await especiesService.update(selectedEspecie.id_especie, formData);
        success('Especie actualizada exitosamente');
      } else {
        await especiesService.create(formData);
        success('Especie creada exitosamente');
      }

      handleCloseModal();
      fetchEspecies();
    } catch (error) {
      handleApiError(error, 'Error al guardar la especie');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta especie?')) {
      return;
    }

    try {
      await especiesService.delete(id);
      success('Especie eliminada exitosamente');
      fetchEspecies();
    } catch (error) {
      handleApiError(error, 'Error al eliminar la especie');
    }
  };

  const filteredEspecies = especies.filter((especie) =>
    (especie.nombre_especie || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (especie.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && especies.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-400"></div>
          <p className="text-gray-300 mt-4">Cargando especies...</p>
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
                <Leaf className="w-8 h-8 mr-3 text-green-400" />
                Gestión de Especies
              </h1>
              <p className="text-gray-400">Administra las especies (para productos tipo planta)</p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nueva Especie
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 bg-gray-800 p-4 rounded-lg">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar especies..."
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Descripción</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredEspecies.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-400">
                      {searchTerm ? 'No se encontraron especies' : 'No hay especies registradas'}
                    </td>
                  </tr>
                ) : (
                  filteredEspecies.map((especie) => (
                    <tr key={especie.id_especie} className="hover:bg-gray-750 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-400">#{especie.id_especie}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-white">{especie.nombre_especie}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-300">{especie.descripcion || '-'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleOpenModal(especie)}
                            className="p-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(especie.id_especie)}
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

        {/* Results Count */}
        <div className="mt-4 text-sm text-gray-400 text-center">
          {filteredEspecies.length} especie{filteredEspecies.length !== 1 ? 's' : ''} encontrada{filteredEspecies.length !== 1 ? 's' : ''}
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
                  {selectedEspecie ? 'Editar Especie' : 'Nueva Especie'}
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
                    value={formData.nombre_especie}
                    onChange={(e) => setFormData({ ...formData, nombre_especie: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Ej: Lavanda"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Descripción</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows="3"
                    placeholder="Descripción de la especie"
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
                    {selectedEspecie ? 'Actualizar' : 'Crear'} Especie
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

export default EspeciesPage;
