import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  RefreshCw,
  Download,
  CheckSquare,
  Square,
  TrendingUp,
  Wallet,
  BadgePercent,
  LineChart,
  AlertTriangle,
  BriefcaseBusiness,
} from 'lucide-react';
import { serviciosService, comprasService } from '../services';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
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
const REPORT_TITLE = 'Reporte Financiero';

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

const formatScore = (value) => {
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


const StatCard = ({ title, value, icon }) => (
  <div className="bg-white/5 backdrop-blur border border-white/10 p-5 rounded-2xl shadow-[0_18px_60px_-30px_rgba(0,0,0,0.9)]">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{title}</span>
      {icon}
    </div>
    <p className="text-2xl font-semibold text-white">{value}</p>
  </div>
);

const TableCard = ({ title, children }) => (
  <div className="bg-slate-900/70 rounded-2xl shadow-xl border border-slate-800/60 overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-800">
      <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
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
  const [compras, setCompras] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filterError, setFilterError] = useState('');
  const [ventasGranularity, setVentasGranularity] = useState('month');
  const [costosGranularity, setCostosGranularity] = useState('month');
  const [margenGranularity, setMargenGranularity] = useState('month');
  const [selectedCharts, setSelectedCharts] = useState({
    ingresosHistoricos: true,
    costosHistoricos: true,
    margenHistorico: true,
    ingresosPorServicio: true,
    estadoCobranza: true,
    topClientes: true,
  });
  const [exporting, setExporting] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const chartRefs = {
    ingresosHistoricos: useRef(null),
    costosHistoricos: useRef(null),
    margenHistorico: useRef(null),
    ingresosPorServicio: useRef(null),
    estadoCobranza: useRef(null),
    topClientes: useRef(null),
  };
  const reportRef = useRef(null);

  const loadData = async (range = dateRange) => {
    setLoading(true);
    setError('');
    try {
      const dateParams = {};
      if (range?.start) dateParams.fecha_finalizacion_after = range.start;
      if (range?.end) dateParams.fecha_finalizacion_before = range.end;

      const comprasParams = {};
      if (range?.start) comprasParams.fecha__gte = range.start;
      if (range?.end) comprasParams.fecha__lte = range.end;

      const [reservasAll, comprasAll] = await Promise.all([
        fetchAllPages((params) => serviciosService.getReservas({
          ...params,
          ...dateParams,
          include_all: 1,
        })),
        fetchAllPages((params) => comprasService.getAll({
          ...params,
          ...comprasParams,
        })),
      ]);

      setReservas(reservasAll);
      setCompras(comprasAll);
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
    const startDate = dateRange.start ? new Date(`${dateRange.start}T00:00:00`) : null;
    const endDate = dateRange.end ? new Date(`${dateRange.end}T23:59:59`) : null;
    const isInRange = (value) => {
      if (!value) return true;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return true;
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;
      return true;
    };

    const resolveReservaDate = (r) => r?.fecha_finalizacion || r?.fecha_pago_final || r?.fecha_realizacion || r?.fecha_cita || r?.fecha_solicitud;
    const reservasFiltradas = reservas.filter((r) => isInRange(resolveReservaDate(r)));
    const reservasCompletadas = reservasFiltradas.filter((r) => r?.estado === 'completada');
    const reservasCanceladas = reservasFiltradas.filter((r) => r?.estado === 'cancelada');

    const isFinalPaid = (r) => r?.estado_pago_final === 'pagado' || r?.estado_pago === 'pagado';
    const isSenaPaid = (r) => r?.estado_pago_sena === 'sena_pagada' || r?.estado_pago === 'sena_pagada';

    const ingresosEventos = [];
    const costosEventos = [];
    const ingresosPorServicio = new Map();
    const ingresosPorCliente = new Map();
    const cobranzas = { cobrados: 0, senas: 0, pendientes: 0 };

    const addPeriod = (map, dateValue, amount, granularity) => {
      if (!dateValue || !Number.isFinite(amount)) return;
      const fecha = new Date(dateValue);
      if (Number.isNaN(fecha.getTime())) return;

      let key = '';
      let label = '';
      if (granularity === 'day') {
        key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
        label = formatDateShort(fecha);
      } else if (granularity === 'week') {
        const { week, year } = getISOWeekInfo(fecha);
        key = `${year}-W${String(week).padStart(2, '0')}`;
        label = `Semana ${week} ${year}`;
      } else if (granularity === 'year') {
        key = `${fecha.getFullYear()}`;
        label = `${fecha.getFullYear()}`;
      } else {
        key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        label = new Intl.DateTimeFormat('es-AR', { month: 'short', year: 'numeric' }).format(fecha);
      }
      const prev = map.get(key) || { key, label, total: 0, count: 0 };
      map.set(key, { ...prev, total: prev.total + amount, count: prev.count + 1 });
    };

    const buildPeriodMap = (events, granularity) => {
      const map = new Map();
      events.forEach((event) => {
        addPeriod(map, event.date, event.amount, granularity);
      });
      return map;
    };

    reservasCompletadas.forEach((r) => {
      const montoTotal = safeNumber(r?.monto_total);
      const montoSena = safeNumber(r?.monto_sena);
      const montoFinal = safeNumber(r?.monto_final);

      if (isFinalPaid(r)) {
        const fechaIngreso = r?.fecha_finalizacion || r?.fecha_pago_final || r?.fecha_cita || r?.fecha_solicitud;
        ingresosEventos.push({ date: fechaIngreso, amount: montoTotal });
        cobranzas.cobrados += montoTotal;

        const servicioNombre = r?.servicio_nombre || 'Sin servicio';
        const prevServicio = ingresosPorServicio.get(servicioNombre) || { nombre: servicioNombre, total: 0, count: 0 };
        ingresosPorServicio.set(servicioNombre, {
          ...prevServicio,
          total: prevServicio.total + montoTotal,
          count: prevServicio.count + 1,
        });

        const clienteNombre = `${r?.cliente_nombre || ''} ${r?.cliente_apellido || ''}`.trim() || 'Cliente';
        const prevCliente = ingresosPorCliente.get(clienteNombre) || { nombre: clienteNombre, total: 0 };
        ingresosPorCliente.set(clienteNombre, {
          ...prevCliente,
          total: prevCliente.total + montoTotal,
        });
      } else if (isSenaPaid(r)) {
        cobranzas.senas += montoSena;
        cobranzas.pendientes += Math.max(0, montoFinal || (montoTotal - montoSena));
      } else if (montoTotal > 0) {
        cobranzas.pendientes += montoTotal;
      }
    });

    const comprasFiltradas = compras.filter((c) => isInRange(c?.fecha));
    comprasFiltradas.forEach((c) => {
      const total = safeNumber(c?.total);
      costosEventos.push({ date: c?.fecha, amount: total });
    });

    const ingresosHistoricos = buildPeriodMap(ingresosEventos, ventasGranularity);
    const costosHistoricos = buildPeriodMap(costosEventos, costosGranularity);
    const ingresosMargen = buildPeriodMap(ingresosEventos, margenGranularity);
    const costosMargen = buildPeriodMap(costosEventos, margenGranularity);

    const ingresosHistoricosList = Array.from(ingresosHistoricos.values()).sort((a, b) => a.key.localeCompare(b.key));
    const costosHistoricosList = Array.from(costosHistoricos.values()).sort((a, b) => a.key.localeCompare(b.key));

    const margenHistorico = new Map();
    const periodKeys = new Set([...ingresosMargen.keys(), ...costosMargen.keys()]);
    periodKeys.forEach((key) => {
      const ingreso = ingresosMargen.get(key) || { total: 0, label: key, count: 0 };
      const costo = costosMargen.get(key) || { total: 0, label: key, count: 0 };
      margenHistorico.set(key, {
        key,
        label: ingreso.label || costo.label || key,
        total: ingreso.total - costo.total,
        ingreso: ingreso.total,
        costo: costo.total,
      });
    });

    const margenHistoricoList = Array.from(margenHistorico.values()).sort((a, b) => a.key.localeCompare(b.key));

    const ingresosPorServicioList = Array.from(ingresosPorServicio.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, TOP_N);

    const topClientes = Array.from(ingresosPorCliente.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, TOP_N);

    const serviciosPagados = ingresosEventos.length;
    const ingresosCobrados = cobranzas.cobrados;
    const costosTotales = comprasFiltradas.reduce((acc, item) => acc + safeNumber(item?.total), 0);
    const margenBruto = ingresosCobrados - costosTotales;

    const ticketPromedio = serviciosPagados > 0 ? ingresosCobrados / serviciosPagados : 0;
    const tasaCobranzaFinal = reservasCompletadas.length > 0 ? serviciosPagados / reservasCompletadas.length : 0;
    const tasaCancelacion = reservasFiltradas.length > 0 ? reservasCanceladas.length / reservasFiltradas.length : 0;

    const puntuaciones = new Map();
    reservasCompletadas.forEach((r) => {
      const empleados = Array.isArray(r?.empleados_asignados) ? r.empleados_asignados : [];
      empleados.forEach((asignacion) => {
        const empleadoId = asignacion?.empleado ?? asignacion?.empleado_id ?? asignacion?.id_empleado;
        const empleadoEmail = asignacion?.empleado_email || asignacion?.email;
        const empleadoNombre = `${asignacion?.empleado_nombre || ''} ${asignacion?.empleado_apellido || ''}`.trim();
        const key = empleadoId ?? empleadoEmail ?? empleadoNombre;
        const puntuacion = safeNumber(asignacion?.puntuacion_promedio);
        if (key != null && puntuacion > 0) {
          puntuaciones.set(String(key), puntuacion);
        }
      });
    });

    const promedioPuntuacion = puntuaciones.size > 0
      ? Array.from(puntuaciones.values()).reduce((acc, value) => acc + value, 0) / puntuaciones.size
      : null;

    const reprogramaciones = reservasFiltradas.filter((r) => (
      r?.requiere_reprogramacion || r?.fecha_reprogramada_confirmada || r?.fecha_reprogramada_sugerida
    )).length;

    const variacionIngresos = (() => {
      if (ingresosHistoricosList.length < 2) return null;
      const last = ingresosHistoricosList[ingresosHistoricosList.length - 1];
      const prev = ingresosHistoricosList[ingresosHistoricosList.length - 2];
      if (!prev || prev.total === 0) return null;
      return (last.total - prev.total) / prev.total;
    })();

    return {
      ingresosHistoricosList,
      costosHistoricosList,
      margenHistoricoList,
      ingresosPorServicioList,
      topClientes,
      cobranzas,
      ingresosCobrados,
      costosTotales,
      margenBruto,
      ticketPromedio,
      tasaCobranzaFinal,
      tasaCancelacion,
      promedioPuntuacion,
      reprogramaciones,
      variacionIngresos,
      reservasCompletadas,
      reservasCanceladas,
    };
  }, [reservas, compras, ventasGranularity, costosGranularity, margenGranularity, dateRange]);

  const chartColors = [
    '#10B981', '#22D3EE', '#F59E0B', '#A78BFA', '#F97316', '#EF4444', '#60A5FA', '#34D399', '#F472B6', '#A3E635'
  ];

  const ingresosHistoricosData = useMemo(() => {
    const labels = computed.ingresosHistoricosList.map((item) => item.label);
    const data = computed.ingresosHistoricosList.map((item) => item.total);
    return {
      labels,
      datasets: [
        {
          label: 'Ingresos cobrados (ARS)',
          data,
          borderColor: '#34D399',
          backgroundColor: 'rgba(52, 211, 153, 0.25)',
          pointBackgroundColor: '#34D399',
          tension: 0.35,
          fill: true,
        },
      ],
    };
  }, [computed.ingresosHistoricosList]);

  const costosHistoricosData = useMemo(() => {
    const labels = computed.costosHistoricosList.map((item) => item.label);
    const data = computed.costosHistoricosList.map((item) => item.total);
    return {
      labels,
      datasets: [
        {
          label: 'Compras (ARS)',
          data,
          backgroundColor: '#60A5FA',
        },
      ],
    };
  }, [computed.costosHistoricosList]);

  const margenHistoricoData = useMemo(() => {
    const labels = computed.margenHistoricoList.map((item) => item.label);
    const data = computed.margenHistoricoList.map((item) => item.total);
    return {
      labels,
      datasets: [
        {
          label: 'Margen bruto estimado (ARS)',
          data,
          borderColor: '#FBBF24',
          backgroundColor: 'rgba(251, 191, 36, 0.2)',
          pointBackgroundColor: '#FBBF24',
          tension: 0.3,
          fill: true,
        },
      ],
    };
  }, [computed.margenHistoricoList]);

  const ingresosPorServicioData = useMemo(() => {
    const labels = computed.ingresosPorServicioList.map((item) => item.nombre);
    const data = computed.ingresosPorServicioList.map((item) => item.total);
    return {
      labels,
      datasets: [
        {
          label: 'Ingresos por servicio (ARS)',
          data,
          backgroundColor: labels.map((_, idx) => chartColors[idx % chartColors.length]),
        },
      ],
    };
  }, [computed.ingresosPorServicioList]);

  const estadoCobranzaData = useMemo(() => {
    const labels = ['Cobrado', 'Señas', 'Pendiente'];
    const data = [computed.cobranzas.cobrados, computed.cobranzas.senas, computed.cobranzas.pendientes];
    return {
      labels,
      datasets: [
        {
          label: 'Estado de cobranza (ARS)',
          data,
          backgroundColor: ['#34D399', '#60A5FA', '#F97316'],
          borderWidth: 0,
        },
      ],
    };
  }, [computed.cobranzas]);

  const topClientesData = useMemo(() => {
    const labels = computed.topClientes.map((item) => item.nombre);
    const data = computed.topClientes.map((item) => item.total);
    return {
      labels,
      datasets: [
        {
          label: 'Facturación por cliente (ARS)',
          data,
          backgroundColor: '#A78BFA',
        },
      ],
    };
  }, [computed.topClientes]);

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

  const chartOptionsPercent = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#E5E7EB' } },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${formatCurrencyARS(context.parsed)}`,
        },
      },
      datalabels: {
        color: '#E5E7EB',
        formatter: (value, context) => {
          const total = context.chart.data.datasets[0].data.reduce((acc, v) => acc + Number(v || 0), 0);
          if (!total) return '';
          const percent = (Number(value) / total) * 100;
          return `${percent.toFixed(1)}%`;
        },
        font: { weight: '600', size: 12 },
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
      const addHeader = () => {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const maxWidth = pageWidth - 32;
        let y = 24;

        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(16);
        pdf.text(headerTitle, 16, y);
        y += 16;

        pdf.setFontSize(10);
        headerLines.forEach((line) => {
          const wrapped = pdf.splitTextToSize(line, maxWidth);
          pdf.text(wrapped, 16, y);
          y += wrapped.length * 12;
        });

        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.6);
        pdf.line(16, y + 4, pageWidth - 16, y + 4);

        return y + 12;
      };

      const selectedOrder = [
        { key: 'ingresosHistoricos', title: 'Ingresos cobrados por período' },
        { key: 'costosHistoricos', title: 'Costos de compras por período' },
        { key: 'margenHistorico', title: 'Margen bruto estimado por período' },
        { key: 'ingresosPorServicio', title: 'Ingresos por tipo de servicio' },
        { key: 'estadoCobranza', title: 'Estado de cobranza' },
        { key: 'topClientes', title: 'Top clientes por facturación' },
      ];

      const selectedItems = selectedOrder.filter((item) => selectedCharts[item.key]);

      let firstPage = true;
      let pageIndex = 0;
      for (const item of selectedItems) {
        const ref = chartRefs[item.key]?.current;
        if (!ref) continue;

        const chartCanvas = ref.querySelector('canvas');
        let imgData = '';
        let imgNaturalWidth = 0;
        let imgNaturalHeight = 0;

        if (chartCanvas) {
          imgData = chartCanvas.toDataURL('image/png', 1.0);
          imgNaturalWidth = chartCanvas.width;
          imgNaturalHeight = chartCanvas.height;
        } else {
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
          imgData = canvas.toDataURL('image/png');
          imgNaturalWidth = canvas.width;
          imgNaturalHeight = canvas.height;
        }

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth - 32;
        const imgHeight = (imgNaturalHeight * imgWidth) / imgNaturalWidth;

        if (!firstPage) pdf.addPage();
        const headerBottom = addHeader();
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(12);
        pdf.text(item.title, 16, headerBottom + 4);
        const yStart = headerBottom + 14;
        const maxHeight = pageHeight - yStart - 16;
        pdf.addImage(imgData, 'PNG', 16, yStart, imgWidth, Math.min(imgHeight, maxHeight));
        pageIndex += 1;
        const totalPages = selectedItems.length || 1;
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Página ${pageIndex} de ${totalPages}`, pageWidth - 16, pageHeight - 10, { align: 'right' });
        firstPage = false;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      pdf.save(`reporte-financiero-estadistico-graficos-${timestamp}.pdf`);
    } catch (e) {
      console.error('Error exportando PDF', e);
      setError('No se pudo generar el PDF.');
    } finally {
      setExporting(false);
    }
  };

  const exportReportPDF = async () => {
    if (!reportRef.current || exportingReport) return false;
    setExportingReport(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => el.remove());
          if (clonedDoc.body) {
            clonedDoc.body.style.backgroundColor = '#ffffff';
          }
          const style = clonedDoc.createElement('style');
          style.textContent = `
            #report-export {
              background-color: #ffffff;
              color: #0f172a;
              font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
              padding: 32px;
            }
            #report-export * {
              color: inherit;
              box-shadow: none;
            }
            #report-export h2 { font-size: 24px; margin: 0; }
            #report-export h3 { font-size: 16px; margin: 0 0 8px; }
            #report-export .report-label { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #334155; }
            #report-export .report-muted { color: #334155; font-size: 12px; }
            #report-export .report-row { display: flex; justify-content: space-between; gap: 24px; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            #report-export .report-label-text { flex: 1; padding-right: 12px; }
            #report-export .report-value { min-width: 140px; text-align: right; }
            #report-export .report-section { border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 16px; }
          `;
          clonedDoc.head.appendChild(style);
        },
      });

      const imgData = canvas.toDataURL('image/png');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 20;

      pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        pdf.addPage();
        position = heightLeft - imgHeight + 20;
        pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const totalPages = pdf.getNumberOfPages();
      const footerPageWidth = pdf.internal.pageSize.getWidth();
      const footerPageHeight = pdf.internal.pageSize.getHeight();
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      for (let page = 1; page <= totalPages; page += 1) {
        pdf.setPage(page);
        pdf.text(`Página ${page} de ${totalPages}`, footerPageWidth - 16, footerPageHeight - 10, { align: 'right' });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      pdf.save(`reporte-financiero-estadistico-${timestamp}.pdf`);
      return true;
    } catch (e) {
      console.error('Error exportando reporte PDF', e);
      setError('No se pudo generar el reporte PDF.');
      return false;
    } finally {
      setExportingReport(false);
    }
  };

  const handleOpenReportModal = () => {
    setShowReportModal(true);
  };

  const handleCloseReportModal = () => {
    if (!exportingReport) {
      setShowReportModal(false);
    }
  };

  const handleConfirmReportDownload = async () => {
    const success = await exportReportPDF();
    if (success) {
      setShowReportModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="pt-4 pb-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="mt-4 text-3xl md:text-4xl font-semibold text-white">Estadísticas financieras</h1>
              <p className="mt-2 text-sm text-slate-300 max-w-2xl">
                Visualiza el rendimiento económico del negocio, la salud de cobranza y los márgenes estimados para
                tomar decisiones informadas.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 disabled:opacity-50"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Actualizando...' : 'Actualizar datos'}
              </button>
              <button
                onClick={exportSelectedCharts}
                disabled={!hasSelectedCharts || exporting}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
              >
                <Download size={18} />
                {exporting ? 'Generando PDF...' : 'Exportar gráficos'}
              </button>
              <button
                onClick={handleOpenReportModal}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-50"
              >
                <FileText size={18} />
                Generar reporte
              </button>
            </div>
          </div>

          <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:max-w-xl">
                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">Desde</label>
                  <input
                    type="date"
                    name="start"
                    value={dateRange.start}
                    onChange={handleDateChange}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">Hasta</label>
                  <input
                    type="date"
                    name="end"
                    value={dateRange.end}
                    onChange={handleDateChange}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleApplyDateRange}
                  className="px-4 py-2 bg-emerald-500 text-slate-950 rounded-full font-semibold hover:bg-emerald-400"
                >
                  Aplicar
                </button>
                <button
                  type="button"
                  onClick={handleResetDateRange}
                  className="px-4 py-2 bg-white/10 text-white rounded-full hover:bg-white/20"
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
        </div>

      <div className="pb-12">

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard
            title="Ingresos cobrados"
            value={formatCurrencyARS(computed.ingresosCobrados)}
            icon={<Wallet className="text-emerald-300" size={22} />}
          />
          <StatCard
            title="Margen bruto estimado"
            value={formatCurrencyARS(computed.margenBruto)}
            icon={<BadgePercent className="text-amber-300" size={22} />}
          />
          <StatCard
            title="Ticket promedio"
            value={formatCurrencyARS(computed.ticketPromedio)}
            icon={<LineChart className="text-sky-300" size={22} />}
          />
          <StatCard
            title="Cobranza final"
            value={computed.tasaCobranzaFinal ? `${(computed.tasaCobranzaFinal * 100).toFixed(1)}%` : '—'}
            icon={<TrendingUp className="text-emerald-300" size={22} />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TableCard title="Ingresos cobrados por período">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => toggleChartSelection('ingresosHistoricos')}
                className="flex items-center gap-2 text-sm text-slate-300"
                type="button"
              >
                {selectedCharts.ingresosHistoricos ? <CheckSquare size={18} /> : <Square size={18} />}
                Incluir en PDF
              </button>
              <select
                value={ventasGranularity}
                onChange={(e) => setVentasGranularity(e.target.value)}
                className="ml-auto px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              >
                <option value="day">Día</option>
                <option value="week">Semana</option>
                <option value="month">Mes</option>
                <option value="year">Año</option>
              </select>
            </div>
            {loading ? (
              <ChartLoading />
            ) : computed.ingresosHistoricosList.length === 0 ? (
              <p className="text-slate-400">Sin datos.</p>
            ) : (
              <div ref={chartRefs.ingresosHistoricos} className="bg-slate-950/50 rounded-xl p-4">
                <Line data={ingresosHistoricosData} options={chartOptionsCurrency} />
              </div>
            )}
          </TableCard>

          <TableCard title="Costos de compras por período">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => toggleChartSelection('costosHistoricos')}
                className="flex items-center gap-2 text-sm text-slate-300"
                type="button"
              >
                {selectedCharts.costosHistoricos ? <CheckSquare size={18} /> : <Square size={18} />}
                Incluir en PDF
              </button>
              <select
                value={costosGranularity}
                onChange={(e) => setCostosGranularity(e.target.value)}
                className="ml-auto px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              >
                <option value="day">Día</option>
                <option value="week">Semana</option>
                <option value="month">Mes</option>
                <option value="year">Año</option>
              </select>
            </div>
            {loading ? (
              <ChartLoading />
            ) : computed.costosHistoricosList.length === 0 ? (
              <p className="text-slate-400">Sin datos.</p>
            ) : (
              <div ref={chartRefs.costosHistoricos} className="bg-slate-950/50 rounded-xl p-4">
                <Bar data={costosHistoricosData} options={chartOptionsCurrency} />
              </div>
            )}
          </TableCard>

          <TableCard title="Margen bruto estimado por período">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => toggleChartSelection('margenHistorico')}
                className="flex items-center gap-2 text-sm text-slate-300"
                type="button"
              >
                {selectedCharts.margenHistorico ? <CheckSquare size={18} /> : <Square size={18} />}
                Incluir en PDF
              </button>
              <select
                value={margenGranularity}
                onChange={(e) => setMargenGranularity(e.target.value)}
                className="ml-auto px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              >
                <option value="day">Día</option>
                <option value="week">Semana</option>
                <option value="month">Mes</option>
                <option value="year">Año</option>
              </select>
            </div>
            {loading ? (
              <ChartLoading />
            ) : computed.margenHistoricoList.length === 0 ? (
              <p className="text-slate-400">Sin datos.</p>
            ) : (
              <div ref={chartRefs.margenHistorico} className="bg-slate-950/50 rounded-xl p-4">
                <Line data={margenHistoricoData} options={chartOptionsCurrency} />
              </div>
            )}
          </TableCard>

          <TableCard title={`Ingresos por tipo de servicio - Top ${TOP_N}`}>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => toggleChartSelection('ingresosPorServicio')}
                className="flex items-center gap-2 text-sm text-slate-300"
                type="button"
              >
                {selectedCharts.ingresosPorServicio ? <CheckSquare size={18} /> : <Square size={18} />}
                Incluir en PDF
              </button>
            </div>
            {loading ? (
              <ChartLoading />
            ) : computed.ingresosPorServicioList.length === 0 ? (
              <p className="text-slate-400">Sin datos.</p>
            ) : (
              <div ref={chartRefs.ingresosPorServicio} className="bg-slate-950/50 rounded-xl p-4">
                <Bar data={ingresosPorServicioData} options={chartOptionsCurrency} />
              </div>
            )}
          </TableCard>

          <TableCard title="Estado de cobranza del período">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => toggleChartSelection('estadoCobranza')}
                className="flex items-center gap-2 text-sm text-slate-300"
                type="button"
              >
                {selectedCharts.estadoCobranza ? <CheckSquare size={18} /> : <Square size={18} />}
                Incluir en PDF
              </button>
            </div>
            {loading ? (
              <ChartLoading />
            ) : (
              <div ref={chartRefs.estadoCobranza} className="bg-slate-950/50 rounded-xl p-4">
                <Doughnut data={estadoCobranzaData} options={chartOptionsPercent} />
                <div className="mt-4 text-sm text-slate-300">
                  <div className="flex justify-between border-b border-slate-800 py-1">
                    <span>Cobrado</span>
                    <span>{formatCurrencyARS(computed.cobranzas.cobrados)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 py-1">
                    <span>Señas</span>
                    <span>{formatCurrencyARS(computed.cobranzas.senas)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 py-1">
                    <span>Pendiente</span>
                    <span>{formatCurrencyARS(computed.cobranzas.pendientes)}</span>
                  </div>
                </div>
              </div>
            )}
          </TableCard>

          <TableCard title={`Top clientes por facturación - Top ${TOP_N}`}>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => toggleChartSelection('topClientes')}
                className="flex items-center gap-2 text-sm text-slate-300"
                type="button"
              >
                {selectedCharts.topClientes ? <CheckSquare size={18} /> : <Square size={18} />}
                Incluir en PDF
              </button>
            </div>
            {loading ? (
              <ChartLoading />
            ) : computed.topClientes.length === 0 ? (
              <p className="text-slate-400">Sin datos.</p>
            ) : (
              <div ref={chartRefs.topClientes} className="bg-slate-950/50 rounded-xl p-4">
                <Bar data={topClientesData} options={chartOptionsCurrency} />
              </div>
            )}
          </TableCard>
        </div>

        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Vista previa</div>
                <button
                  type="button"
                  onClick={handleCloseReportModal}
                  className="text-sm text-slate-300 hover:text-white"
                  disabled={exportingReport}
                >
                  Cerrar
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div ref={reportRef}>
                  <div id="report-export" className="bg-white text-slate-900 p-8 border border-slate-200">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 border-b border-slate-200 pb-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-500 report-label">{PLACE_NAME}</div>
                        <h2 className="text-2xl font-semibold mt-2">{REPORT_TITLE}</h2>
                        <p className="text-sm text-slate-600 mt-2 report-muted">{formatFilterRange(dateRange)}</p>
                      </div>
                      <div className="text-sm text-slate-500 report-muted">
                        <div>Generado: {formatGeneratedAt(new Date())}</div>
                        <div>Usuario: {resolveUserName(user)}</div>
                      </div>
                    </div>

                    <div className="report-section">
                      <h3 className="text-sm font-semibold">Indicadores principales</h3>
                      <div className="report-row flex justify-between gap-6 py-2 border-b border-slate-200">
                        <span className="report-label-text flex-1 pr-4">Ingresos netos cobrados</span>
                        <span className="report-value text-right min-w-[140px]">{formatCurrencyARS(computed.ingresosCobrados)}</span>
                      </div>
                      <div className="report-row flex justify-between gap-6 py-2 border-b border-slate-200">
                        <span className="report-label-text flex-1 pr-4">Margen bruto estimado</span>
                        <span className="report-value text-right min-w-[140px]">{formatCurrencyARS(computed.margenBruto)}</span>
                      </div>
                      <div className="report-row flex justify-between gap-6 py-2 border-b border-slate-200">
                        <span className="report-label-text flex-1 pr-4">Ticket promedio</span>
                        <span className="report-value text-right min-w-[140px]">{formatCurrencyARS(computed.ticketPromedio)}</span>
                      </div>
                      <div className="report-row flex justify-between gap-6 py-2 border-b border-slate-200">
                        <span className="report-label-text flex-1 pr-4">Cobranza final</span>
                        <span className="report-value text-right min-w-[140px]">{computed.tasaCobranzaFinal ? `${(computed.tasaCobranzaFinal * 100).toFixed(1)}%` : '—'}</span>
                      </div>
                      <div className="report-row flex justify-between gap-6 py-2 border-b border-slate-200">
                        <span className="report-label-text flex-1 pr-4">Pendiente de cobro</span>
                        <span className="report-value text-right min-w-[140px]">{formatCurrencyARS(computed.cobranzas.pendientes)}</span>
                      </div>
                    </div>

                    <div className="report-section">
                      <h3 className="text-sm font-semibold">Calidad de ejecución</h3>
                      <div className="report-row flex justify-between gap-6 py-2 border-b border-slate-200">
                        <span className="report-label-text flex-1 pr-4">Tasa de cancelación</span>
                        <span className="report-value text-right min-w-[140px]">{computed.tasaCancelacion ? `${(computed.tasaCancelacion * 100).toFixed(1)}%` : '—'}</span>
                      </div>
                      <div className="report-row flex justify-between gap-6 py-2 border-b border-slate-200">
                        <span className="report-label-text flex-1 pr-4">Calificación promedio empleados</span>
                        <span className="report-value text-right min-w-[140px]">{computed.promedioPuntuacion == null ? '—' : formatScore(computed.promedioPuntuacion)}</span>
                      </div>
                      <div className="report-row flex justify-between gap-6 py-2 border-b border-slate-200">
                        <span className="report-label-text flex-1 pr-4">Reprogramaciones</span>
                        <span className="report-value text-right min-w-[140px]">{computed.reprogramaciones}</span>
                      </div>
                      <div className="report-row flex justify-between gap-6 py-2 border-b border-slate-200">
                        <span className="report-label-text flex-1 pr-4">Servicios completados</span>
                        <span className="report-value text-right min-w-[140px]">{computed.reservasCompletadas.length}</span>
                      </div>
                      <div className="report-row flex justify-between gap-6 py-2 border-b border-slate-200">
                        <span className="report-label-text flex-1 pr-4">Reservas canceladas</span>
                        <span className="report-value text-right min-w-[140px]">{computed.reservasCanceladas.length}</span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2 px-6 py-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseReportModal}
                  className="px-4 py-2 rounded-full bg-white/10 text-white hover:bg-white/20"
                  disabled={exportingReport}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReportDownload}
                  className="px-4 py-2 rounded-full bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 disabled:opacity-50"
                  disabled={exportingReport}
                >
                  {exportingReport ? 'Generando...' : 'Descargar PDF'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default EstadisticasPage;
