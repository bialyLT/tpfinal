import React, { useState, useEffect } from 'react';
import { usersService } from '../services';
import { useAuth } from '../context/AuthContext';
import { handleApiError, success } from '../utils/notifications';
import { 
  UsersIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const EmpleadosPage = () => {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmpleado, setSelectedEmpleado] = useState(null);
  const { user } = useAuth();

  // Form data for new/edit employee
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    is_active: true,
    groups: ['Empleados']
  });

  const isAdmin = user?.groups?.includes('Administradores');

  // Redirigir si no es admin
  useEffect(() => {
    if (user && !isAdmin) {
      window.location.href = '/dashboard';
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchEmpleados();
    }
  }, [isAdmin]);

  const fetchEmpleados = async () => {
    try {
      setLoading(true);
      const data = await usersService.getUsers({ tipo_usuario: 'empleado' });
      setEmpleados(data.results || data);
    } catch (error) {
      handleApiError(error, 'Error al cargar los empleados');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddEmpleado = async (e) => {
    e.preventDefault();
    try {
      const empleadoData = {
        ...formData,
        perfil: {
          tipo_usuario: 'empleado'
        }
      };
      
      await usersService.createUser(empleadoData);
      success('Empleado creado exitosamente');
      setShowAddModal(false);
      setFormData({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        is_active: true,
        groups: ['Empleados']
      });
      fetchEmpleados();
    } catch (error) {
      handleApiError(error, 'Error al crear el empleado');
    }
  };

  const handleEditEmpleado = async (e) => {
    e.preventDefault();
    try {
      await usersService.updateUser(selectedEmpleado.id, formData);
      success('Empleado actualizado exitosamente');
      setShowEditModal(false);
      setSelectedEmpleado(null);
      fetchEmpleados();
    } catch (error) {
      handleApiError(error, 'Error al actualizar el empleado');
    }
  };

  const handleToggleStatus = async (empleado) => {
    try {
      await usersService.cambiarEstadoUsuario(empleado.id, !empleado.is_active);
      success(`Empleado ${!empleado.is_active ? 'activado' : 'desactivado'} exitosamente`);
      fetchEmpleados();
    } catch (error) {
      handleApiError(error, 'Error al cambiar el estado del empleado');
    }
  };

  const openEditModal = (empleado) => {
    setSelectedEmpleado(empleado);
    setFormData({
      username: empleado.username,
      email: empleado.email,
      first_name: empleado.first_name || '',
      last_name: empleado.last_name || '',
      is_active: empleado.is_active,
      groups: empleado.groups || ['Empleados']
    });
    setShowEditModal(true);
  };

  const filteredEmpleados = empleados.filter(empleado => {
    const matchesSearch = 
      empleado.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empleado.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empleado.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empleado.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === '' || 
      (statusFilter === 'active' && empleado.is_active) ||
      (statusFilter === 'inactive' && !empleado.is_active);
    
    return matchesSearch && matchesStatus;
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <ShieldCheckIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Acceso Denegado</h2>
          <p className="text-gray-400">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-400"></div>
          <p className="text-gray-300 mt-4">Cargando empleados...</p>
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
            <div className="flex items-center gap-3">
              <UserGroupIcon className="w-8 h-8 text-green-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">Gestión de Empleados</h1>
                <p className="text-gray-400">Administra los empleados del sistema</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Agregar Empleado
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Empleados</p>
                <p className="text-2xl font-bold text-white">{empleados.length}</p>
              </div>
              <UsersIcon className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Activos</p>
                <p className="text-2xl font-bold text-green-400">
                  {empleados.filter(e => e.is_active).length}
                </p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Inactivos</p>
                <p className="text-2xl font-bold text-red-400">
                  {empleados.filter(e => !e.is_active).length}
                </p>
              </div>
              <XCircleIcon className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar empleados..."
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
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Empleados Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-6">
            <h2 className="text-xl font-bold text-white mb-6">
              Lista de Empleados ({filteredEmpleados.length})
            </h2>

            {filteredEmpleados.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-400 mb-2">
                  {searchTerm || statusFilter ? 'No se encontraron empleados' : 'No hay empleados'}
                </h3>
                <p className="text-gray-500">
                  {searchTerm || statusFilter 
                    ? 'Intenta ajustar los filtros de búsqueda'
                    : 'Haz clic en "Agregar Empleado" para crear el primer empleado.'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-400">Usuario</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-400">Nombre</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-400">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-400">Estado</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-400">Fecha Registro</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-400">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmpleados.map(empleado => (
                      <tr key={empleado.id} className="border-b border-gray-700 hover:bg-gray-700">
                        <td className="py-3 px-4">
                          <div className="font-medium text-white">{empleado.username}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-gray-300">
                            {empleado.first_name && empleado.last_name 
                              ? `${empleado.first_name} ${empleado.last_name}`
                              : 'No especificado'
                            }
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-gray-300">{empleado.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            empleado.is_active 
                              ? 'bg-green-600 text-white' 
                              : 'bg-red-600 text-white'
                          }`}>
                            {empleado.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-gray-300">
                            {new Date(empleado.date_joined).toLocaleDateString('es-ES')}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(empleado)}
                              className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-600 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(empleado)}
                              className={`p-2 rounded-lg transition-colors ${
                                empleado.is_active
                                  ? 'text-red-400 hover:text-red-300 hover:bg-gray-600'
                                  : 'text-green-400 hover:text-green-300 hover:bg-gray-600'
                              }`}
                              title={empleado.is_active ? 'Desactivar' : 'Activar'}
                            >
                              {empleado.is_active ? (
                                <XCircleIcon className="w-4 h-4" />
                              ) : (
                                <CheckCircleIcon className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Add Employee Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-xl font-bold text-white mb-4">Agregar Nuevo Empleado</h3>
              <form onSubmit={handleAddEmpleado}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Usuario
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Nombre
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Apellido
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="mr-2 text-green-600 focus:ring-green-500"
                    />
                    <label className="text-sm text-gray-300">Usuario activo</label>
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Crear Empleado
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Employee Modal */}
        {showEditModal && selectedEmpleado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-xl font-bold text-white mb-4">Editar Empleado</h3>
              <form onSubmit={handleEditEmpleado}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Usuario
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Nombre
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Apellido
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="mr-2 text-green-600 focus:ring-green-500"
                    />
                    <label className="text-sm text-gray-300">Usuario activo</label>
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Actualizar
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

export default EmpleadosPage;
