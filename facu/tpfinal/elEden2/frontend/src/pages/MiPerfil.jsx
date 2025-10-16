import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { success, error } from '../utils/notifications';
import api from '../services/api';
import { User, Mail, Phone, MapPin, Edit, Save, Shield, FileText, IdCard } from 'lucide-react';

const MiPerfil = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [referenceData, setReferenceData] = useState({
    generos: [],
    tipos_documento: [],
    localidades: []
  });
  
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    telefono: '',
    nro_documento: '',
    tipo_documento_id: '',
    genero_id: '',
    calle: '',
    numero: '',
    piso: '',
    dpto: '',
    localidad_id: ''
  });

  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const response = await api.get('/reference-data/');
        setReferenceData(response.data);
      } catch (err) {
        console.error('Error al cargar datos de referencia:', err);
      }
    };
    fetchReferenceData();
  }, []);

  useEffect(() => {
    if (user && user.persona) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        telefono: user.persona.telefono || '',
        nro_documento: user.persona.nro_documento || '',
        tipo_documento_id: user.persona.tipo_documento?.id || '',
        genero_id: user.persona.genero?.id || '',
        calle: user.persona.calle || '',
        numero: user.persona.numero || '',
        piso: user.persona.piso || '',
        dpto: user.persona.dpto || '',
        localidad_id: user.persona.localidad?.id || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData = {
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        email: profileData.email,
        telefono: profileData.telefono,
        nro_documento: profileData.nro_documento,
        tipo_documento_id: parseInt(profileData.tipo_documento_id),
        genero_id: parseInt(profileData.genero_id),
        calle: profileData.calle,
        numero: profileData.numero,
        piso: profileData.piso,
        dpto: profileData.dpto,
        localidad_id: parseInt(profileData.localidad_id)
      };

      const response = await api.put('/users/me/', updateData);
      
      // Verificar que la respuesta sea exitosa (status 200-299)
      if (response.status >= 200 && response.status < 300) {
        updateUser(response.data);
        success('Perfil actualizado correctamente');
        setIsEditing(false);
      } else {
        throw new Error('Respuesta inesperada del servidor');
      }
    } catch (err) {
      console.error('Error completo:', err);
      console.error('Respuesta del servidor:', err.response);
      
      // Solo mostrar error si realmente hubo un error HTTP (no fue actualizado)
      if (err.response && err.response.status >= 400) {
        error(err.response?.data?.error || 'Error al actualizar el perfil');
      } else {
        // Si no hay respuesta de error clara, verificar si se actualizó de todas formas
        error('Hubo un problema con la respuesta del servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user && user.persona) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        telefono: user.persona.telefono || '',
        nro_documento: user.persona.nro_documento || '',
        tipo_documento_id: user.persona.tipo_documento?.id || '',
        genero_id: user.persona.genero?.id || '',
        calle: user.persona.calle || '',
        numero: user.persona.numero || '',
        piso: user.persona.piso || '',
        dpto: user.persona.dpto || '',
        localidad_id: user.persona.localidad?.id || ''
      });
    }
    setIsEditing(false);
  };

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  const getUserRole = () => {
    if (user?.groups?.includes('Administradores')) return 'Administrador';
    if (user?.groups?.includes('Empleados')) return 'Empleado';
    if (user?.groups?.includes('Diseñadores')) return 'Diseñador';
    return 'Cliente';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <User className="w-8 h-8 mr-3 text-emerald-400" />
            Mi Perfil
          </h1>
          <p className="text-gray-400">
            Gestiona tu información personal y configuración de cuenta
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 text-center sticky top-6">
              <div className="relative mb-4">
                <div className="w-24 h-24 bg-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold text-white">
                  {getUserInitials()}
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white mb-1">
                {user?.first_name && user?.last_name 
                  ? `${user.first_name} ${user.last_name}` 
                  : user?.username || 'Usuario'}
              </h2>
              
              <div className="flex items-center justify-center mb-3">
                <Shield className="w-4 h-4 mr-2 text-emerald-400" />
                <span className="text-emerald-400 font-medium">{getUserRole()}</span>
              </div>

              <div className="text-sm text-gray-400 mt-4 space-y-2">
                <div className="flex items-center justify-center">
                  <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{user?.email}</span>
                </div>
                <div className="flex items-center justify-center">
                  <User className="w-4 h-4 mr-2" />
                  @{user?.username}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <User className="w-5 h-5 mr-2 text-emerald-400" />
                  Datos Personales
                </h3>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Guardar
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nombre</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="first_name"
                      value={profileData.first_name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <p className="text-white px-3 py-2">{user?.first_name || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Apellido</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="last_name"
                      value={profileData.last_name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <p className="text-white px-3 py-2">{user?.last_name || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <p className="text-white px-3 py-2">{user?.email || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />Teléfono
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="telefono"
                      value={profileData.telefono}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <p className="text-white px-3 py-2">{user?.persona?.telefono || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <FileText className="w-4 h-4 inline mr-2" />Tipo de Documento
                  </label>
                  {isEditing ? (
                    <select
                      name="tipo_documento_id"
                      value={profileData.tipo_documento_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Selecciona...</option>
                      {referenceData.tipos_documento.map(tipo => (
                        <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-white px-3 py-2">{user?.persona?.tipo_documento?.nombre || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <IdCard className="w-4 h-4 inline mr-2" />Número de Documento
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="nro_documento"
                      value={profileData.nro_documento}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <p className="text-white px-3 py-2">{user?.persona?.nro_documento || '-'}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <User className="w-4 h-4 inline mr-2" />Género
                  </label>
                  {isEditing ? (
                    <select
                      name="genero_id"
                      value={profileData.genero_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Selecciona...</option>
                      {referenceData.generos.map(genero => (
                        <option key={genero.id} value={genero.id}>{genero.nombre}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-white px-3 py-2">{user?.persona?.genero?.nombre || '-'}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-emerald-400" />
                Dirección
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Calle</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="calle"
                      value={profileData.calle}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <p className="text-white px-3 py-2">{user?.persona?.calle || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Número</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="numero"
                      value={profileData.numero}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <p className="text-white px-3 py-2">{user?.persona?.numero || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Piso</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="piso"
                      value={profileData.piso}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <p className="text-white px-3 py-2">{user?.persona?.piso || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Departamento</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="dpto"
                      value={profileData.dpto}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <p className="text-white px-3 py-2">{user?.persona?.dpto || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Localidad</label>
                  {isEditing ? (
                    <select
                      name="localidad_id"
                      value={profileData.localidad_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Selecciona...</option>
                      {referenceData.localidades.map(localidad => (
                        <option key={localidad.id} value={localidad.id}>{localidad.nombre}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-white px-3 py-2">{user?.persona?.localidad?.nombre || '-'}</p>
                  )}
                </div>
              </div>

              {!isEditing && user?.cliente?.direccion_completa && (
                <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Dirección completa:</p>
                  <p className="text-white">{user.cliente.direccion_completa}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiPerfil;
