import { useState, useEffect } from 'react';
import { encuestasService } from '../services';
import { useAuth } from '../context/AuthContext';
import { handleApiError } from '../utils/notifications';
import jsPDF from 'jspdf';
import { 
  ClipboardDocumentListIcon, 
  FunnelIcon, 
  MagnifyingGlassIcon,
  StarIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const EncuestasPage = () => {
  const [encuestas, setEncuestas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [responsesModal, setResponsesModal] = useState({ open: false, encuesta: null });
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [responsesError, setResponsesError] = useState('');
  const [responsesList, setResponsesList] = useState([]);
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
      setEncuestas(data.results || data);
    } catch (error) {
      handleApiError(error, 'Error al cargar las encuestas');
    } finally {
      setLoading(false);
    }
  };

  const getCalificacionStars = (calificacion) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        i <= calificacion ? (
          <StarIconSolid key={i} className="w-4 h-4 text-yellow-400" />
        ) : (
          <StarIcon key={i} className="w-4 h-4 text-gray-500" />
        )
      );
    }
    return stars;
  };

  const getPromedioCalificaciones = () => {
    if (encuestas.length === 0) return 0;
    const encuestasCompletas = encuestas.filter(e => e.estado === 'respondida' && e.puntuacion_general);
    if (encuestasCompletas.length === 0) return 0;
    const total = encuestasCompletas.reduce((sum, encuesta) => sum + (encuesta.puntuacion_general || 0), 0);
    return (total / encuestasCompletas.length).toFixed(1);
  };

  const getEstadoColor = (estado) => {
    const colors = {
      'enviada': 'bg-blue-500',
      'respondida': 'bg-green-500',
      'expirada': 'bg-red-500'
    };
    return colors[estado] || 'bg-gray-500';
  };

  const getEstadoLabel = (estado) => {
    const labels = {
      'enviada': 'Enviada',
      'respondida': 'Completada',
      'expirada': 'Expirada'
    };
    return labels[estado] || estado;
  };

  const filteredEncuestas = encuestas.filter(encuesta => {
    const matchesSearch = encuesta.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         encuesta.servicio?.solicitud?.titulo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || encuesta.estado === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const resolveEncuestaId = (encuesta) => encuesta?.id_encuesta ?? encuesta?.id;

  const buildResponseRows = (encuestaRespuestas, respuestasById) => encuestaRespuestas.map((item) => {
    const respuestas = respuestasById.get(item.id_encuesta_respuesta) || [];
    const valores = respuestas
      .map((respuesta) => Number(respuesta?.valor_numerico))
      .filter((valor) => Number.isFinite(valor));
    const promedio = valores.length > 0
      ? valores.reduce((acc, v) => acc + v, 0) / valores.length
      : null;
    return {
      id: item.id_encuesta_respuesta,
      cliente: `${item.cliente_nombre || ''} ${item.cliente_apellido || ''}`.trim() || 'Cliente',
      fecha: item.fecha_realizacion || item.fecha_creacion || item.fecha_envio || null,
      promedio,
      valores,
    };
  });

  const handleOpenResponses = async (encuesta) => {
    const encuestaId = resolveEncuestaId(encuesta);
    if (!encuestaId) return;

    setResponsesModal({ open: true, encuesta });
    setResponsesLoading(true);
    setResponsesError('');
    setResponsesList([]);

    try {
      const encuestasRespuestasData = await encuestasService.getEncuestaRespuestas({
        encuesta: encuestaId,
        estado: 'completada',
      });
      const encuestasRespuestas = Array.isArray(encuestasRespuestasData.results)
        ? encuestasRespuestasData.results
        : Array.isArray(encuestasRespuestasData)
          ? encuestasRespuestasData
          : [];

      const respuestasById = new Map();
      for (const respuestaItem of encuestasRespuestas) {
        const respuestaData = await encuestasService.getRespuestas({
          encuesta_respuesta: respuestaItem.id_encuesta_respuesta,
        });
        const respuestas = Array.isArray(respuestaData.results)
          ? respuestaData.results
          : Array.isArray(respuestaData)
            ? respuestaData
            : [];
        respuestasById.set(respuestaItem.id_encuesta_respuesta, respuestas);
      }

      setResponsesList(buildResponseRows(encuestasRespuestas, respuestasById));
    } catch (error) {
      console.error('Error al cargar respuestas de encuesta', error);
      setResponsesError('No se pudieron cargar las respuestas.');
    } finally {
      setResponsesLoading(false);
    }
  };

  const handleCloseResponses = () => {
    if (!responsesLoading) {
      setResponsesModal({ open: false, encuesta: null });
      setResponsesError('');
      setResponsesList([]);
    }
  };

  const exportRespuestasPDF = () => {
    if (!responsesModal.encuesta) return;
    const encuestaTitle = responsesModal.encuesta.titulo || `Encuesta #${resolveEncuestaId(responsesModal.encuesta)}`;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    let y = 40;
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.text(`Calificaciones - ${encuestaTitle}`, 40, y);
    y += 18;
    pdf.setFontSize(10);
    pdf.text(`Generado: ${new Date().toLocaleString('es-AR')}`, 40, y);
    y += 16;

    const renderHeader = () => {
      pdf.setFontSize(10);
      pdf.text('Cliente', 40, y);
      pdf.text('Fecha', 260, y);
      pdf.text('Promedio', 420, y);
      y += 8;
      pdf.setDrawColor(200);
      pdf.line(40, y, pageWidth - 40, y);
      y += 10;
    };

    renderHeader();

    responsesList.forEach((row) => {
      if (y > pageHeight - 60) {
        pdf.addPage();
        y = 40;
        renderHeader();
      }
      const fecha = row.fecha ? new Date(row.fecha).toLocaleDateString('es-AR') : '—';
      const promedio = row.promedio == null ? '—' : row.promedio.toFixed(2);
      pdf.setFontSize(10);
      pdf.text(row.cliente || 'Cliente', 40, y);
      pdf.text(fecha, 260, y);
      pdf.text(promedio, 420, y);
      y += 18;
    });

    const totalPages = pdf.getNumberOfPages();
    pdf.setFontSize(9);
    for (let page = 1; page <= totalPages; page += 1) {
      pdf.setPage(page);
      pdf.text(`Página ${page} de ${totalPages}`, pageWidth - 40, pageHeight - 20, { align: 'right' });
    }

    pdf.save(`reporte-financiero-estadistico-calificaciones-${timestamp}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-400"></div>
          <p className="text-gray-300 mt-4">Cargando encuestas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <ClipboardDocumentListIcon className="w-8 h-8 text-green-400" />
            <h1 className="text-3xl font-bold text-white">
              {isAdmin || isEmpleado ? 'Encuestas de Satisfacción' : 'Mis Evaluaciones'}
            </h1>
          </div>
          <p className="text-gray-400">
            {isAdmin || isEmpleado ? 'Gestión y análisis de encuestas de satisfacción del cliente' : 'Encuestas que has completado'}
          </p>
        </div>

        {/* Stats Cards */}
        {(isAdmin || isEmpleado) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Encuestas</p>
                  <p className="text-2xl font-bold text-white">{encuestas.length}</p>
                </div>
                <ChartBarIcon className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Promedio General</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-white">{getPromedioCalificaciones()}</p>
                    <div className="flex">
                      {getCalificacionStars(Math.round(getPromedioCalificaciones()))}
                    </div>
                  </div>
                </div>
                <StarIconSolid className="w-8 h-8 text-yellow-400" />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Completadas</p>
                  <p className="text-2xl font-bold text-green-400">
                    {encuestas.filter(e => e.estado === 'respondida').length}
                  </p>
                </div>
                <CheckCircleIcon className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {encuestas.filter(e => e.estado === 'enviada').length}
                  </p>
                </div>
                <ClockIcon className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar encuestas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <FunnelIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Todos los estados</option>
                <option value="enviada">Enviadas</option>
                <option value="respondida">Completadas</option>
                <option value="expirada">Expiradas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Encuestas List */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-6">
            <h2 className="text-xl font-bold text-white mb-6">
              Lista de Encuestas ({filteredEncuestas.length})
            </h2>
            
            {filteredEncuestas.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardDocumentListIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-400 mb-2">
                  {searchTerm || statusFilter ? 'No se encontraron encuestas' : 'No hay encuestas'}
                </h3>
                <p className="text-gray-500">
                  {searchTerm || statusFilter 
                    ? 'Intenta ajustar los filtros de búsqueda'
                    : isAdmin || isEmpleado 
                      ? 'Aún no se han generado encuestas de satisfacción.'
                      : 'No tienes encuestas pendientes o completadas.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEncuestas.map(encuesta => (
                  <div key={encuesta.id} className="bg-gray-700 rounded-lg p-6 border border-gray-600">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg text-white">
                            {encuesta.titulo || `Encuesta #${encuesta.id}`}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getEstadoColor(encuesta.estado)}`}>
                            {getEstadoLabel(encuesta.estado)}
                          </span>
                        </div>
                        <p className="text-gray-300 mb-1">
                          Servicio: {encuesta.servicio?.solicitud?.titulo || 'No especificado'}
                        </p>
                        <p className="text-sm text-gray-400 mb-1">
                          Cliente: {encuesta.cliente?.first_name && encuesta.cliente?.last_name 
                            ? `${encuesta.cliente.first_name} ${encuesta.cliente.last_name}`
                            : encuesta.cliente?.username || 'No especificado'}
                        </p>
                        <p className="text-sm text-gray-400">
                          Fecha: {new Date(encuesta.fecha_envio).toLocaleDateString('es-ES')}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        {encuesta.estado === 'respondida' && encuesta.puntuacion_general && (
                          <div className="text-center">
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-sm font-medium text-white">
                                {encuesta.puntuacion_general}/5
                              </span>
                              <div className="flex">
                                {getCalificacionStars(encuesta.puntuacion_general)}
                              </div>
                            </div>
                          </div>
                        )}

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleOpenResponses(encuesta)}
                            className="px-3 py-2 text-sm text-white bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <EyeIcon className="w-5 h-5" />
                            Ver respuestas
                          </button>
                        )}
                      </div>
                    </div>

                    {encuesta.estado === 'respondida' && encuesta.comentarios && (
                      <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
                        <h4 className="font-medium text-gray-300 mb-2">Comentarios:</h4>
                        <p className="text-gray-400 italic">"{encuesta.comentarios}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {responsesModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <div>
                <h2 className="text-lg font-bold text-white">Respuestas de encuesta</h2>
                <p className="text-sm text-gray-400">
                  {responsesModal.encuesta?.titulo || `Encuesta #${resolveEncuestaId(responsesModal.encuesta)}`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseResponses}
                className="text-sm text-gray-300 hover:text-white"
                disabled={responsesLoading}
              >
                Cerrar
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {responsesLoading ? (
                <p className="text-gray-300">Cargando respuestas...</p>
              ) : responsesError ? (
                <p className="text-red-300">{responsesError}</p>
              ) : responsesList.length === 0 ? (
                <p className="text-gray-400">No hay respuestas completadas para esta encuesta.</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 text-xs uppercase tracking-wide text-gray-400 border-b border-gray-700 pb-2">
                    <span>Cliente</span>
                    <span>Fecha</span>
                    <span className="text-right">Promedio</span>
                  </div>
                  {responsesList.map((row) => (
                    <div key={row.id} className="grid grid-cols-3 items-center text-sm text-gray-200 border-b border-gray-800 py-2">
                      <span>{row.cliente}</span>
                      <span>{row.fecha ? new Date(row.fecha).toLocaleDateString('es-AR') : '—'}</span>
                      <span className="text-right">{row.promedio == null ? '—' : row.promedio.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2 px-6 py-4 border-t border-gray-700">
              <button
                type="button"
                onClick={handleCloseResponses}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                disabled={responsesLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={exportRespuestasPDF}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-400 disabled:opacity-50"
                disabled={responsesLoading || responsesList.length === 0}
              >
                Exportar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EncuestasPage;
