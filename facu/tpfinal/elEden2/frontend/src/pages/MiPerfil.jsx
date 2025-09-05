import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Edit, 
  Save, 
  Calendar, 
  Shield,
  Settings,
  Eye,
  EyeOff,
  Camera
} from 'lucide-react';

const MiPerfil = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    bio: user?.bio || '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        bio: user.bio || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  const validatePasswordChange = () => {
    if (showPasswordFields) {
      if (!profileData.current_password) {
        toast.error('Ingresa tu contraseña actual');
        return false;
      }
      if (profileData.new_password.length < 6) {
        toast.error('La nueva contraseña debe tener al menos 6 caracteres');
        return false;
      }
      if (profileData.new_password !== profileData.confirm_password) {
        toast.error('Las contraseñas no coinciden');
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validatePasswordChange()) return;

    setLoading(true);
    try {
      const updateData = {
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        email: profileData.email,
        phone: profileData.phone,
        address: profileData.address,
        bio: profileData.bio
      };

      if (showPasswordFields && profileData.new_password) {
        updateData.current_password = profileData.current_password;
        updateData.new_password = profileData.new_password;
      }

      await updateUser(updateData);
      toast.success('Perfil actualizado correctamente');
      setIsEditing(false);
      setShowPasswordFields(false);
      setProfileData({
        ...profileData,
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      toast.error('Error al actualizar el perfil');
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setProfileData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
      bio: user?.bio || '',
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
    setIsEditing(false);
    setShowPasswordFields(false);
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 pt-16">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <User className="w-8 h-8 mr-3 text-green-400" />
            Mi Perfil
          </h1>
          <p className="text-gray-400">
            Gestiona tu información personal y configuración de cuenta
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Summary Card */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              {/* Avatar */}
              <div className="relative mb-4">
                <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold text-white">
                  {getUserInitials()}
                </div>
                {isEditing && (
                  <button className="absolute bottom-0 right-1/2 transform translate-x-1/2 translate-y-2 p-2 bg-gray-700 rounded-full text-gray-400 hover:text-white">
                    <Camera className="w-4 h-4" />
                  </button>
                )}
              </div>

              <h2 className="text-xl font-semibold text-white mb-1">
                {user?.first_name && user?.last_name 
                  ? `${user.first_name} ${user.last_name}` 
                  : user?.username || 'Usuario'}
              </h2>
              
              <div className="flex items-center justify-center mb-3">
                <Shield className="w-4 h-4 mr-2 text-green-400" />
                <span className="text-green-400 font-medium">{getUserRole()}</span>
              </div>

              <div className="flex items-center justify-center text-gray-400 mb-4">
                <Calendar className="w-4 h-4 mr-2" />
                <span className="text-sm">
                  Miembro desde {user?.date_joined ? new Date(user.date_joined).getFullYear() : 'N/A'}
                </span>
              </div>

              {user?.bio && (
                <p className="text-sm text-gray-400 italic">"{user.bio}"</p>
              )}
            </div>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6">
              {/* Header with Edit Button */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Información Personal</h3>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
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

              {/* Form Fields */}
              <div className="space-y-6">
                {/* Personal Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      Nombre
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="first_name"
                        value={profileData.first_name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-700 rounded-lg text-gray-300">
                        {user?.first_name || 'No especificado'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      Apellido
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="last_name"
                        value={profileData.last_name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-700 rounded-lg text-gray-300">
                        {user?.last_name || 'No especificado'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Correo Electrónico
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-700 rounded-lg text-gray-300">
                      {user?.email}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Teléfono
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleChange}
                      placeholder="Número de teléfono"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-700 rounded-lg text-gray-300">
                      {user?.phone || 'No especificado'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Dirección
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="address"
                      value={profileData.address}
                      onChange={handleChange}
                      placeholder="Dirección completa"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-700 rounded-lg text-gray-300">
                      {user?.address || 'No especificado'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Biografía
                  </label>
                  {isEditing ? (
                    <textarea
                      name="bio"
                      value={profileData.bio}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Cuéntanos un poco sobre ti..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-700 rounded-lg text-gray-300 min-h-[80px]">
                      {user?.bio || 'No especificado'}
                    </div>
                  )}
                </div>

                {/* Password Section */}
                {isEditing && (
                  <div className="pt-6 border-t border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-white">Cambiar Contraseña</h4>
                      <button
                        onClick={() => setShowPasswordFields(!showPasswordFields)}
                        className="text-sm text-green-400 hover:text-green-300 flex items-center"
                      >
                        {showPasswordFields ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-1" />
                            Ocultar
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-1" />
                            Mostrar
                          </>
                        )}
                      </button>
                    </div>

                    {showPasswordFields && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Contraseña Actual
                          </label>
                          <input
                            type="password"
                            name="current_password"
                            value={profileData.current_password}
                            onChange={handleChange}
                            placeholder="Ingresa tu contraseña actual"
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Nueva Contraseña
                          </label>
                          <input
                            type="password"
                            name="new_password"
                            value={profileData.new_password}
                            onChange={handleChange}
                            placeholder="Nueva contraseña (mínimo 6 caracteres)"
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Confirmar Nueva Contraseña
                          </label>
                          <input
                            type="password"
                            name="confirm_password"
                            value={profileData.confirm_password}
                            onChange={handleChange}
                            placeholder="Confirma tu nueva contraseña"
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="mt-6 bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Settings className="w-6 h-6 mr-2 text-green-400" />
            Configuración de Cuenta
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-300">Usuario:</span>
              <span className="text-white font-medium">{user?.username}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-300">Fecha de registro:</span>
              <span className="text-white font-medium">
                {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-300">Último acceso:</span>
              <span className="text-white font-medium">
                {user?.last_login ? new Date(user.last_login).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-300">Estado:</span>
              <span className="text-green-400 font-medium">
                {user?.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiPerfil;
