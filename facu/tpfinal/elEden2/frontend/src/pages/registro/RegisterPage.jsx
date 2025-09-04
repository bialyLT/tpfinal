import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Leaf, ArrowLeft } from 'lucide-react';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: '',
    telefono: '',
    direccion: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.password2) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (formData.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      // Enviar todos los datos para validación en backend
      const result = await register(formData);
      if (result?.success) {
        // El contexto ya muestra el toast; solo navegamos
        navigate('/');
      }
    } catch (error) {
      // el contexto maneja toasts de error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Botón para volver al inicio */}
      <Link
        to="/"
        className="absolute top-4 left-4 z-20 flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
      >
        <ArrowLeft size={18} />
        <span>Volver al Inicio</span>
      </Link>

      {/* Columna de la imagen (izquierda) */}
      <div className="hidden lg:block lg:w-1/2 relative">
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

      {/* Columna del formulario (derecha) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md">
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-300 mb-1">
                  Nombre
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
                  Apellido
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
            
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                Nombre de usuario
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
                Email
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

            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-300 mb-1">
                Teléfono (Opcional)
              </label>
              <input
                id="telefono"
                name="telefono"
                type="tel"
                value={formData.telefono}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="+54 9 11 1234-5678"
              />
            </div>

            <div>
              <label htmlFor="direccion" className="block text-sm font-medium text-gray-300 mb-1">
                Dirección (Opcional)
              </label>
              <textarea
                id="direccion"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                rows="2"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Tu dirección completa"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" name="password" className="block text-sm font-medium text-gray-300 mb-1">
                  Contraseña
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
                  Confirmar Contraseña
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

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </button>
            </div>
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
