import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Users, MapPin, Smile } from 'lucide-react';
import Navbar from '../../components/Navbar';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      {/* Fondo de Aurora */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] bg-emerald-500/20 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full filter blur-3xl animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navbar */}
        <Navbar />
        {/* Main Content */}
        <main className="flex-grow flex items-center pt-16">
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
              </div>
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
