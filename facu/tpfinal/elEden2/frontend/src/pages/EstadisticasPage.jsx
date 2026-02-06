import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, RefreshCw, Download, CheckSquare, Square } from 'lucide-react';
import { serviciosService } from '../services';
import { Bar, Pie } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useAuth } from '../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, ChartDataLabels);

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

const EstadisticasPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reservas, setReservas] = useState([]);
  const [disenosDetalles, setDisenosDetalles] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filterError, setFilterError] = useState('');
  const [selectedCharts, setSelectedCharts] = useState({
    serviciosPorTipo: true,
    topProductos: true,
    topEmpleados: true,
  });
  const [exporting, setExporting] = useState(false);

  const chartRefs = {
    serviciosPorTipo: useRef(null),
    topProductos: useRef(null),
    topEmpleados: useRef(null),
  };

  const loadData = async (range = dateRange) => {
    setLoading(true);
    setError('');
    try {
      const dateParams = {};
      if (range?.start) dateParams.fecha_solicitud_after = range.start;
      if (range?.end) dateParams.fecha_solicitud_before = range.end;

      const [reservasAll] = await Promise.all([
        fetchAllPages((params) => serviciosService.getReservas({ ...params, ...dateParams })),
      ]);

      setReservas(reservasAll);

      // Para "productos usados en servicios" tomamos productos desde diseños.
      // El listado de diseños no incluye productos, así que buscamos el detalle por id.
      const disenoIds = reservasAll
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
    const serviciosCantidad = reservas.length;
    const serviciosPorTipo = new Map();
    const empleadosPorServicios = new Map();

    reservas.forEach((r) => {
      const tipo = r?.servicio_nombre || 'Sin servicio';
      serviciosPorTipo.set(tipo, (serviciosPorTipo.get(tipo) || 0) + 1);

      const empleados = Array.isArray(r?.empleados_asignados) ? r.empleados_asignados : [];
      empleados.forEach((asignacion) => {
        const empleadoId = asignacion?.empleado;
        const empleadoNombre = `${asignacion?.empleado_nombre || ''} ${asignacion?.empleado_apellido || ''}`.trim() || 'Empleado';
        const key = empleadoId ?? empleadoNombre;
        const prev = empleadosPorServicios.get(key) || { id: empleadoId, nombre: empleadoNombre, count: 0 };
        empleadosPorServicios.set(key, { ...prev, nombre: empleadoNombre, count: prev.count + 1 });
      });
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

    return {
      serviciosCantidad,
      serviciosPorTipoList,
      topTipoServicio,
      topEmpleados,
      topProductosServicio,
    };
  }, [reservas, disenosDetalles]);

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

  const topProductosData = useMemo(() => {
    const labels = computed.topProductosServicio.map((item) => item.nombre);
    const data = computed.topProductosServicio.map((item) => item.cantidad);
    return {
      labels,
      datasets: [
        {
          label: 'Cantidad',
          data,
          backgroundColor: '#22C55E',
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
      const headerTitle = 'Reporte de Estadísticas';
      const headerLines = [
        `Generado: ${generatedAt}`,
        `Lugar: ${PLACE_NAME}`,
        `Usuario: ${generatedBy}`,
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
            {computed.serviciosPorTipoList.length === 0 ? (
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
            {computed.topProductosServicio.length === 0 ? (
              <p className="text-gray-400">Sin datos.</p>
            ) : (
              <div ref={chartRefs.topProductos} className="bg-gray-900/40 rounded-lg p-4">
                <Bar data={topProductosData} options={chartOptionsBase} />
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
            {computed.topEmpleados.length === 0 ? (
              <p className="text-gray-400">Sin datos.</p>
            ) : (
              <div ref={chartRefs.topEmpleados} className="bg-gray-900/40 rounded-lg p-4">
                <Bar data={topEmpleadosData} options={chartOptionsBase} />
              </div>
            )}
          </TableCard>

          <TableCard title="Notas">
            <ul className="text-gray-300 text-sm space-y-2">
              <li>• Servicios: se cuentan desde <span className="text-white">reservas</span>.</li>
              <li>• Productos usados en servicios: se agregan desde los <span className="text-white">productos</span> de cada diseño asociado.</li>
            </ul>
          </TableCard>
        </div>
      </div>
    </div>
  );
};

export default EstadisticasPage;
