import React from 'react';
import { useAuth } from '../context/AuthContext';

const DashboardPage = () => {
  const { user } = useAuth();

  const getWelcomeMessage = () => {
    if (user?.groups?.includes('Administradores')) {
      return 'Panel de Administración';
    } else if (user?.groups?.includes('Empleados')) {
      return 'Panel de Empleado';
    } else {
      return 'Mi Dashboard';
    }
  };

  const getQuickActions = () => {
    if (user?.groups?.includes('Administradores')) {
      return [
        { title: 'Gestionar Usuarios', description: 'Administrar cuentas de usuarios', icon: '👥', href: '/admin/users' },
        { title: 'Tipos de Servicio', description: 'Configurar servicios disponibles', icon: '🛠️', href: '/admin/tipos-servicio' },
        { title: 'Productos', description: 'Gestionar catálogo de productos', icon: '🌱', href: '/productos' },
        { title: 'Reportes', description: 'Ver estadísticas y reportes', icon: '📊', href: '/admin/reportes' }
      ];
    } else if (user?.groups?.includes('Empleados')) {
      return [
        { title: 'Solicitudes de Servicio', description: 'Ver y gestionar solicitudes', icon: '📋', href: '/servicios' },
        { title: 'Encuestas', description: 'Revisar encuestas completadas', icon: '📝', href: '/encuestas' },
        { title: 'Mi Calendario', description: 'Servicios programados', icon: '📅', href: '/calendario' },
        { title: 'Productos', description: 'Consultar catálogo', icon: '🌱', href: '/productos' }
      ];
    } else {
      return [
        { title: 'Solicitar Servicio', description: 'Pedir un nuevo servicio', icon: '🌿', href: '/solicitar-servicio' },
        { title: 'Mis Servicios', description: 'Ver historial de servicios', icon: '📋', href: '/mis-servicios' },
        { title: 'Productos', description: 'Explorar productos', icon: '🌱', href: '/productos' },
        { title: 'Mi Perfil', description: 'Editar información personal', icon: '👤', href: '/perfil' }
      ];
    }
  };

  const getStats = () => {
    if (user?.groups?.includes('Administradores')) {
      return [
        { title: 'Total Usuarios', value: '127', change: '+12%', color: 'text-primary' },
        { title: 'Servicios Activos', value: '23', change: '+5%', color: 'text-success' },
        { title: 'Ingresos del Mes', value: '$45,230', change: '+18%', color: 'text-accent' },
        { title: 'Encuestas Completadas', value: '89', change: '+7%', color: 'text-info' }
      ];
    } else if (user?.groups?.includes('Empleados')) {
      return [
        { title: 'Servicios Asignados', value: '8', change: '+2', color: 'text-primary' },
        { title: 'Completados Hoy', value: '3', change: '+1', color: 'text-success' },
        { title: 'Pendientes', value: '5', change: '0', color: 'text-warning' },
        { title: 'Calificación Promedio', value: '4.8', change: '+0.2', color: 'text-accent' }
      ];
    } else {
      return [
        { title: 'Servicios Solicitados', value: '12', change: '+2', color: 'text-primary' },
        { title: 'Servicios Completados', value: '8', change: '+1', color: 'text-success' },
        { title: 'En Progreso', value: '2', change: '0', color: 'text-info' },
        { title: 'Próxima Visita', value: 'Mañana', change: '', color: 'text-accent' }
      ];
    }
  };

  return (
    <div className="min-h-screen bg-base-200 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ¡Hola, {user?.first_name || user?.username}!
          </h1>
          <p className="text-xl text-gray-600">{getWelcomeMessage()}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {getStats().map((stat, index) => (
            <div key={index} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  {stat.title}
                </h3>
                <div className="flex items-baseline">
                  <p className={`text-2xl font-semibold ${stat.color}`}>
                    {stat.value}
                  </p>
                  {stat.change && (
                    <p className={`ml-2 text-sm font-medium ${
                      stat.change.startsWith('+') ? 'text-success' : 'text-error'
                    }`}>
                      {stat.change}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {getQuickActions().map((action, index) => (
              <div key={index} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="card-body">
                  <div className="text-4xl mb-4">{action.icon}</div>
                  <h3 className="card-title text-lg">{action.title}</h3>
                  <p className="text-gray-600 flex-grow">{action.description}</p>
                  <div className="card-actions justify-end">
                    <Link to={action.href} className="btn btn-primary btn-sm">
                      Ir
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">Actividad Reciente</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-base-200 rounded-lg">
                <div className="w-10 h-10 bg-success rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-grow">
                  <p className="font-medium">Servicio de poda completado</p>
                  <p className="text-sm text-gray-500">Hace 2 horas</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-base-200 rounded-lg">
                <div className="w-10 h-10 bg-info rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                </div>
                <div className="flex-grow">
                  <p className="font-medium">Nueva solicitud de servicio</p>
                  <p className="text-sm text-gray-500">Hace 1 día</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-base-200 rounded-lg">
                <div className="w-10 h-10 bg-warning rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-grow">
                  <p className="font-medium">Encuesta de satisfacción enviada</p>
                  <p className="text-sm text-gray-500">Hace 2 días</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
