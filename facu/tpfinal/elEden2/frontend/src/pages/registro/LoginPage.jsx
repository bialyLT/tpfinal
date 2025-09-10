import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Leaf, Home, Mail, Lock, ArrowLeft } from 'lucide-react';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Asumimos que el backend puede manejar el email como nombre de usuario
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (error) {
      // El error ya se maneja en AuthContext, no necesitamos duplicar el toast aquí
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

      {/* Columna Izquierda: Formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-12 z-10">
        <div className="w-full max-w-md">
          <div className="text-center md:text-left mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <Leaf className="text-emerald-400" size={32} />
              <span className="font-bold text-2xl text-white">El Edén</span>
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              Inicia sesión en tu cuenta
            </h1>
            <p className="text-gray-400 mt-2">
              ¿No eres miembro?{' '}
              <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-medium">
                Regístrate aquí
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <label htmlFor="email" className="sr-only">Email</label>
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                placeholder="Email"
              />
            </div>
            
            <div className="relative">
              <label htmlFor="password" className="sr-only">Contraseña</label>
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                placeholder="Contraseña"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-emerald-600 focus:ring-emerald-500" />
                <label htmlFor="remember-me" className="text-gray-400">Recuérdame</label>
              </div>
              <a href="#" className="font-medium text-emerald-400 hover:text-emerald-300">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Columna Derecha: Imagen */}
      <div 
        className="hidden lg:block lg:w-1/2 bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=1887&auto=format&fit=crop')" }}
      >
        <div className="w-full h-full bg-gray-900/30"></div>
      </div>
    </div>
  );
};

export default LoginPage;
