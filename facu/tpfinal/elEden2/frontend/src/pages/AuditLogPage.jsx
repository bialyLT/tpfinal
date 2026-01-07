import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Search,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { auditService } from '../services';

const INITIAL_FILTERS = {
  search: '',
  operation: '',
  role: '',
  startDate: '',
  endDate: '',
};

const OPERATION_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'Creación', value: 'create' },
  { label: 'Modificación', value: 'update' },
  { label: 'Eliminación', value: 'delete' },
];

const ROLE_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'Administradores', value: 'administrador' },
  { label: 'Empleados', value: 'empleado' },
];

const getOperationFromMethod = (method) => {
  const normalized = String(method || '').toUpperCase();
  if (normalized === 'POST') return 'create';
  if (normalized === 'PUT' || normalized === 'PATCH') return 'update';
  if (normalized === 'DELETE') return 'delete';
  return '';
};

const getOperationLabel = (method) => {
  const op = getOperationFromMethod(method);
  if (op === 'create') return 'Creación';
  if (op === 'update') return 'Modificación';
  if (op === 'delete') return 'Eliminación';
  return String(method || '').toUpperCase() || '--';
};

const getOperationBadgeClass = (method) => {
  const op = getOperationFromMethod(method);
  if (op === 'delete') return 'bg-red-500/20 text-red-300';
  if (op === 'create') return 'bg-emerald-500/20 text-emerald-300';
  if (op === 'update') return 'bg-sky-500/20 text-sky-300';
  return 'bg-gray-500/20 text-gray-300';
};

const extractErrorMessage = (body) => {
  if (!body) return 'Error desconocido.';
  if (typeof body === 'string') return body;

  if (Array.isArray(body)) {
    const first = body.find(Boolean);
    return first ? String(first) : 'Error desconocido.';
  }

  if (typeof body === 'object') {
    const direct = body.detail || body.error || body.message || body.non_field_errors;
    if (direct) {
      if (Array.isArray(direct)) return direct.filter(Boolean).map(String).join(' | ');
      return String(direct);
    }

    const entries = Object.entries(body);
    if (entries.length === 0) return 'Error desconocido.';

    // DRF validation errors: { field: ["msg"] }
    return entries
      .slice(0, 4)
      .map(([key, value]) => {
        if (Array.isArray(value)) return `${key}: ${value.filter(Boolean).map(String).join(' | ')}`;
        if (typeof value === 'string') return `${key}: ${value}`;
        return `${key}: ${JSON.stringify(value)}`;
      })
      .join(' • ');
  }

  return String(body);
};

const extractCreatedSummary = (entity, responseBody) => {
  if (!responseBody || typeof responseBody !== 'object') {
    return entity ? `${entity} creado.` : 'Creado.';
  }

  const candidates = ['nombre', 'name', 'titulo', 'title', 'descripcion', 'description', 'email', 'username'];
  const labelKey = candidates.find((key) => responseBody[key]);
  const label = labelKey ? String(responseBody[labelKey]) : '';
  const id = responseBody.id ?? responseBody.pk;

  const entityLabel = entity ? entity.charAt(0).toUpperCase() + entity.slice(1) : 'Entidad';
  if (label && id != null) return `${entityLabel} creado: ${label} (ID ${id})`;
  if (label) return `${entityLabel} creado: ${label}`;
  if (id != null) return `${entityLabel} creado (ID ${id})`;
  return `${entityLabel} creado.`;
};

const isLikelyErrorResponse = (body) => {
  if (!body) return false;
  if (typeof body === 'string') return true;
  if (Array.isArray(body)) return body.some(Boolean);
  if (typeof body === 'object') {
    return Boolean(body.detail || body.error || body.message || body.non_field_errors);
  }
  return false;
};

const extractResultSummary = (log) => {
  const method = String(log?.method || '').toUpperCase();

  if (isLikelyErrorResponse(log?.response_body)) {
    return extractErrorMessage(log?.response_body);
  }

  if (method === 'POST') return extractCreatedSummary(log?.entity, log?.response_body);
  if (method === 'DELETE') {
    const entityLabel = log?.entity ? log.entity.charAt(0).toUpperCase() + log.entity.slice(1) : 'Entidad';
    return `${entityLabel} eliminado.`;
  }
  if (method === 'PUT' || method === 'PATCH') {
    const entityLabel = log?.entity ? log.entity.charAt(0).toUpperCase() + log.entity.slice(1) : 'Entidad';
    return `${entityLabel} modificado.`;
  }

  return 'Operación exitosa.';
};

const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(() => ({ ...INITIAL_FILTERS }));
  const [appliedFilters, setAppliedFilters] = useState(() => ({ ...INITIAL_FILTERS }));
  const [expandedId, setExpandedId] = useState(null);

  const pageSize = logs.length || 20;
  const totalPages = useMemo(() => (count > 0 ? Math.max(1, Math.ceil(count / pageSize)) : 1), [count, pageSize]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page };
      if (appliedFilters.search) params.search = appliedFilters.search;
      if (appliedFilters.operation) params.operation = appliedFilters.operation;
      if (appliedFilters.role) params.role = appliedFilters.role;
      if (appliedFilters.startDate) params.start_date = appliedFilters.startDate;
      if (appliedFilters.endDate) params.end_date = appliedFilters.endDate;

      const data = await auditService.listLogs(params);
      setLogs(data.results || []);
      setCount(data.count || 0);
      if (data.results?.length === 0 && page > 1) {
        setPage((prev) => Math.max(1, prev - 1));
      }
    } catch (err) {
      console.error('Audit logs error', err);
      setError('No se pudieron cargar los registros de auditoría.');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({ ...filters });
  };

  const handleResetFilters = () => {
    setFilters({ ...INITIAL_FILTERS });
    setAppliedFilters({ ...INITIAL_FILTERS });
    setPage(1);
  };

  const toggleExpanded = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handlePageChange = (direction) => {
    setPage((prev) => {
      const nextPage = prev + direction;
      if (nextPage < 1 || nextPage > totalPages) {
        return prev;
      }
      return nextPage;
    });
  };

  const formatDateTime = (value) => {
    if (!value) return '--';
    return new Date(value).toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    });
  };

  const stringifyData = (data) => {
    if (!data) return 'Sin datos.';
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return String(data);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Auditoría del sistema</h1>
              <p className="text-sm text-gray-400">Seguimiento de cada cambio realizado por administradores y empleados.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchLogs}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gray-800 text-gray-100 hover:bg-gray-700 transition"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Actualizar
          </button>
        </header>

        <section className="mt-6 bg-gray-800 border border-gray-700 rounded-lg p-4">
          <form className="grid grid-cols-1 md:grid-cols-5 gap-4" onSubmit={handleApplyFilters}>
            <div className="space-y-1">
              <label className="text-sm text-gray-400 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Buscar
              </label>
              <input
                type="text"
                name="search"
                placeholder="Usuario, acción, recurso"
                value={filters.search}
                onChange={handleFilterChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-400 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Acción
              </label>
              <select
                name="operation"
                value={filters.operation}
                onChange={handleFilterChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2"
              >
                {OPERATION_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-400 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Rol
              </label>
              <select
                name="role"
                value={filters.role}
                onChange={handleFilterChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-400 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Desde
              </label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-400 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Hasta
              </label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2"
              />
            </div>
            <div className="md:col-span-5 flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-md border border-gray-600 text-gray-300 hover:bg-gray-900"
                disabled={loading}
              >
                Limpiar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                disabled={loading}
              >
                Aplicar filtros
              </button>
            </div>
          </form>
        </section>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <section className="mt-6 bg-gray-800 border border-gray-700 rounded-lg">
          <div className="px-4 py-3 border-b border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-sm text-gray-400">Registros totales</p>
              <p className="text-xl font-semibold text-white">{count}</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span>Página {page} de {totalPages}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handlePageChange(-1)}
                  disabled={page === 1 || loading}
                  className="p-2 rounded-md bg-gray-900 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(1)}
                  disabled={page === totalPages || loading}
                  className="p-2 rounded-md bg-gray-900 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando registros...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-10 text-center text-gray-400">No se encontraron registros con los filtros seleccionados.</div>
          ) : (
            <ul className="divide-y divide-gray-700">
              {logs.map((log) => (
                <li key={log.id} className="p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-start">
                    <div>
                      <p className="text-sm text-gray-400">{formatDateTime(log.created_at)}</p>
                      <p className="text-lg font-semibold text-white">{log.user_display}</p>
                      <p className="text-sm text-gray-400 capitalize">Rol: {log.role}</p>
                      <p className="text-sm text-gray-300 mt-1">{log.action}</p>
                    </div>
                    <div className="flex flex-col items-start gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getOperationBadgeClass(log.method)}`}
                      >
                        {getOperationLabel(log.method)}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(log.id)}
                        className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
                      >
                        {expandedId === log.id ? 'Ocultar detalles' : 'Ver detalles'}
                        {expandedId === log.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {expandedId === log.id && (
                    <div className="mt-4 space-y-4 bg-gray-900/40 rounded-lg p-4 text-sm text-gray-300">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Recurso</p>
                        <p className="mt-1">Entidad: {log.entity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Resultado</p>
                        <p className={`mt-1 ${isLikelyErrorResponse(log.response_body) ? 'text-red-300' : 'text-emerald-200'}`}>{extractResultSummary(log)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Respuesta</p>
                        <pre className="mt-1 bg-black/30 p-3 rounded-md text-xs overflow-auto max-h-60">{stringifyData(log.response_body)}</pre>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Metadata</p>
                        <pre className="mt-1 bg-black/30 p-3 rounded-md text-xs overflow-auto max-h-60">{stringifyData(log.metadata)}</pre>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default AuditLogPage;
