import { useState, useEffect } from 'react';
import { success, handleApiError } from '../utils/notifications';
import { Plus, Edit, Trash2, Search, Users, X, Phone, Mail, MapPin } from 'lucide-react';
import { proveedoresService } from '../services';

const ProveedoresPage = () => {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    razon_social: '',
    nombre_contacto: '',
    telefono: '',
    email: '',
    direccion: '',
    cuit: ''
  });

  useEffect(() => {
    fetchProveedores();
  }, []);

  const fetchProveedores = async () => {
    try {
      setLoading(true);
      const data = await proveedoresService.getAll();
      setProveedores(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      handleApiError(error, 'Error al cargar los proveedores');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (proveedor = null) => {
    if (proveedor) {
      setSelectedProveedor(proveedor);
      setFormData({
        razon_social: proveedor.razon_social || '',
        nombre_contacto: proveedor.nombre_contacto || '',
        telefono: proveedor.telefono || '',
        email: proveedor.email || '',
        direccion: proveedor.direccion || '',
        cuit: proveedor.cuit || ''
      });
    } else {
      setSelectedProveedor(null);
      setFormData({
        razon_social: '',
        nombre_contacto: '',
        telefono: '',
        email: '',
        direccion: '',
        cuit: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProveedor(null);
    setFormData({
      razon_social: '',
      nombre_contacto: '',
      telefono: '',
      email: '',
      direccion: '',
      cuit: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (selectedProveedor) {
        await proveedoresService.update(selectedProveedor.id_proveedor, formData);
        success('Proveedor actualizado exitosamente');
      } else {
        await proveedoresService.create(formData);
        success('Proveedor creado exitosamente');
      }

      handleCloseModal();
      fetchProveedores();
    } catch (error) {
      handleApiError(error, 'Error al guardar el proveedor');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este proveedor?')) {
      return;
    }

    try {
      await proveedoresService.delete(id);
      success('Proveedor eliminado exitosamente');
      fetchProveedores();
    } catch (error) {
      handleApiError(error, 'Error al eliminar el proveedor');
    }
  };

  const filteredProveedores = proveedores.filter(proveedor =>
    proveedor.razon_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proveedor.nombre_contacto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proveedor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proveedor.cuit?.includes(searchTerm)
  );

  if (loading && proveedores.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-400"></div>
          <p className="text-gray-300 mt-4">Cargando proveedores...</p>
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
                <Users className="w-8 h-8 mr-3 text-green-400" />
                Gestión de Proveedores
              </h1>
              <p className="text-gray-400">Administra los proveedores de productos</p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuevo Proveedor
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 bg-gray-800 p-4 rounded-lg">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar proveedores..."
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Razón Social</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Contacto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Teléfono</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredProveedores.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                      {searchTerm ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}
                    </td>
                  </tr>
                ) : (
                  filteredProveedores.map((proveedor) => (
                    <tr key={proveedor.id_proveedor} className="hover:bg-gray-750 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-400">#{proveedor.id_proveedor}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-white">{proveedor.razon_social}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-300">{proveedor.nombre_contacto || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-300">
                          <Mail className="w-4 h-4 mr-1" />
                          {proveedor.email || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-300">
                          <Phone className="w-4 h-4 mr-1" />
                          {proveedor.telefono || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleOpenModal(proveedor)}
                            className="p-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(proveedor.id_proveedor)}
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
          {filteredProveedores.length} proveedor{filteredProveedores.length !== 1 ? 'es' : ''} encontrado{filteredProveedores.length !== 1 ? 's' : ''}
        </div>

        {/* Modal */}
        {showModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleCloseModal}
          >
            <div 
              className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h3 className="text-xl font-bold text-white">
                  {selectedProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Razón Social *
                    </label>
                    <input
                      type="text"
                      value={formData.razon_social}
                      onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Ej: Vivero San José S.A."
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      CUIT *
                    </label>
                    <input
                      type="text"
                      value={formData.cuit}
                      onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="XX-XXXXXXXX-X"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nombre de Contacto
                    </label>
                    <input
                      type="text"
                      value={formData.nombre_contacto}
                      onChange={(e) => setFormData({ ...formData, nombre_contacto: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Ej: +54 11 1234-5678"
                      required
                    />
                  </div>

                  <div className="mb-4 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Ej: contacto@proveedor.com"
                      required
                    />
                  </div>

                  <div className="mb-6 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Dirección
                    </label>
                    <textarea
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      rows="2"
                      placeholder="Dirección completa"
                    />
                  </div>
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
                    {selectedProveedor ? 'Actualizar' : 'Crear'}
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

export default ProveedoresPage;
