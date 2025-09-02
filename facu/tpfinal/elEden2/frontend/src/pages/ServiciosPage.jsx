import React, { useState, useEffect } from 'react';
import { serviciosService } from '../services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import Loading from '../components/Loading';

const ServiciosPage = () => {
  const [servicios, setServicios] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [tiposServicio, setTiposServicio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('solicitudes');
  const { user } = useAuth();

  const isAdmin = user?.groups?.includes('Administradores');
  const isEmpleado = user?.groups?.includes('Empleados');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [serviciosData, solicitudesData, tiposData] = await Promise.all([
        serviciosService.getServicios(),
        serviciosService.getSolicitudes(),
        serviciosService.getTiposServicio()
      ]);
      setServicios(serviciosData);
      setSolicitudes(solicitudesData);
      setTiposServicio(tiposData);
    } catch (error) {
      toast.error('Error al cargar los datos');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEstado = async (servicioId, nuevoEstado) => {
    try {
      await serviciosService.updateServicio(servicioId, { estado: nuevoEstado });
      toast.success('Estado actualizado correctamente');
      fetchData(); // Refresh data
    } catch (error) {
      toast.error('Error al actualizar el estado');
    }
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      'pendiente': 'badge-warning',
      'confirmado': 'badge-info',
      'en_progreso': 'badge-primary',
      'completado': 'badge-success',
      'cancelado': 'badge-error'
    };
    return badges[estado] || 'badge-neutral';
  };

  const getEstadoText = (estado) => {
    const estados = {
      'pendiente': 'Pendiente',
      'confirmado': 'Confirmado',
      'en_progreso': 'En Progreso',
      'completado': 'Completado',
      'cancelado': 'Cancelado'
    };
    return estados[estado] || estado;
  };

  if (loading) {
    return <Loading message="Cargando servicios..." />;
  }

  return (
    <div className="min-h-screen bg-base-200 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {isAdmin ? 'Gestión de Servicios' : isEmpleado ? 'Mis Servicios Asignados' : 'Mis Servicios'}
          </h1>
          <p className="text-gray-600">
            {isAdmin ? 'Administra todas las solicitudes y servicios' : 
             isEmpleado ? 'Servicios que tienes asignados para realizar' :
             'Historial y estado de tus servicios solicitados'}
          </p>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-6">
          <button 
            className={`tab ${activeTab === 'solicitudes' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('solicitudes')}
          >
            {isAdmin ? 'Solicitudes' : isEmpleado ? 'Asignados' : 'Mis Solicitudes'}
          </button>
          <button 
            className={`tab ${activeTab === 'servicios' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('servicios')}
          >
            {isAdmin ? 'Servicios Activos' : 'Historial'}
          </button>
          {isAdmin && (
            <button 
              className={`tab ${activeTab === 'tipos' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('tipos')}
            >
              Tipos de Servicio
            </button>
          )}
        </div>

        {/* Solicitudes Tab */}
        {activeTab === 'solicitudes' && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-xl mb-4">
                {isAdmin ? 'Solicitudes de Servicio' : isEmpleado ? 'Servicios Asignados' : 'Mis Solicitudes'}
              </h2>
              
              {solicitudes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-xl font-bold text-gray-800">No hay solicitudes</h3>
                  <p className="text-gray-600">Aún no hay solicitudes de servicio registradas.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-zebra w-full">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Cliente</th>
                        <th>Tipo de Servicio</th>
                        <th>Fecha Solicitud</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {solicitudes.map(solicitud => (
                        <tr key={solicitud.id}>
                          <td className="font-bold">#{solicitud.id}</td>
                          <td>
                            <div>
                              <div className="font-bold">{solicitud.cliente_nombre}</div>
                              <div className="text-sm opacity-50">{solicitud.cliente_email}</div>
                            </div>
                          </td>
                          <td>
                            <div className="badge badge-outline">
                              {solicitud.tipo_servicio_nombre}
                            </div>
                          </td>
                          <td>{new Date(solicitud.fecha_solicitud).toLocaleDateString()}</td>
                          <td>
                            <div className={`badge ${getEstadoBadge(solicitud.estado)}`}>
                              {getEstadoText(solicitud.estado)}
                            </div>
                          </td>
                          <td>
                            <div className="dropdown dropdown-end">
                              <div tabIndex={0} role="button" className="btn btn-ghost btn-xs">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                              </div>
                              <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                                <li><a>Ver Detalles</a></li>
                                {(isAdmin || isEmpleado) && solicitud.estado === 'pendiente' && (
                                  <li><a onClick={() => handleUpdateEstado(solicitud.id, 'confirmado')}>Confirmar</a></li>
                                )}
                                {(isAdmin || isEmpleado) && solicitud.estado === 'confirmado' && (
                                  <li><a onClick={() => handleUpdateEstado(solicitud.id, 'en_progreso')}>Iniciar</a></li>
                                )}
                                {(isAdmin || isEmpleado) && solicitud.estado === 'en_progreso' && (
                                  <li><a onClick={() => handleUpdateEstado(solicitud.id, 'completado')}>Completar</a></li>
                                )}
                              </ul>
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
        )}

        {/* Servicios Tab */}
        {activeTab === 'servicios' && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-xl mb-4">
                {isAdmin ? 'Servicios Activos' : 'Historial de Servicios'}
              </h2>
              
              {servicios.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🛠️</div>
                  <h3 className="text-xl font-bold text-gray-800">No hay servicios</h3>
                  <p className="text-gray-600">No se encontraron servicios en el sistema.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-zebra w-full">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Cliente</th>
                        <th>Empleado</th>
                        <th>Tipo</th>
                        <th>Fecha</th>
                        <th>Estado</th>
                        <th>Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {servicios.map(servicio => (
                        <tr key={servicio.id}>
                          <td className="font-bold">#{servicio.id}</td>
                          <td>
                            <div>
                              <div className="font-bold">{servicio.cliente_nombre}</div>
                              <div className="text-sm opacity-50">{servicio.cliente_email}</div>
                            </div>
                          </td>
                          <td>
                            {servicio.empleado_nombre ? (
                              <div className="badge badge-success">{servicio.empleado_nombre}</div>
                            ) : (
                              <div className="badge badge-warning">Sin asignar</div>
                            )}
                          </td>
                          <td>
                            <div className="badge badge-outline">
                              {servicio.tipo_nombre}
                            </div>
                          </td>
                          <td>{new Date(servicio.fecha_programada).toLocaleDateString()}</td>
                          <td>
                            <div className={`badge ${getEstadoBadge(servicio.estado)}`}>
                              {getEstadoText(servicio.estado)}
                            </div>
                          </td>
                          <td className="font-bold">
                            {servicio.costo_total ? `$${servicio.costo_total}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tipos de Servicio Tab (Solo Admin) */}
        {activeTab === 'tipos' && isAdmin && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-xl mb-4">Tipos de Servicio</h2>
              
              {tiposServicio.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">⚙️</div>
                  <h3 className="text-xl font-bold text-gray-800">No hay tipos de servicio</h3>
                  <p className="text-gray-600">Configura los tipos de servicio disponibles.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tiposServicio.map(tipo => (
                    <div key={tipo.id} className="card bg-base-200 shadow-lg">
                      <div className="card-body">
                        <h3 className="card-title">{tipo.nombre}</h3>
                        <p className="text-gray-600">{tipo.descripcion}</p>
                        <div className="flex justify-between items-center mt-4">
                          <div className="text-lg font-bold text-primary">
                            ${tipo.precio_base}
                          </div>
                          <div className="badge badge-outline">
                            {tipo.duracion_estimada}h
                          </div>
                        </div>
                        <div className="card-actions justify-end mt-4">
                          <button className="btn btn-primary btn-sm">Editar</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiciosPage;
