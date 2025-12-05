import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { error } from '../../utils/notifications';
import { Leaf, ArrowLeft } from 'lucide-react';
import api from '../../services/api';
import { addressService } from '../../services';
import GoogleLoginButton from '../../components/GoogleLoginButton';
import useAddressSuggestions from '../../hooks/useAddressSuggestions';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    // Campos de Persona (primero)
    first_name: '',
    last_name: '',
    telefono: '',
    nro_documento: '',
    calle: '',
    numero: '',
    piso: '',
    dpto: '',
    localidad_id: '',
    // Campos de User (después)
    username: '',
    email: '',
    password: '',
    password2: ''
  });

  const [referenceData, setReferenceData] = useState({
    localidades: []
  });
  const [addressSearch, setAddressSearch] = useState('');
  const [addressInfo, setAddressInfo] = useState(null);
  const [addressError, setAddressError] = useState('');
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [showManualLocalidad, setShowManualLocalidad] = useState(false);
  const {
    suggestions: addressSuggestions,
    isLoading: isAutocompleteLoading,
    autocompleteError,
    clearSuggestions,
  } = useAddressSuggestions(addressSearch);

  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const selectedLocalidad = referenceData.localidades.find(
    (loc) => String(loc.id) === String(formData.localidad_id)
  );
  const ciudadDisplay = addressInfo?.ciudad || selectedLocalidad?.nombre || '';
  const provinciaDisplay = addressInfo?.provincia || selectedLocalidad?.provincia || '';
  const paisDisplay = addressInfo?.pais || selectedLocalidad?.pais || '';
  const cpDisplay = addressInfo?.codigo_postal || selectedLocalidad?.cp || '';

  // Cargar datos de referencia
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const response = await api.get('/reference-data/');
        setReferenceData(response.data);
      } catch (err) {
        error('Error al cargar los datos del formulario');
        console.error(err);
      }
    };
    fetchReferenceData();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddressLookup = async (forcedAddress) => {
    const targetAddress = (forcedAddress ?? addressSearch).trim();
    if (!targetAddress) {
      setAddressError('Ingresa una dirección completa para buscar');
      return;
    }

    setIsAddressLoading(true);
    setAddressError('');
    try {
      const data = await addressService.lookup(targetAddress);
      setAddressInfo(data);
      setShowManualLocalidad(false);
      setFormData((prev) => ({
        ...prev,
        calle: data.calle || prev.calle,
        numero: data.numero || prev.numero,
        localidad_id: data.localidad_id ? String(data.localidad_id) : prev.localidad_id,
      }));
      clearSuggestions();
      setAddressSearch(data.direccion_formateada || targetAddress);
    } catch (err) {
      console.error('Error al buscar dirección', err);
      setAddressInfo(null);
      setAddressError(err.response?.data?.error || 'No pudimos validar la dirección, intenta nuevamente.');
    } finally {
      setIsAddressLoading(false);
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    const formatted = suggestion?.direccion_formateada || `${suggestion?.calle || ''} ${suggestion?.numero || ''}`.trim();
    if (!formatted) {
      return;
    }
    setAddressSearch(formatted);
    clearSuggestions();
    handleAddressLookup(formatted);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.password2) {
      error('Las contraseñas no coinciden');
      return;
    }
    if (formData.password.length < 8) {
      error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (!formData.localidad_id) {
      error('Busca tu dirección o selecciona una localidad para continuar');
      return;
    }

    setIsLoading(true);

    try {
      // Convertir IDs a enteros
      const dataToSend = {
        ...formData,
        localidad_id: parseInt(formData.localidad_id)
      };
      
      const result = await register(dataToSend);
      if (result?.success) {
        navigate('/');
      }
    } catch {
      // El error ya se maneja en AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 text-white flex flex-col lg:flex-row lg:h-screen">
      {/* Botón para volver al inicio */}
      <Link
        to="/"
        className="absolute top-4 left-4 z-20 flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
      >
        <ArrowLeft size={18} />
        <span>Volver al Inicio</span>
      </Link>

      {/* Columna de la imagen (izquierda) */}
      <div className="hidden lg:block lg:w-1/2">
        <div className="sticky top-0 h-screen relative">
          <img
            src="https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?q=80&w=1974&auto=format&fit=crop"
            alt="Jardín frondoso"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gray-900 bg-opacity-60"></div>
          <div className="relative z-10 flex flex-col justify-center items-center h-full text-center p-12">
            <Leaf className="text-emerald-400 h-16 w-16 mb-6" />
            <h1 className="text-4xl font-bold text-white mb-4">Bienvenido a El Edén</h1>
            <p className="text-lg text-gray-200">
              Crea tu cuenta para empezar a transformar tu jardín en un paraíso.
            </p>
          </div>
        </div>
      </div>

      {/* Columna del formulario (derecha) */}
      <div className="w-full lg:w-1/2 flex justify-center p-6 sm:p-8 lg:p-12 overflow-y-auto lg:h-screen">
        <div className="w-full max-w-2xl">
          <div className="text-center lg:hidden mb-8">
            <Leaf className="text-emerald-400 h-12 w-12 mx-auto mb-4" />
            <h2 className="text-3xl font-bold">Crear Cuenta</h2>
          </div>
          
          <div className="hidden lg:block text-left mb-8">
             <h2 className="text-3xl font-bold text-white">Crea tu cuenta</h2>
             <p className="text-gray-400 mt-2">
                ¿Ya tienes una cuenta?{' '}
               <Link to="/login" className="font-medium text-emerald-400 hover:text-emerald-500">
                 Inicia sesión aquí
               </Link>
             </p>
           </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* SECCIÓN: DATOS PERSONALES */}
            <div className="bg-gray-800 bg-opacity-50 p-6 rounded-lg space-y-4">
              <h3 className="text-xl font-semibold text-emerald-400 mb-4">Datos Personales</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-300 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-300 mb-1">
                    Apellido <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Tu apellido"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nro_documento" className="block text-sm font-medium text-gray-300 mb-1">
                    Número de Documento <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="nro_documento"
                    name="nro_documento"
                    type="text"
                    value={formData.nro_documento}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="12345678"
                  />
                </div>
                <div>
                  <label htmlFor="telefono" className="block text-sm font-medium text-gray-300 mb-1">
                    Teléfono <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="telefono"
                    name="telefono"
                    type="tel"
                    value={formData.telefono}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="+54 9 11 1234-5678"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN: DIRECCIÓN */}
            <div className="bg-gray-800 bg-opacity-50 p-6 rounded-lg space-y-4">
              <h3 className="text-xl font-semibold text-emerald-400 mb-4">Dirección</h3>

              <div>
                <label htmlFor="direccion_search" className="block text-sm font-medium text-gray-300 mb-1">
                  Dirección completa <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input
                      id="direccion_search"
                      name="direccion_search"
                      type="text"
                      value={addressSearch}
                      onChange={(e) => setAddressSearch(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ej: Av. Siempre Viva 742, Buenos Aires"
                    />
                    {addressSuggestions.length > 0 && (
                      <ul className="absolute z-20 mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {addressSuggestions.map((suggestion, idx) => (
                          <li key={`${suggestion.latitud || idx}-${suggestion.longitud || idx}-${idx}`}>
                            <button
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleSuggestionSelect(suggestion)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-800"
                            >
                              <p className="text-sm text-white">{suggestion.direccion_formateada || `${suggestion.calle || ''} ${suggestion.numero || ''}`}</p>
                              <p className="text-xs text-gray-400">
                                {[suggestion.ciudad, suggestion.provincia, suggestion.pais].filter(Boolean).join(' • ')}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {isAutocompleteLoading && (
                      <p className="absolute right-3 top-2 text-xs text-gray-400">Buscando...</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddressLookup}
                    disabled={isAddressLoading}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {isAddressLoading ? 'Buscando...' : 'Buscar dirección'}
                  </button>
                </div>
                <p className="text-sm text-gray-400 mt-1">Usaremos este dato para completar ciudad, provincia y país automáticamente.</p>
                {autocompleteError && !addressError && (
                  <p className="text-sm text-yellow-400 mt-2">{autocompleteError}</p>
                )}
                {addressError && <p className="text-sm text-red-400 mt-2">{addressError}</p>}
                {addressInfo?.direccion_formateada && (
                  <p className="text-sm text-emerald-400 mt-2">Dirección detectada: {addressInfo.direccion_formateada}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="calle" className="block text-sm font-medium text-gray-300 mb-1">
                    Calle <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="calle"
                    name="calle"
                    type="text"
                    value={formData.calle}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Av. Libertador"
                  />
                </div>
                <div>
                  <label htmlFor="numero" className="block text-sm font-medium text-gray-300 mb-1">
                    Número <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="numero"
                    name="numero"
                    type="text"
                    value={formData.numero}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="1234"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Ciudad</label>
                  <input
                    type="text"
                    value={ciudadDisplay}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                    placeholder="Completa tu dirección para detectar la ciudad"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Provincia</label>
                  <input
                    type="text"
                    value={provinciaDisplay}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">País</label>
                  <input
                    type="text"
                    value={paisDisplay}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Código Postal</label>
                  <input
                    type="text"
                    value={cpDisplay}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="piso" className="block text-sm font-medium text-gray-300 mb-1">
                    Piso <span className="text-gray-500">(opcional)</span>
                  </label>
                  <input
                    id="piso"
                    name="piso"
                    type="text"
                    value={formData.piso}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="5"
                  />
                </div>
                <div>
                  <label htmlFor="dpto" className="block text-sm font-medium text-gray-300 mb-1">
                    Departamento <span className="text-gray-500">(opcional)</span>
                  </label>
                  <input
                    id="dpto"
                    name="dpto"
                    type="text"
                    value={formData.dpto}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="A"
                  />
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowManualLocalidad(!showManualLocalidad)}
                  className="text-sm text-emerald-400 hover:text-emerald-300 underline"
                >
                  {showManualLocalidad ? 'Ocultar selección manual' : 'Seleccionar localidad manualmente'}
                </button>
              </div>

              {showManualLocalidad && (
                <div>
                  <label htmlFor="localidad_id" className="block text-sm font-medium text-gray-300 mb-1 mt-2">
                    Localidad <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="localidad_id"
                    name="localidad_id"
                    value={formData.localidad_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Selecciona...</option>
                    {referenceData.localidades.map(localidad => (
                      <option key={localidad.id} value={localidad.id}>
                        {localidad.nombre}, {localidad.provincia} ({localidad.pais})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Usa esta opción si tu dirección no se detectó correctamente.</p>
                </div>
              )}
            </div>

            {/* SECCIÓN: CUENTA */}
            <div className="bg-gray-800 bg-opacity-50 p-6 rounded-lg space-y-4">
              <h3 className="text-xl font-semibold text-emerald-400 mb-4">Datos de Cuenta</h3>
              
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                  Nombre de usuario <span className="text-red-500">*</span>
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Elige un usuario"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="tu@email.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                    Contraseña <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Mín. 8 caracteres"
                  />
                </div>
                <div>
                  <label htmlFor="password2" className="block text-sm font-medium text-gray-300 mb-1">
                    Confirmar Contraseña <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="password2"
                    name="password2"
                    type="password"
                    value={formData.password2}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Repite la contraseña"
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-900 text-gray-400">O regístrate con</span>
              </div>
            </div>

            {/* Google Login Button */}
            <GoogleLoginButton isRegister={true} />
          </form>
          
          <div className="text-center mt-6 lg:hidden">
             <p className="text-gray-400">
                ¿Ya tienes una cuenta?{' '}
               <Link to="/login" className="font-medium text-emerald-400 hover:text-emerald-500">
                 Inicia sesión
               </Link>
             </p>
           </div>

        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

