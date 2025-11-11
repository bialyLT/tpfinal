import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Users, MapPin, Smile, CreditCard, Loader } from 'lucide-react';
import api from '../../services/api';
import { success, error } from '../../utils/notifications';

const HomePage = () => {
  const [loadingPago, setLoadingPago] = useState(false);

  const handlePagoPrueba = async () => {
    try {
      setLoadingPago(true);
      const response = await api.post('/servicios/pago-prueba/', {
        monto: 100,
        descripcion: 'Pago de Prueba - El Edén'
      });
      
      console.log('=== RESPUESTA DE PAGO DE PRUEBA ===');
      console.log('Preference ID:', response.data.preference_id);
      console.log('Init Point:', response.data.init_point);
      console.log('Sandbox Init Point:', response.data.sandbox_init_point);
      console.log('Mensaje:', response.data.mensaje);
      console.log('===================================');
      
      success('Redirigiendo a MercadoPago... Usa tarjeta: 5031 7557 3453 0604', 5000);
      
      // Redirigir a MercadoPago
      setTimeout(() => {
        const redirectUrl = response.data.sandbox_init_point || response.data.init_point;
        console.log('Redirigiendo a:', redirectUrl);
        window.location.href = redirectUrl;
      }, 2000);
      
    } catch (err) {
      console.error('Error al crear pago de prueba:', err);
      console.error('Detalles:', err.response?.data);
      error('Error al crear el pago de prueba: ' + (err.response?.data?.detalle || err.message));
    } finally {
      setLoadingPago(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      {/* Fondo de Aurora */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] bg-emerald-500/20 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full filter blur-3xl animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Main Content */}
        <main className="flex-grow flex items-center">
          <div className="container mx-auto px-6 text-center md:text-left">
            <div className="max-w-3xl">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                Transforma tu espacio,
                <span className="block">un jardín a la vez.</span>
              </h1>
              <p className="mt-8 text-lg text-gray-300 max-w-2xl mx-auto md:mx-0">
                En El Edén, combinamos pasión y profesionalismo para ofrecerte servicios de mantenimiento y diseño de jardines. Convierte tu espacio verde en un paraíso personal.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Link to="/register" className="btn btn-primary btn-lg">
                  Comenzar Ahora
                </Link>
                
                {/* Botón de Prueba de MercadoPago */}
                <button 
                  onClick={handlePagoPrueba}
                  disabled={loadingPago}
                  className="btn btn-outline btn-lg flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-0"
                >
                  {loadingPago ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <CreditCard size={20} />
                      Probar MercadoPago
                    </>
                  )}
                </button>
              </div>
              
              {/* Mensaje informativo del botón de prueba */}
              <p className="mt-4 text-sm text-gray-500 max-w-2xl mx-auto md:mx-0">
                * Botón de prueba: Genera un pago de $100 en MercadoPago sandbox para testing
              </p>
            </div>
          </div>
        </main>

        {/* Footer Stats */}
        <footer className="container mx-auto px-6 py-10">
          <div className="border-t border-gray-800 pt-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="flex flex-col items-center">
                <Leaf className="text-emerald-400 mb-2" size={24} />
                <span className="text-2xl font-bold">15+</span>
                <span className="text-sm text-gray-400">Servicios realizados</span>
              </div>
              <div className="flex flex-col items-center">
                <Smile className="text-blue-400 mb-2" size={24} />
                <span className="text-2xl font-bold">200+</span>
                <span className="text-sm text-gray-400">Clientes Satisfechos</span>
              </div>
              <div className="flex flex-col items-center">
                <Users className="text-gray-400 mb-2" size={24} />
                <span className="text-2xl font-bold">10</span>
                <span className="text-sm text-gray-400">Expertos</span>
              </div>
              <div className="flex flex-col items-center">
                <MapPin className="text-red-400 mb-2" size={24} />
                <span className="text-2xl font-bold">Misiones y Corrientes</span>
                <span className="text-sm text-gray-400">Área de Cobertura</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
