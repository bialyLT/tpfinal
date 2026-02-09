import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { weatherService, adminService } from '../services';
import { ArrowUp, ArrowDown, Users, Briefcase, DollarSign, FileText, Calendar, BarChart, Wrench, User, Star, CheckCircle, Clock, XCircle, Leaf, CloudRain, RefreshCw, MapPin } from 'lucide-react';

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

  const isAdmin = user.is_staff || user.is_superuser || user.perfil?.tipo_usuario === 'administrador' || user.groups?.includes('Administradores')

  const [weatherAlerts, setWeatherAlerts] = useState([]);
  const [weatherModalOpen, setWeatherModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState('');
  const [modalMessage, setModalMessage] = useState('Simulación de lluvia para pruebas');
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [simulatingRain, setSimulatingRain] = useState(false);
  const [weatherError, setWeatherError] = useState('');
  const [weatherSuccess, setWeatherSuccess] = useState('');
  const [cityForecasts, setCityForecasts] = useState([]);
  const [loadingCityForecasts, setLoadingCityForecasts] = useState(false);
  const [cityForecastError, setCityForecastError] = useState('');

  const [reprogramModalOpen, setReprogramModalOpen] = useState(false);
  const [reprogramReservaId, setReprogramReservaId] = useState('');
  const [reprogramDate, setReprogramDate] = useState('');
  const [reprogramMessage, setReprogramMessage] = useState('Reprogramación por alerta climática');
  const [reprogramming, setReprogramming] = useState(false);
  const [dismissingAlertId, setDismissingAlertId] = useState(null);

  const [stats, setStats] = useState({
    total_users: 0,
    active_services: 0,
    monthly_revenue: 0
  });
  const [loadingStats, setLoadingStats] = useState(false);

  const parseDateValue = (value) => {
    if (!value) return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T00:00:00`);
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date;
  };

  const formatDatetimeLocal = (value) => {
    if (!value) return '';
    const date = parseDateValue(value);
    if (!date) return '';
    const tz = date.getTimezoneOffset();
    const local = new Date(date.getTime() - tz * 60000);
    return local.toISOString().slice(0, 16);
  };

  const formatDateForDisplay = (value) => {
    if (!value) return 'Sin fecha';
    const date = parseDateValue(value);
    if (!date) return value;
    const isDateOnly = typeof value === 'string' && !value.includes('T');
    return isDateOnly
      ? date.toLocaleDateString('es-AR')
      : date.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
  };

  const formatForecastDate = (value) => {
    if (!value) return '--';
    const date = parseDateValue(value);
    if (!date) return '--';
    return date.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const formatCoordinate = (value) => {
    if (value === null || value === undefined) return '--';
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return '--';
    return numeric.toFixed(2);
  };

  const formatPrecipValue = (value) => {
    if (value === null || value === undefined) return '--';
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return '--';
    return numeric.toFixed(1);
  };

  const resolveSuggestedDatetime = (alerta) => {
    if (!alerta) return formatDatetimeLocal(new Date().toISOString());
    const candidate = alerta?.reserva_detalle?.fecha_reprogramada_sugerida
      || alerta?.payload?.suggested_reprogramming
      || alerta?.reserva_detalle?.fecha_reserva
      || new Date().toISOString();
    return formatDatetimeLocal(candidate);
  };

  useEffect(() => {
    if (isAdmin) {
      setLoadingStats(true);
      fetchStats();
    }
  }, [isAdmin]);

  const refreshWeatherData = async () => {
    if (!isAdmin) return;
    setLoadingWeather(true);
    setWeatherError('');
    try {
      const alerts = await weatherService.getPendingAlerts();
      setWeatherAlerts(alerts);
    } catch (error) {
      console.error('Weather fetch error', error);
      setWeatherError('No se pudieron cargar las alertas de clima.');
    } finally {
      setLoadingWeather(false);
    }
  };

  const fetchCityForecasts = async () => {
    if (!isAdmin) return;
    setLoadingCityForecasts(true);
    setCityForecastError('');
    try {
      const data = await weatherService.getReservationForecastSummary();
      setCityForecasts(data?.results || []);
    } catch (error) {
      console.error('City forecast fetch error', error);
      setCityForecastError('No se pudo obtener el pronóstico por ciudad.');
    } finally {
      setLoadingCityForecasts(false);
    }
  };

  useEffect(() => {
    refreshWeatherData();
    fetchCityForecasts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const openWeatherModal = () => {
    setWeatherError('');
    setWeatherSuccess('');
    const today = new Date().toISOString().slice(0, 10);
    setModalDate(today);
    setModalMessage('Simulación de lluvia para pruebas');
    setWeatherModalOpen(true);
  };

  const closeWeatherModal = () => {
    setWeatherModalOpen(false);
    setSimulatingRain(false);
  };

  const handleSimulateSubmit = async (event) => {
    event.preventDefault();
    if (!modalDate) {
      setWeatherError('Seleccioná una fecha válida.');
      return;
    }
    setSimulatingRain(true);
    setWeatherError('');
    setWeatherSuccess('');
    try {
      const response = await weatherService.simulateRainAlert({
        alert_date: modalDate,
        message: modalMessage,
      });
      const created = response?.created || 0;
      const reservasDetectadas = response?.reservas_detectadas || 0;
      const successMessage = created > 0
        ? `Se generaron ${created} alertas para ${reservasDetectadas} reservas del ${formatDateForDisplay(modalDate)}.`
        : 'No hay reservas para la fecha seleccionada.';
      setWeatherSuccess(successMessage);
      closeWeatherModal();
      await refreshWeatherData();
    } catch (error) {
      console.error('simulate rain error', error);
      const detail = error?.response?.data?.detail;
      setWeatherError(detail || 'No se pudo simular la alerta.');
    } finally {
      setSimulatingRain(false);
    }
  };

  const handleReprogram = (alerta) => {
    if (!alerta?.reserva_detalle?.id_reserva) return;
    const defaultValue = resolveSuggestedDatetime(alerta);
    setReprogramReservaId(alerta.reserva_detalle.id_reserva);
    setReprogramDate(defaultValue);
    setReprogramMessage('Reprogramación por alerta climática');
    setWeatherError('');
    setWeatherSuccess('');
    setReprogramModalOpen(true);
  };

  const getWelcomeMessage = () => {
    if (isAdmin) return 'Panel de Administración';
    if (user?.groups?.includes('Empleados')) return 'Panel de Empleado';
    return 'Mi Dashboard';
  };

  const handleReprogramSubmit = async (e) => {
    e.preventDefault();
    if (!reprogramReservaId || !reprogramDate) {
      setWeatherError('Por favor completa todos los campos.');
      return;
    }

    setReprogramming(true);
    setWeatherError('');
    try {
      const isoDate = new Date(reprogramDate).toISOString();
      await weatherService.applyReprogramacion(reprogramReservaId, { nueva_fecha: isoDate });
      setWeatherSuccess('Reserva reprogramada correctamente.');
      setReprogramModalOpen(false);
      await refreshWeatherData();
    } catch (error) {
      console.error('reprogram error', error);
      setWeatherError('No se pudo reprogramar la reserva.');
    } finally {
      setReprogramming(false);
    }
  };

  const handleDismissAlert = async (alerta) => {
    if (!alerta?.id) return;
    setWeatherError('');
    setWeatherSuccess('');
    setDismissingAlertId(alerta.id);
    try {
      await weatherService.dismissAlert(alerta.id, { comentario: 'Se mantiene la fecha original.' });
      setWeatherSuccess('Alerta descartada. La reserva mantiene su fecha.');
      await refreshWeatherData();
    } catch (error) {
      console.error('dismiss alert error', error);
      setWeatherError('No se pudo descartar la alerta.');
    } finally {
      setDismissingAlertId(null);
    }
  };

  const getStats = () => {
    if (isAdmin) {
      return [
        { title: 'Total Usuarios', value: loadingStats ? '...' : stats.total_users.toString(), change: '', icon: <Users className="w-5 h-5 text-gray-400" /> },
        { title: 'Servicios Activos', value: loadingStats ? '...' : stats.active_services.toString(), change: '', icon: <Briefcase className="w-5 h-5 text-gray-400" /> },
        { title: 'Ingresos del Mes', value: loadingStats ? '...' : `$${stats.monthly_revenue.toLocaleString()}`, change: '', icon: <DollarSign className="w-5 h-5 text-gray-400" /> }
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

  const fetchStats = async () => {
    try {
      const data = await adminService.fetchStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const recentActivity = [
    { id: 'SER-001', date: '2025-09-03', customer: 'Leslie Alexander', service: 'Poda de árboles', status: 'Completado', statusColor: 'bg-green-500' },
    { id: 'SER-002', date: '2025-09-02', customer: 'Michael Foster', service: 'Diseño de jardín', status: 'En Progreso', statusColor: 'bg-yellow-500' },
    { id: 'SER-003', date: '2025-09-01', customer: 'Dries Vincent', service: 'Mantenimiento césped', status: 'Completado', statusColor: 'bg-green-500' },
    { id: 'SER-004', date: '2025-08-30', customer: 'Lindsay Walton', service: 'Instalación de riego', status: 'Pendiente', statusColor: 'bg-blue-500' },
    { id: 'SER-005', date: '2025-08-29', customer: 'Tom Cook', service: 'Control de plagas', status: 'Cancelado', statusColor: 'bg-red-500' },
  ];

  return (
    <>
      <div className="min-h-screen bg-gray-900 text-gray-300 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 ">
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

          {isAdmin && (
            <div className="mb-10">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <CloudRain className="w-6 h-6 text-sky-400" />
                  <div>
                    <h2 className="text-lg font-semibold text-white">Alertas por clima</h2>
                    <p className="text-sm text-gray-400">Simulá lluvias y reagendá servicios afectados</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={refreshWeatherData}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gray-700 text-gray-100 hover:bg-gray-600 transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Actualizar
                  </button>
                  <button
                    onClick={openWeatherModal}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md transition bg-sky-600 hover:bg-sky-500 text-white"
                  >
                    <CloudRain className="w-4 h-4" />
                    Simular lluvia
                  </button>
                </div>
              </div>

              {weatherError && <p className="text-red-400 mt-4">{weatherError}</p>}
              {weatherSuccess && <p className="text-green-400 mt-4">{weatherSuccess}</p>}

              <div className="mt-4 bg-gray-800 rounded-lg shadow-lg">
                {loadingWeather ? (
                  <p className="p-4 text-gray-400">Cargando alertas...</p>
                ) : weatherAlerts.length === 0 ? (
                  <p className="p-4 text-gray-400">No hay alertas climáticas pendientes.</p>
                ) : (
                  <ul className="divide-y divide-gray-700">
                    {weatherAlerts.map((alerta) => (
                      <li key={alerta.id} className="p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-white font-semibold">Reserva #{alerta.reserva || 'N/D'}</p>
                          <p className="text-sm text-gray-400">{alerta.message}</p>
                          <p className="text-xs text-gray-500">
                            Fecha: {formatDateForDisplay(alerta.alert_date)} · Precipitación estimada: {alerta.precipitation_mm} mm · Prob: {alerta.probability_percentage || '--'}%
                          </p>
                          {alerta.reserva_detalle && (
                            <p className="text-xs text-gray-500">
                              Cliente: {alerta.reserva_detalle.cliente} · Servicio: {alerta.reserva_detalle.servicio}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReprogram(alerta)}
                            className="px-4 py-2 rounded-md text-sm font-semibold transition bg-emerald-600 hover:bg-emerald-500 text-white"
                          >
                            Reprogramar
                          </button>
                          <button
                            onClick={() => handleDismissAlert(alerta)}
                            disabled={dismissingAlertId === alerta.id}
                            className="px-4 py-2 rounded-md text-sm font-semibold transition bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50"
                          >
                            Mantener fecha
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="mb-10">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h2 className="text-lg font-semibold text-white">Pronóstico por ciudad</h2>
                    <p className="text-sm text-gray-400">Temperatura y probabilidad de lluvia para los próximos 7 días</p>
                  </div>
                </div>
                <button
                  onClick={fetchCityForecasts}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gray-700 text-gray-100 hover:bg-gray-600 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  Actualizar
                </button>
              </div>

              {cityForecastError && <p className="text-red-400 mt-4">{cityForecastError}</p>}

              <div className="mt-4">
                {loadingCityForecasts ? (
                  <p className="text-gray-400">Cargando pronósticos...</p>
                ) : cityForecasts.length === 0 ? (
                  <p className="text-gray-400">No hay reservas próximas con localidad definida.</p>
                ) : (
                  <div className="flex flex-col gap-6">
                    {cityForecasts.map((forecast) => (
                      <div
                        key={forecast?.localidad?.id || `${forecast.display_name}-${forecast.latitude}-${forecast.longitude}`}
                        className="bg-gray-800 rounded-lg p-5 shadow-lg border border-gray-700"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-400">Localidad</p>
                            <h3 className="text-xl font-semibold text-white">{forecast.display_name}</h3>
                            <p className="text-xs text-gray-500">
                              Lat {formatCoordinate(forecast.latitude)} · Lon {formatCoordinate(forecast.longitude)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-400">Reservas vinculadas</p>
                            <p className="text-3xl font-bold text-white">{forecast.reservas?.length || 0}</p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-sm text-gray-400 mb-2">Próximas reservas</p>
                          {forecast.reservas && forecast.reservas.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {forecast.reservas.map((reserva) => (
                                <span key={reserva.id_reserva} className="text-xs bg-gray-700 text-gray-200 px-3 py-1 rounded-full">
                                  #{reserva.id_reserva} · {formatDateForDisplay(reserva.fecha_reserva)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">Sin reservas activas en la ventana seleccionada.</p>
                          )}
                        </div>

                        <div className="mt-4 overflow-x-auto">
                          <table className="w-full text-xs text-gray-400">
                            <thead>
                              <tr className="text-gray-500">
                                <th className="py-2 text-left">Fecha</th>
                                <th className="py-2 text-right">Temp Máx</th>
                                <th className="py-2 text-right">Temp Mín</th>
                                <th className="py-2 text-right">Prob. Lluvia</th>
                                <th className="py-2 text-right">Lluvia (mm)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(forecast.forecast || []).map((day) => (
                                <tr key={`${forecast.display_name}-${day.date}`} className="border-t border-gray-700">
                                  <td className="py-2 text-white">{formatForecastDate(day.date)}</td>
                                  <td className="py-2 text-right text-gray-100">{day.temperature_max !== null && day.temperature_max !== undefined ? `${Math.round(day.temperature_max)}°` : '--'}</td>
                                  <td className="py-2 text-right text-gray-100">{day.temperature_min !== null && day.temperature_min !== undefined ? `${Math.round(day.temperature_min)}°` : '--'}</td>
                                  <td className="py-2 text-right">{day.precipitation_probability !== null && day.precipitation_probability !== undefined ? `${day.precipitation_probability}%` : '--'}</td>
                                  <td className="py-2 text-right">{formatPrecipValue(day.precipitation_sum_mm)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>

    {weatherModalOpen && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
        <div className="bg-gray-900 w-full max-w-lg rounded-lg p-6 shadow-2xl border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Simular lluvia por fecha</h3>
          <p className="text-sm text-gray-400 mb-4">
            Elegí el día con lluvia y generaremos alertas del 100% para todas las reservas reprogramables. Luego, podrás reprogramarlas desde la lista de alertas.
          </p>
          <form className="space-y-4" onSubmit={handleSimulateSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Fecha de simulación</label>
              <input
                type="date"
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={modalDate}
                onChange={(e) => setModalDate(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">La alerta asumirá 2&nbsp;mm de lluvia y 100% de probabilidad.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Mensaje (opcional)</label>
              <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                rows={3}
                value={modalMessage}
                onChange={(e) => setModalMessage(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-md border border-gray-600 text-gray-300 hover:bg-gray-800"
                onClick={closeWeatherModal}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={simulatingRain}
                className={`px-4 py-2 rounded-md font-semibold ${simulatingRain ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}
              >
                {simulatingRain ? 'Simulando...' : 'Crear alerta'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {reprogramModalOpen && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
        <div className="bg-gray-900 w-full max-w-lg rounded-lg p-6 shadow-2xl border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Reprogramar Reserva</h3>
          <form className="space-y-4" onSubmit={handleReprogramSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nueva Fecha</label>
              <input
                type="datetime-local"
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={reprogramDate}
                onChange={(e) => setReprogramDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Mensaje (opcional)</label>
              <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={reprogramMessage}
                onChange={(e) => setReprogramMessage(e.target.value)}
                rows="3"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                className="px-4 py-2 rounded-md border border-gray-600 text-gray-300 hover:bg-gray-800"
                onClick={() => setReprogramModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={reprogramming}
                className={`px-4 py-2 rounded-md font-semibold ${reprogramming ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
              >
                {reprogramming ? 'Reprogramando...' : 'Reprogramar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
};

export default DashboardPage;
