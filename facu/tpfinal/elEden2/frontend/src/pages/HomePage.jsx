import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Hero Section */}
      <div className="hero min-h-screen">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto mb-6 bg-primary rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="text-5xl font-bold text-gray-800">El Edén</h1>
              <p className="text-xl text-gray-600 mt-2">Servicios de Jardinería y Diseño</p>
            </div>
            
            <p className="py-6 text-gray-700 text-lg">
              Ofrecemos servicios profesionales de mantenimiento de jardines y asesoramiento 
              especializado en diseño de espacios verdes para transformar tu jardín en un verdadero paraíso.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/login" className="btn btn-primary btn-lg">
                Iniciar Sesión
              </Link>
              <Link to="/register" className="btn btn-outline btn-lg">
                Registrarse
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
            Nuestros Servicios
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Mantenimiento */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <h3 className="card-title text-xl text-gray-800">Mantenimiento de Jardines</h3>
                <p className="text-gray-600">
                  Cuidado integral de tu jardín: poda, riego, fertilización y mantenimiento general
                  para mantener tus espacios verdes siempre hermosos.
                </p>
              </div>
            </div>

            {/* Diseño */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="card-title text-xl text-gray-800">Diseño de Jardines</h3>
                <p className="text-gray-600">
                  Asesoramiento profesional para el diseño de jardines únicos y funcionales
                  adaptados a tus necesidades y gustos.
                </p>
              </div>
            </div>

            {/* Consultoría */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="card-title text-xl text-gray-800">Consultoría Especializada</h3>
                <p className="text-gray-600">
                  Advice personalizado sobre plantas, suelos, sistemas de riego y planificación
                  de espacios verdes sostenibles.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="bg-gray-50 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-8 text-gray-800">
            ¿Listo para transformar tu jardín?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Contactanos para una consulta gratuita y descubre cómo podemos ayudarte 
            a crear el jardín de tus sueños.
          </p>
          <Link to="/register" className="btn btn-primary btn-lg">
            Comenzar Ahora
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
