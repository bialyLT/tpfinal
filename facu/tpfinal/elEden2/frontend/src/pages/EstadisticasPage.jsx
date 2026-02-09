import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, RefreshCw, Download, CheckSquare, Square } from 'lucide-react';
import { serviciosService, usersService } from '../services';
import { Bar, Line, Pie } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useAuth } from '../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, ChartDataLabels);

const DEFAULT_PAGE_SIZE = 100;
const TOP_N = 5;
const PLACE_NAME = 'El Edén';

const safeNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatCurrencyARS = (value) => {
  const numeric = safeNumber(value);
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(numeric);
};

const formatPuntuacion = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : '—';
};

const resolveUserName = (user) => {
  if (!user) return 'Sistema';
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  if (fullName) return fullName;
  return user.username || user.email || 'Sistema';
};

const formatGeneratedAt = (date) => new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(date);

const formatFilterRange = (range) => {
  const start = range?.start ? new Date(`${range.start}T00:00:00`) : null;
  const end = range?.end ? new Date(`${range.end}T00:00:00`) : null;
  const formatDate = (date) => new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(date);

  if (start && end) return `Desde ${formatDate(start)} hasta ${formatDate(end)}`;
  if (start) return `Desde ${formatDate(start)}`;
  if (end) return `Hasta ${formatDate(end)}`;
  return 'Todo el período';
};

const getISOWeekInfo = (date) => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);
  const weekNumber = 1 + Math.round((target - firstThursday) / (7 * 24 * 60 * 60 * 1000));
  return { week: weekNumber, year: target.getUTCFullYear() };
};

const formatDateShort = (date) => new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
}).format(date);

const normalizePagedResponse = (data) => {
  if (!data) return { results: [], next: null };
  if (Array.isArray(data)) return { results: data, next: null };
  const results = Array.isArray(data.results) ? data.results : [];
  const next = data.next ?? null;
  return { results, next };
};

const fetchAllPages = async (fetchPage, { pageSize = DEFAULT_PAGE_SIZE, maxPages = 200 } = {}) => {
  const all = [];
  let page = 1;
  // Prefer page-based pagination.
  // If backend uses "next" URLs only, we still iterate by page as long as it supports it.
  while (page <= maxPages) {
    // eslint-disable-next-line no-await-in-loop
    const data = await fetchPage({ page, page_size: pageSize });
    const { results, next } = normalizePagedResponse(data);
    all.push(...results);

    if (!next) break;
    page += 1;
  }
  return all;
};

const chunkedMap = async (items, mapper, { chunkSize = 6 } = {}) => {
  const results = [];
  for (let start = 0; start < items.length; start += chunkSize) {
    const chunk = items.slice(start, start + chunkSize);
    // eslint-disable-next-line no-await-in-loop
    const chunkResults = await Promise.all(chunk.map(mapper));
    results.push(...chunkResults);
  }
  return results;
};

const StatCard = ({ title, value, icon }) => (
  <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm font-medium text-gray-400">{title}</span>
      {icon}
    </div>
    <div className="flex items-baseline">
      <p className="text-3xl font-semibold text-white">{value}</p>
    </div>
  </div>
);

const TableCard = ({ title, children }) => (
  <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-700">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const ChartLoading = ({ label = 'Cargando gráfico...' }) => (
  <div className="bg-gray-900/40 rounded-lg p-6 flex items-center justify-center min-h-[260px] text-gray-300">
    <div className="flex items-center gap-2">
      <RefreshCw size={18} className="animate-spin" />
      <span>{label}</span>
    </div>
  </div>
);

const EstadisticasPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reservas, setReservas] = useState([]);
  const [disenosDetalles, setDisenosDetalles] = useState([]);
  const [empleadosMetricas, setEmpleadosMetricas] = useState(new Map());
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filterError, setFilterError] = useState('');
  const [ventasGranularity, setVentasGranularity] = useState('month');
  const [selectedCharts, setSelectedCharts] = useState({
    serviciosPorTipo: true,
    topProductos: true,
    topEmpleados: true,
    ventasHistoricas: true,
  });
  const [exporting, setExporting] = useState(false);

  const chartRefs = {
    serviciosPorTipo: useRef(null),
    topProductos: useRef(null),
    topEmpleados: useRef(null),
    ventasHistoricas: useRef(null),
  };

  const loadData = async (range = dateRange) => {
    setLoading(true);
    setError('');
    try {
      const dateParams = {};
      if (range?.start) dateParams.fecha_finalizacion_after = range.start;
      if (range?.end) dateParams.fecha_finalizacion_before = range.end;

      const [reservasAll] = await Promise.all([
        fetchAllPages((params) => serviciosService.getReservas({
          ...params,
          ...dateParams,
          include_all: 1,
        })),
      ]);

      let empleadosAll = [];
      try {
        empleadosAll = await fetchAllPages((params) => usersService.getEmpleados({
          ...params,
          page_size: DEFAULT_PAGE_SIZE,
        }));
      } catch (err) {
        console.warn('No se pudieron cargar métricas de empleados', err);
      }

      const metricasMap = new Map();
      empleadosAll.forEach((empleado) => {
        if (!empleado) return;
        const idKey = empleado.id ?? empleado.empleado_id ?? empleado.user_id;
        if (idKey !== undefined && idKey !== null) {
          metricasMap.set(String(idKey), empleado.empleado_metricas || null);
        }
        const emailKey = empleado.email || empleado.empleado_email;
        if (emailKey) {
          metricasMap.set(String(emailKey).toLowerCase(), empleado.empleado_metricas || null);
        }
        const usernameKey = empleado.username || empleado.empleado_username;
        if (usernameKey) {
          metricasMap.set(String(usernameKey).toLowerCase(), empleado.empleado_metricas || null);
        }
        const nombreKey = `${empleado.first_name || ''} ${empleado.last_name || ''}`.trim();
        if (nombreKey) {
          metricasMap.set(nombreKey.toLowerCase(), empleado.empleado_metricas || null);
        }
      });
      setEmpleadosMetricas(metricasMap);

      setReservas(reservasAll);

      // Para "productos usados en servicios" tomamos productos desde diseños.
      // El listado de diseños no incluye productos, así que buscamos el detalle por id.
      const reservasFinalizadas = reservasAll.filter((r) => r?.estado === 'completada');

      const disenoIds = reservasFinalizadas
        .flatMap((r) => (Array.isArray(r?.disenos) ? r.disenos : []))
        .map((d) => d?.id_diseno)
        .filter((id) => id !== null && id !== undefined);

      const uniqueDisenoIds = Array.from(new Set(disenoIds));

      if (uniqueDisenoIds.length === 0) {
        setDisenosDetalles([]);
      } else {
        const detalles = await chunkedMap(
          uniqueDisenoIds,
          async (id) => {
            try {
              return await serviciosService.getDiseno(id);
            } catch (e) {
              console.error('Error obteniendo detalle de diseño', id, e);
              return null;
            }
          },
          { chunkSize: 6 }
        );

        setDisenosDetalles(detalles.filter(Boolean));
      }
    } catch (e) {
      console.error('Error cargando estadísticas', e);
      setError('No se pudieron cargar las estadísticas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyDateRange = () => {
    if (dateRange.start && dateRange.end && dateRange.start > dateRange.end) {
      setFilterError('La fecha "desde" no puede ser posterior a la fecha "hasta".');
      return;
    }
    setFilterError('');
    loadData(dateRange);
  };

  const handleResetDateRange = () => {
    const resetRange = { start: '', end: '' };
    setDateRange(resetRange);
    setFilterError('');
    loadData(resetRange);
  };

  const computed = useMemo(() => {
    const reservasFinalizadas = reservas.filter((r) => r?.estado === 'completada');
    const serviciosCantidad = reservasFinalizadas.length;
    const serviciosPorTipo = new Map();
    const empleadosPorServicios = new Map();
    const ventasHistoricas = new Map();
    const metricasById = empleadosMetricas || new Map();

    reservasFinalizadas.forEach((r) => {
      const tipo = r?.servicio_nombre || 'Sin servicio';
      serviciosPorTipo.set(tipo, (serviciosPorTipo.get(tipo) || 0) + 1);

      const empleados = Array.isArray(r?.empleados_asignados) ? r.empleados_asignados : [];
      empleados.forEach((asignacion) => {
        const empleadoId = asignacion?.empleado ?? asignacion?.empleado_id ?? asignacion?.id_empleado;
        const empleadoNombre = `${asignacion?.empleado_nombre || ''} ${asignacion?.empleado_apellido || ''}`.trim() || 'Empleado';
        const empleadoEmail = asignacion?.empleado_email || asignacion?.email;
        const empleadoUsername = asignacion?.empleado_username || asignacion?.username;
        const key = empleadoId ?? empleadoNombre;
        const metricas =
          (empleadoId != null && (metricasById.get(String(empleadoId)) || metricasById.get(Number(empleadoId)))) ||
          (empleadoEmail && metricasById.get(String(empleadoEmail).toLowerCase())) ||
          (empleadoUsername && metricasById.get(String(empleadoUsername).toLowerCase())) ||
          (empleadoNombre && metricasById.get(empleadoNombre.toLowerCase())) ||
          null;
        const prev = empleadosPorServicios.get(key) || {
          id: empleadoId,
          nombre: empleadoNombre,
          count: 0,
          puntuacion: metricas?.puntuacion_promedio ?? null,
          puntuacionCantidad: metricas?.puntuacion_cantidad ?? 0,
        };
        empleadosPorServicios.set(key, {
          ...prev,
          nombre: empleadoNombre,
          count: prev.count + 1,
          puntuacion: prev.puntuacion ?? metricas?.puntuacion_promedio ?? null,
          puntuacionCantidad: prev.puntuacionCantidad || metricas?.puntuacion_cantidad || 0,
        });
      });

      const estadoPagoFinal = r?.estado_pago_final;
      const estadoPago = r?.estado_pago;
      const servicioCompletado = true;
      const pagoConfirmado = estadoPagoFinal === 'pagado' || estadoPago === 'pagado';
      const montoTotal = safeNumber(r?.monto_total);
      const fechaVenta = r?.fecha_finalizacion || r?.fecha_pago_final || r?.fecha_realizacion || r?.fecha_cita || r?.fecha_solicitud;

      if (servicioCompletado && pagoConfirmado && montoTotal > 0 && fechaVenta) {
        const fecha = new Date(fechaVenta);
        if (!Number.isNaN(fecha.getTime())) {
          let key = '';
          let label = '';

          if (ventasGranularity === 'day') {
            key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
            label = formatDateShort(fecha);
          } else if (ventasGranularity === 'week') {
            const { week, year } = getISOWeekInfo(fecha);
            key = `${year}-W${String(week).padStart(2, '0')}`;
            label = `Semana ${week} ${year}`;
          } else if (ventasGranularity === 'year') {
            key = `${fecha.getFullYear()}`;
            label = `${fecha.getFullYear()}`;
          } else {
            key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
            label = new Intl.DateTimeFormat('es-AR', { month: 'short', year: 'numeric' }).format(fecha);
          }

          const prev = ventasHistoricas.get(key) || { key, label, total: 0, count: 0 };
          ventasHistoricas.set(key, { ...prev, total: prev.total + montoTotal, count: prev.count + 1 });
        }
      }
    });

    let topTipoServicio = { nombre: '--', count: 0 };
    for (const [nombre, count] of serviciosPorTipo.entries()) {
      if (count > topTipoServicio.count) topTipoServicio = { nombre, count };
    }

    const serviciosPorTipoList = Array.from(serviciosPorTipo.entries())
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => b.count - a.count);

    const topEmpleados = Array.from(empleadosPorServicios.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_N);

    // Top productos usados en diseños (servicios)
    const productosPorDiseno = new Map();
    disenosDetalles.forEach((dd) => {
      const productos = Array.isArray(dd?.productos) ? dd.productos : [];
      productos.forEach((p) => {
        const productoId = p?.producto;
        const productoNombre = p?.producto_nombre || `Producto ${productoId ?? ''}`.trim();
        const key = productoId ?? productoNombre;
        const prev = productosPorDiseno.get(key) || { id: productoId, nombre: productoNombre, cantidad: 0, subtotal: 0 };
        productosPorDiseno.set(key, {
          ...prev,
          cantidad: prev.cantidad + safeNumber(p?.cantidad),
          subtotal: prev.subtotal + safeNumber(p?.subtotal),
        });
      });
    });

    const topProductosServicio = Array.from(productosPorDiseno.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, TOP_N);

    const ventasHistoricasList = Array.from(ventasHistoricas.values())
      .sort((a, b) => a.key.localeCompare(b.key));

    return {
      serviciosCantidad,
      serviciosPorTipoList,
      topTipoServicio,
      topEmpleados,
      topProductosServicio,
      ventasHistoricasList,
    };
  }, [reservas, disenosDetalles, ventasGranularity, empleadosMetricas]);

  const chartColors = [
    '#10B981', '#22D3EE', '#F59E0B', '#A78BFA', '#F97316', '#EF4444', '#60A5FA', '#34D399', '#F472B6', '#A3E635'
  ];

  const serviciosPorTipoData = useMemo(() => {
    const labels = computed.serviciosPorTipoList.map((item) => item.nombre);
    const data = computed.serviciosPorTipoList.map((item) => item.count);
    return {
      labels,
      datasets: [
        {
          label: 'Servicios por tipo',
          data,
          backgroundColor: labels.map((_, idx) => chartColors[idx % chartColors.length]),
          borderWidth: 0,
        },
      ],
    };
  }, [computed.serviciosPorTipoList]);

  const topProductosCombinedData = useMemo(() => {
    const labels = computed.topProductosServicio.map((item) => item.nombre);
    const cantidades = computed.topProductosServicio.map((item) => item.cantidad);
    const subtotales = computed.topProductosServicio.map((item) => item.subtotal);
    return {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Cantidad usada',
          data: cantidades,
          backgroundColor: '#22C55E',
          yAxisID: 'y',
        },
        {
          type: 'line',
          label: 'Valor total (ARS)',
          data: subtotales,
          borderColor: '#F97316',
          backgroundColor: 'rgba(249, 115, 22, 0.2)',
          pointBackgroundColor: '#F97316',
          tension: 0.3,
          yAxisID: 'y1',
        },
      ],
    };
  }, [computed.topProductosServicio]);

  const topEmpleadosData = useMemo(() => {
    const labels = computed.topEmpleados.map((item) => item.nombre);
    const data = computed.topEmpleados.map((item) => item.count);
    return {
      labels,
      datasets: [
        {
          label: 'Asignaciones',
          data,
          backgroundColor: '#60A5FA',
        },
      ],
    };
  }, [computed.topEmpleados]);

  const ventasHistoricasData = useMemo(() => {
    const labels = computed.ventasHistoricasList.map((item) => item.label);
    const data = computed.ventasHistoricasList.map((item) => item.total);
    return {
      labels,
      datasets: [
        {
          label: 'Ventas (ARS)',
          data,
          borderColor: '#F97316',
          backgroundColor: 'rgba(249, 115, 22, 0.2)',
          pointBackgroundColor: '#F97316',
          tension: 0.3,
          fill: true,
        },
      ],
    };
  }, [computed.ventasHistoricasList]);

  const chartOptionsBase = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#E5E7EB' } },
      tooltip: { enabled: true },
      datalabels: {
        color: '#E5E7EB',
        anchor: 'end',
        align: 'top',
        formatter: (value) => (Number.isFinite(Number(value)) ? value : ''),
        font: { weight: '600', size: 12 },
        clamp: true,
      },
    },
    scales: {
      x: { ticks: { color: '#E5E7EB' }, grid: { color: 'rgba(255,255,255,0.08)' } },
      y: { ticks: { color: '#E5E7EB' }, grid: { color: 'rgba(255,255,255,0.08)' } },
    },
  };

  const chartOptionsCurrency = {
    ...chartOptionsBase,
    plugins: {
      ...chartOptionsBase.plugins,
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${formatCurrencyARS(context.parsed.y)}`,
        },
      },
      datalabels: {
        ...chartOptionsBase.plugins.datalabels,
        formatter: (value) => (Number.isFinite(Number(value)) ? formatCurrencyARS(value) : ''),
      },
    },
  };

  const chartOptionsNoScale = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#E5E7EB' } },
      tooltip: { enabled: true },
      datalabels: {
        color: '#E5E7EB',
        anchor: 'center',
        align: 'center',
        formatter: (value) => (Number.isFinite(Number(value)) ? value : ''),
        font: { weight: '600', size: 12 },
        clamp: true,
      },
    },
  };

  const chartOptionsTopProductos = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#E5E7EB' } },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            if (context.dataset.yAxisID === 'y1') {
              return `${context.dataset.label}: ${formatCurrencyARS(value)}`;
            }
            return `${context.dataset.label}: ${value}`;
          },
        },
      },
      datalabels: {
        color: '#E5E7EB',
        anchor: 'end',
        align: 'top',
        formatter: (value, context) => {
          if (context.dataset.yAxisID === 'y1') {
            return Number.isFinite(Number(value)) ? formatCurrencyARS(value) : '';
          }
          return Number.isFinite(Number(value)) ? value : '';
        },
        font: { weight: '600', size: 11 },
        clamp: true,
      },
    },
    scales: {
      x: { ticks: { color: '#E5E7EB' }, grid: { color: 'rgba(255,255,255,0.08)' } },
      y: {
        position: 'left',
        ticks: { color: '#E5E7EB' },
        grid: { color: 'rgba(255,255,255,0.08)' },
        title: { display: true, text: 'Unidades', color: '#E5E7EB' },
      },
      y1: {
        position: 'right',
        ticks: { color: '#E5E7EB', callback: (value) => formatCurrencyARS(value) },
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'ARS', color: '#E5E7EB' },
      },
    },
  };

  const toggleChartSelection = (key) => {
    setSelectedCharts((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasSelectedCharts = Object.values(selectedCharts).some(Boolean);

  const exportSelectedCharts = async () => {
    if (!hasSelectedCharts || exporting) return;
    setExporting(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
      const generatedAt = formatGeneratedAt(new Date());
      const generatedBy = resolveUserName(user);
      const filterRangeLabel = formatFilterRange(dateRange);
      const headerTitle = 'Reporte de Estadísticas';
      const headerLines = [
        `Generado: ${generatedAt}`,
        `Lugar: ${PLACE_NAME}`,
        `Usuario: ${generatedBy}`,
        `Filtro: ${filterRangeLabel}`,
      ];
      const headerHeight = 70;

      const addHeader = () => {
        pdf.setTextColor(17, 24, 39);
        pdf.setFontSize(16);
        pdf.text(headerTitle, 20, 24);
        pdf.setFontSize(10);
        headerLines.forEach((line, idx) => {
          pdf.text(line, 20, 40 + idx * 12);
        });
      };

      const selectedOrder = [
        { key: 'serviciosPorTipo', title: 'Servicios por tipo' },
        { key: 'topProductos', title: 'Top productos usados' },
        { key: 'topEmpleados', title: 'Top empleados asignados' },
        { key: 'ventasHistoricas', title: 'Histórico de ventas de servicios realizados' },
      ];

      let firstPage = true;
      for (const item of selectedOrder) {
        if (!selectedCharts[item.key]) continue;
        const ref = chartRefs[item.key]?.current;
        if (!ref) continue;

        // eslint-disable-next-line no-await-in-loop
        const canvas = await html2canvas(ref, {
          backgroundColor: '#111827',
          scale: 2,
          onclone: (clonedDoc) => {
            clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => el.remove());
            if (clonedDoc.body) {
              clonedDoc.body.style.backgroundColor = '#111827';
              clonedDoc.body.style.color = '#E5E7EB';
            }
          },
        });
        const imgData = canvas.toDataURL('image/png');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth - 40;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (!firstPage) pdf.addPage();
        addHeader();
        pdf.setTextColor(17, 24, 39);
        pdf.setFontSize(12);
        pdf.text(item.title, 20, headerHeight);
        const yStart = headerHeight + 12;
        pdf.addImage(imgData, 'PNG', 20, yStart, imgWidth, Math.min(imgHeight, pageHeight - yStart - 20));
        firstPage = false;
      }

      pdf.save('estadisticas-graficos.pdf');
    } catch (e) {
      console.error('Error exportando PDF', e);
      setError('No se pudo generar el PDF.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="text-emerald-400" size={28} />
            <h1 className="text-2xl font-bold text-white">Estadísticas</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Cargando...' : 'Actualizar'}
            </button>
            <button
              onClick={exportSelectedCharts}
              disabled={!hasSelectedCharts || exporting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Download size={18} />
              {exporting ? 'Generando PDF...' : 'Exportar PDF'}
            </button>
          </div>
        </div>

        <div className="mb-6 bg-gray-800 rounded-lg shadow-lg p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:max-w-xl">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Desde</label>
                <input
                  type="date"
                  name="start"
                  value={dateRange.start}
                  onChange={handleDateChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Hasta</label>
                <input
                  type="date"
                  name="end"
                  value={dateRange.end}
                  onChange={handleDateChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleApplyDateRange}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Aplicar
              </button>
              <button
                type="button"
                onClick={handleResetDateRange}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Limpiar
              </button>
            </div>
          </div>
          {filterError && (
            <div className="mt-3 text-sm text-red-300">
              {filterError}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Cantidad de servicios"
            value={computed.serviciosCantidad}
            icon={<FileText className="text-emerald-400" size={24} />}
          />
          <StatCard
            title="Tipo de servicio más frecuente"
            value={computed.topTipoServicio.nombre === '--' ? '--' : `${computed.topTipoServicio.nombre} (${computed.topTipoServicio.count})`}
            icon={<FileText className="text-emerald-400" size={24} />}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TableCard title="Histórico de ventas de servicios realizados">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => toggleChartSelection('ventasHistoricas')}
                className="flex items-center gap-2 text-sm text-gray-300"
                type="button"
              >
                {selectedCharts.ventasHistoricas ? <CheckSquare size={18} /> : <Square size={18} />}
                Incluir en PDF
              </button>
              <select
                value={ventasGranularity}
                onChange={(e) => setVentasGranularity(e.target.value)}
                className="ml-auto px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white"
              >
                <option value="day">Día</option>
                <option value="week">Semana</option>
                <option value="month">Mes</option>
                <option value="year">Año</option>
              </select>
            </div>
            {loading ? (
              <ChartLoading />
            ) : computed.ventasHistoricasList.length === 0 ? (
              <p className="text-gray-400">Sin datos.</p>
            ) : (
              <div ref={chartRefs.ventasHistoricas} className="bg-gray-900/40 rounded-lg p-4">
                <Line data={ventasHistoricasData} options={chartOptionsCurrency} />
                <div className="mt-4 text-sm text-gray-400">
                  {computed.ventasHistoricasList.map((item) => (
                    <div key={item.key} className="flex justify-between border-b border-gray-800 py-1">
                      <span className="text-white">{item.label}</span>
                      <span>{formatCurrencyARS(item.total)} · {item.count} servicio{item.count !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TableCard>

          <TableCard title="Servicios por tipo (todos)">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => toggleChartSelection('serviciosPorTipo')}
                className="flex items-center gap-2 text-sm text-gray-300"
                type="button"
              >
                {selectedCharts.serviciosPorTipo ? <CheckSquare size={18} /> : <Square size={18} />}
                Incluir en PDF
              </button>
            </div>
            {loading ? (
              <ChartLoading />
            ) : computed.serviciosPorTipoList.length === 0 ? (
              <p className="text-gray-400">Sin datos.</p>
            ) : (
              <div ref={chartRefs.serviciosPorTipo} className="bg-gray-900/40 rounded-lg p-4">
                <Pie data={serviciosPorTipoData} options={chartOptionsNoScale} />
              </div>
            )}
          </TableCard>

          <TableCard title={`Productos más usados en servicios (por diseños) - Top ${TOP_N}`}>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => toggleChartSelection('topProductos')}
                className="flex items-center gap-2 text-sm text-gray-300"
                type="button"
              >
                {selectedCharts.topProductos ? <CheckSquare size={18} /> : <Square size={18} />}
                Incluir en PDF
              </button>
            </div>
            {loading ? (
              <ChartLoading />
            ) : computed.topProductosServicio.length === 0 ? (
              <p className="text-gray-400">Sin datos.</p>
            ) : (
              <div ref={chartRefs.topProductos} className="bg-gray-900/40 rounded-lg p-4">
                <Bar data={topProductosCombinedData} options={chartOptionsTopProductos} />
                <div className="mt-4 text-sm text-gray-400">
                  {computed.topProductosServicio.map((p) => (
                    <div key={p.id ?? p.nombre} className="flex justify-between border-b border-gray-800 py-1">
                      <span className="text-white">{p.nombre}</span>
                      <span>{p.cantidad} · {formatCurrencyARS(p.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TableCard>

          <TableCard title={`Empleados con más servicios asignados - Top ${TOP_N}`}>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => toggleChartSelection('topEmpleados')}
                className="flex items-center gap-2 text-sm text-gray-300"
                type="button"
              >
                {selectedCharts.topEmpleados ? <CheckSquare size={18} /> : <Square size={18} />}
                Incluir en PDF
              </button>
            </div>
            {loading ? (
              <ChartLoading />
            ) : computed.topEmpleados.length === 0 ? (
              <p className="text-gray-400">Sin datos.</p>
            ) : (
              <div ref={chartRefs.topEmpleados} className="bg-gray-900/40 rounded-lg p-4">
                <Bar data={topEmpleadosData} options={chartOptionsBase} />
                <div className="mt-4 text-sm text-gray-400">
                  <div className="text-xs uppercase text-gray-500 mb-2">Indice de puntuacion</div>
                  {computed.topEmpleados.map((empleado) => (
                    <div key={empleado.id ?? empleado.nombre} className="flex justify-between border-b border-gray-800 py-1">
                      <span className="text-white">{empleado.nombre}</span>
                      <span>
                        {empleado.count} serv. · Puntaje: {formatPuntuacion(empleado.puntuacion)}
                        {empleado.puntuacionCantidad ? ` (${empleado.puntuacionCantidad})` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TableCard>
        </div>
      </div>
    </div>
  );
};

export default EstadisticasPage;
