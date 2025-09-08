import React, { useState, useEffect } from 'react';
import { encuestasService } from '../services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import Loading from '../components/Loading';

const EncuestasPage = () => {
  const [encuestas, setEncuestas] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const isAdmin = user?.groups?.includes('Administradores');
  const isEmpleado = user?.groups?.includes('Empleados');

  useEffect(() => {
    fetchEncuestas();
  }, []);

  const fetchEncuestas = async () => {
    try {
      setLoading(true);
      const data = await encuestasService.getEncuestas();
      setEncuestas(data);
    } catch (error) {
      toast.error('Error al cargar las encuestas');
      console.error('Error fetching encuestas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCalificacionStars = (calificacion) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <svg
          key={i}
          className={`w-5 h-5 ${i <= calificacion ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }
    return stars;
  };

  const getPromedioCalificaciones = () => {
    if (encuestas.length === 0) return 0;
    const total = encuestas.reduce((sum, encuesta) => sum + (encuesta.calificacion_general || 0), 0);
    return (total / encuestas.length).toFixed(1);
  };

  if (loading) {
    return <Loading message="Cargando encuestas..." />;
  }

  return (
    <div className="min-h-screen bg-base-200 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {isAdmin || isEmpleado ? 'Encuestas de Satisfacción' : 'Mis Evaluaciones'}
          </h1>
          <p className="text-gray-600">
            {isAdmin || isEmpleado ? 'Resultados de satisfacción de los clientes' : 'Encuestas que has completado'}
          </p>
        </div>

        {/* Stats Cards */}
        {(isAdmin || isEmpleado) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Total Encuestas
                </h3>
                <p className="text-2xl font-semibold text-primary">{encuestas.length}</p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Promedio General
                </h3>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-semibold text-accent">{getPromedioCalificaciones()}</p>
                  <div className="flex">
                    {getCalificacionStars(Math.round(getPromedioCalificaciones()))}
                  </div>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Completadas
                </h3>
                <p className="text-2xl font-semibold text-success">
                  {encuestas.filter(e => e.completada).length}
                </p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Pendientes
                </h3>
                <p className="text-2xl font-semibold text-warning">
                  {encuestas.filter(e => !e.completada).length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Encuestas List */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">
              Lista de Encuestas
            </h2>
            
            {encuestas.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-bold text-gray-800">No hay encuestas</h3>
                <p className="text-gray-600">
                  {isAdmin || isEmpleado 
                    ? 'Aún no se han generado encuestas de satisfacción.'
                    : 'No tienes encuestas pendientes o completadas.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {encuestas.map(encuesta => (
                  <div key={encuesta.id} className="card bg-base-200 shadow-lg">
                    <div className="card-body">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-grow">
                          <h3 className="font-bold text-lg">
                            Encuesta #{encuesta.id}
                          </h3>
                          <p className="text-gray-600">
                            Servicio: {encuesta.servicio_tipo || 'No especificado'}
                          </p>
                          <p className="text-sm text-gray-500">
                            Cliente: {encuesta.cliente_nombre || 'No especificado'}
                          </p>
                          <p className="text-sm text-gray-500">
                            Fecha: {new Date(encuesta.fecha_creacion).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          {encuesta.completada ? (
                            <div className="text-center">
                              <div className="badge badge-success mb-2">Completada</div>
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-medium">
                                  {encuesta.calificacion_general}/5
                                </span>
                                <div className="flex">
                                  {getCalificacionStars(encuesta.calificacion_general)}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="badge badge-warning">Pendiente</div>
                          )}

                          <div className="dropdown dropdown-end">
                            <div tabIndex={0} role="button" className="btn btn-ghost btn-sm">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </div>
                            <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                              <li><a>Ver Detalles</a></li>
                              {!encuesta.completada && !isAdmin && !isEmpleado && (
                                <li><a>Completar Encuesta</a></li>
                              )}
                              {(isAdmin || isEmpleado) && (
                                <li><a>Exportar Resultados</a></li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {encuesta.completada && encuesta.comentarios && (
                        <div className="mt-4 p-4 bg-base-100 rounded-lg">
                          <h4 className="font-medium mb-2">Comentarios:</h4>
                          <p className="text-gray-700 italic">"{encuesta.comentarios}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EncuestasPage;
