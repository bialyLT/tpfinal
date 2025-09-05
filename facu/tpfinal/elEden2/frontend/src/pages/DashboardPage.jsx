import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowUp, ArrowDown, Users, Briefcase, DollarSign, FileText, Calendar, BarChart, Wrench, User, Star, CheckCircle, Clock, XCircle, Leaf } from 'lucide-react';

const StatCard = ({ title, value, change, icon }) => {
  const isPositive = change && change.startsWith('+');
  const ChangeIcon = isPositive ? ArrowUp : ArrowDown;
  const changeColor = isPositive ? 'text-green-400' : 'text-red-400';

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-400">{title}</span>
        {icon}
      </div>
      <div className="flex items-baseline">
        <p className="text-3xl font-semibold text-white">{value}</p>
      </div>
      {change && (
        <div className="flex items-center text-sm mt-2">
          <ChangeIcon className={`w-4 h-4 mr-1 ${changeColor}`} />
          <span className={changeColor}>{change.substring(1)}</span>
          <span className="text-gray-500 ml-1">desde la semana pasada</span>
        </div>
      )}
    </div>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();

  const getWelcomeMessage = () => {
    if (user.is_staff && user.is_superuser) return 'Panel de Administración';
    if (user?.groups?.includes('Empleados')) return 'Panel de Empleado';
    return 'Mi Dashboard';
  };

  const getStats = () => {
    if (user.is_staff && user.is_superuser) {
      return [
        { title: 'Total Usuarios', value: '127', change: '+12%', icon: <Users className="w-5 h-5 text-gray-400" /> },
        { title: 'Servicios Activos', value: '23', change: '+5%', icon: <Briefcase className="w-5 h-5 text-gray-400" /> },
        { title: 'Ingresos del Mes', value: '$45,230', change: '+18%', icon: <DollarSign className="w-5 h-5 text-gray-400" /> },
        { title: 'Encuestas Completadas', value: '89', change: '+7%', icon: <FileText className="w-5 h-5 text-gray-400" /> }
      ];
    }
    if (user?.groups?.includes('Empleados')) {
      return [
        { title: 'Servicios Asignados', value: '8', change: '+2', icon: <Briefcase className="w-5 h-5 text-gray-400" /> },
        { title: 'Completados Hoy', value: '3', change: '+1', icon: <CheckCircle className="w-5 h-5 text-gray-400" /> },
        { title: 'Pendientes', value: '5', change: '0', icon: <Clock className="w-5 h-5 text-gray-400" /> },
        { title: 'Calificación Promedio', value: '4.8', change: '+0.2', icon: <Star className="w-5 h-5 text-gray-400" /> }
      ];
    }
    return [
      { title: 'Servicios Solicitados', value: '12', change: '+2', icon: <Briefcase className="w-5 h-5 text-gray-400" /> },
      { title: 'Servicios Completados', value: '8', change: '+1', icon: <CheckCircle className="w-5 h-5 text-gray-400" /> },
      { title: 'En Progreso', value: '2', change: '0', icon: <Clock className="w-5 h-5 text-gray-400" /> },
      { title: 'Próxima Visita', value: 'Mañana', change: '', icon: <Calendar className="w-5 h-5 text-gray-400" /> }
    ];
  };

  const recentActivity = [
    { id: 'SER-001', date: '2025-09-03', customer: 'Leslie Alexander', service: 'Poda de árboles', status: 'Completado', statusColor: 'bg-green-500' },
    { id: 'SER-002', date: '2025-09-02', customer: 'Michael Foster', service: 'Diseño de jardín', status: 'En Progreso', statusColor: 'bg-yellow-500' },
    { id: 'SER-003', date: '2025-09-01', customer: 'Dries Vincent', service: 'Mantenimiento césped', status: 'Completado', statusColor: 'bg-green-500' },
    { id: 'SER-004', date: '2025-08-30', customer: 'Lindsay Walton', service: 'Instalación de riego', status: 'Pendiente', statusColor: 'bg-blue-500' },
    { id: 'SER-005', date: '2025-08-29', customer: 'Tom Cook', service: 'Control de plagas', status: 'Cancelado', statusColor: 'bg-red-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 pt-16">
          <h1 className="text-3xl font-bold text-white mb-2">
            ¡Buenas tardes, {user?.first_name || user?.username}!
          </h1>
          <p className="text-xl text-gray-400">{getWelcomeMessage()}</p>
        </header>

        <main>
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4">Resumen General</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {getStats().map((stat, index) => (
                <StatCard key={index} {...stat} />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Actividad Reciente</h2>
            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-400">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3">Nro. Servicio</th>
                      <th scope="col" className="px-6 py-3">Fecha</th>
                      <th scope="col" className="px-6 py-3">Cliente</th>
                      <th scope="col" className="px-6 py-3">Servicio</th>
                      <th scope="col" className="px-6 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((activity) => (
                      <tr key={activity.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-600">
                        <th scope="row" className="px-6 py-4 font-medium text-white whitespace-nowrap">
                          {activity.id}
                        </th>
                        <td className="px-6 py-4">{activity.date}</td>
                        <td className="px-6 py-4">{activity.customer}</td>
                        <td className="px-6 py-4">{activity.service}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className={`h-2.5 w-2.5 rounded-full ${activity.statusColor} mr-2`}></div>
                            {activity.status}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
