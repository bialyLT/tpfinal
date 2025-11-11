import React, { useState, useEffect } from 'react';
import { usersService } from '../services';
import api from '../services/api';
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
  
  // Reference data
  const [generos, setGeneros] = useState([]);
  const [tiposDocumento, setTiposDocumento] = useState([]);

  // Form data for new/edit employee
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    nro_documento: '',
    tipo_documento_id: '',
    genero_id: '',
    is_active: true,
    groups: ['Empleados']
  });

  const isAdmin = user.is_staff || user.is_superuser || user.perfil?.tipo_usuario === 'administrador' || user.groups?.includes('Administradores');

  // Redirigir si no es admin
  useEffect(() => {
    if (user && !isAdmin) {
      window.location.href = '/dashboard';
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchEmpleados();
      fetchReferenceData();
    }
  }, [isAdmin]);

  const fetchReferenceData = async () => {
    try {
      console.log('🔍 Fetching reference data...');
      const response = await api.get('/reference-data/');
      console.log('📦 Reference data response:', response.data);
      setGeneros(response.data.generos || []);
      setTiposDocumento(response.data.tipos_documento || []);
      console.log('✅ Géneros cargados:', response.data.generos?.length || 0);
      console.log('✅ Tipos documento cargados:', response.data.tipos_documento?.length || 0);
    } catch (error) {
      console.error('❌ Error al cargar datos de referencia:', error);
      console.error('Error details:', error.response?.data);
    }
  };

  const fetchEmpleados = async () => {
    try {
      setLoading(true);
      const data = await usersService.getEmpleados();
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
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        nro_documento: formData.nro_documento,
        tipo_documento_id: parseInt(formData.tipo_documento_id),
        genero_id: parseInt(formData.genero_id),
        is_active: formData.is_active
      };
      
      await usersService.createEmpleado(empleadoData);
      success('Empleado creado exitosamente. Se ha enviado un email con las credenciales e instrucciones para completar su perfil.');
      setShowAddModal(false);
      setFormData({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        nro_documento: '',
        tipo_documento_id: '',
        genero_id: '',
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
      const updateData = {
        username: formData.username,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        is_active: formData.is_active,
      };
      
      // Solo incluir password si se proporcionó
      if (formData.password) {
        updateData.password = formData.password;
      }
      
      await usersService.updateEmpleado(selectedEmpleado.id, updateData);
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
      if (empleado.is_active) {
        // Desactivar
        await usersService.deleteEmpleado(empleado.id);
        success('Empleado desactivado exitosamente');
      } else {
        // Activar
        await usersService.activarEmpleado(empleado.id);
        success('Empleado activado exitosamente');
      }
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-2xl font-bold text-white mb-4">Agregar Nuevo Empleado</h3>
              <p className="text-sm text-gray-400 mb-6">
                El empleado recibirá un email con sus credenciales e instrucciones para completar su perfil.
              </p>
              <form onSubmit={handleAddEmpleado}>
                <div className="space-y-4">
                  {/* Datos de Autenticación */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Usuario *
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
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      autoComplete="email"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Se usará para iniciar sesión</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Apellido *
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Contraseña *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      minLength="8"
                      autoComplete="new-password"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Mínimo 8 caracteres. Se enviará por email.</p>
                  </div>

                  {/* Datos Personales */}
                  <div className="pt-4 border-t border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Datos Personales</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Tipo de Documento *
                        </label>
                        <select
                          name="tipo_documento_id"
                          value={formData.tipo_documento_id}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="" className="bg-gray-700 text-gray-400">Seleccionar...</option>
                          {tiposDocumento.map(tipo => (
                            <option key={tipo.id} value={tipo.id} className="bg-gray-700 text-white">
                              {tipo.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Número de Documento *
                        </label>
                        <input
                          type="text"
                          name="nro_documento"
                          value={formData.nro_documento}
                          onChange={handleInputChange}
                          required
                          maxLength="20"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Género *
                        </label>
                        <select
                          name="genero_id"
                          value={formData.genero_id}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="" className="bg-gray-700 text-gray-400">Seleccionar...</option>
                          {generos.map(genero => (
                            <option key={genero.id} value={genero.id} className="bg-gray-700 text-white">
                              {genero.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center pt-2">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="mr-2 text-green-600 focus:ring-green-500 w-4 h-4"
                    />
                    <label className="text-sm text-gray-300">Usuario activo</label>
                  </div>

                  <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-3 mt-4">
                    <p className="text-xs text-blue-300">
                      📧 El empleado recibirá un email con:
                    </p>
                    <ul className="text-xs text-blue-200 mt-2 ml-4 space-y-1">
                      <li>• Credenciales de acceso</li>
                      <li>• Link directo a su perfil</li>
                      <li>• Instrucciones para completar sus datos</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex gap-4 mt-6 pt-6 border-t border-gray-700">
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
