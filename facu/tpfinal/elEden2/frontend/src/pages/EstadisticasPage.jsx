import React, { useEffect, useMemo, useState } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import { serviciosService, ventasService, detallesVentaService } from '../services';

const DEFAULT_PAGE_SIZE = 100;
const TOP_N = 5;

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [ventas, setVentas] = useState([]);
  const [detallesVenta, setDetallesVenta] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [disenosDetalles, setDisenosDetalles] = useState([]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [ventasAll, detallesVentaAll, reservasAll] = await Promise.all([
        fetchAllPages((params) => ventasService.getVentas(params)),
        fetchAllPages((params) => detallesVentaService.getDetalles(params)),
        fetchAllPages((params) => serviciosService.getReservas(params)),
      ]);

      setVentas(ventasAll);
      setDetallesVenta(detallesVentaAll);
      setReservas(reservasAll);

      // Para "productos usados en servicios" tomamos productos desde diseños.
      // El listado de diseños no incluye productos, así que buscamos el detalle por id.
      const disenosList = await fetchAllPages((params) => serviciosService.getDisenos(params));
      const disenoIds = disenosList
        .map((d) => d?.id_diseno)
        .filter((id) => id !== null && id !== undefined);

      const detalles = await chunkedMap(
        disenoIds,
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

  const computed = useMemo(() => {
    const ventasTotal = ventas.reduce((acc, v) => acc + safeNumber(v?.total), 0);
    const ventasCantidad = ventas.length;

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

    const topEmpleados = Array.from(empleadosPorServicios.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_N);

    // Top productos por ventas (detalle-venta)
    const productosPorVenta = new Map();
    detallesVenta.forEach((d) => {
      const productoId = d?.producto;
      const productoNombre = d?.producto_nombre || `Producto ${productoId ?? ''}`.trim();
      const key = productoId ?? productoNombre;
      const prev = productosPorVenta.get(key) || { id: productoId, nombre: productoNombre, cantidad: 0, subtotal: 0 };
      productosPorVenta.set(key, {
        ...prev,
        cantidad: prev.cantidad + safeNumber(d?.cantidad),
        subtotal: prev.subtotal + safeNumber(d?.subtotal),
      });
    });

    const topProductosVenta = Array.from(productosPorVenta.values())
      .sort((a, b) => b.cantidad - a.cantidad)
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
      ventasTotal,
      ventasCantidad,
      serviciosCantidad,
      topTipoServicio,
      topEmpleados,
      topProductosVenta,
      topProductosServicio,
    };
  }, [ventas, detallesVenta, reservas, disenosDetalles]);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="text-emerald-400" size={28} />
            <h1 className="text-2xl font-bold text-white">Estadísticas</h1>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Total ventas"
            value={formatCurrencyARS(computed.ventasTotal)}
            icon={<FileText className="text-emerald-400" size={24} />}
          />
          <StatCard
            title="Cantidad de ventas"
            value={computed.ventasCantidad}
            icon={<FileText className="text-emerald-400" size={24} />}
          />
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
          <TableCard title={`Productos más usados en servicios (por diseños) - Top ${TOP_N}`}>
            {computed.topProductosServicio.length === 0 ? (
              <p className="text-gray-400">Sin datos.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2">Producto</th>
                      <th className="text-right py-2">Cantidad</th>
                      <th className="text-right py-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computed.topProductosServicio.map((p) => (
                      <tr key={p.id ?? p.nombre} className="border-b border-gray-800">
                        <td className="py-2 text-white">{p.nombre}</td>
                        <td className="py-2 text-right text-white">{p.cantidad}</td>
                        <td className="py-2 text-right text-white">{formatCurrencyARS(p.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TableCard>

          <TableCard title={`Empleados con más servicios asignados - Top ${TOP_N}`}>
            {computed.topEmpleados.length === 0 ? (
              <p className="text-gray-400">Sin datos.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2">Empleado</th>
                      <th className="text-right py-2">Asignaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computed.topEmpleados.map((e) => (
                      <tr key={e.id ?? e.nombre} className="border-b border-gray-800">
                        <td className="py-2 text-white">{e.nombre}</td>
                        <td className="py-2 text-right text-white">{e.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TableCard>

          <TableCard title={`Productos más vendidos (por detalle de venta) - Top ${TOP_N}`}>
            {computed.topProductosVenta.length === 0 ? (
              <p className="text-gray-400">Sin datos.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2">Producto</th>
                      <th className="text-right py-2">Cantidad</th>
                      <th className="text-right py-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computed.topProductosVenta.map((p) => (
                      <tr key={p.id ?? p.nombre} className="border-b border-gray-800">
                        <td className="py-2 text-white">{p.nombre}</td>
                        <td className="py-2 text-right text-white">{p.cantidad}</td>
                        <td className="py-2 text-right text-white">{formatCurrencyARS(p.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TableCard>

          <TableCard title="Notas">
            <ul className="text-gray-300 text-sm space-y-2">
              <li>• Ventas: se calculan sumando el campo <span className="text-white">total</span> de cada venta.</li>
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
