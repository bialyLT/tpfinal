import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  MapPin,
  Palette,
  User,
  XCircle,
} from 'lucide-react';
import { serviciosService } from '../../services';
import { encuestasService } from '../../services/encuestasService';
import { useAuth } from '../../context/AuthContext';
import { handleApiError, success } from '../../utils/notifications';
import { handlePagarFinal, handlePagarSena } from '../../utils/pagoHelpers';

const ReservaDetallePage = () => {
  const { reservaId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [reserva, setReserva] = useState(null);
  const [diseno, setDiseno] = useState(null);
  const [loading, setLoading] = useState(true);
  const [procesandoPago, setProcesandoPago] = useState(false);

  const [surveyState, setSurveyState] = useState({
    loading: false,
    encuesta: null,
    respuestas: {},
    error: null,
    completada: false,
    yaRespondio: false,
  });
  const [enviandoEncuesta, setEnviandoEncuesta] = useState(false);

  const isAdmin = useMemo(() => (
    user && (user.is_staff || user.is_superuser || user.perfil?.tipo_usuario === 'administrador' || user.groups?.includes('Administradores'))
  ), [user]);
  const isEmpleado = useMemo(() => (
    user && (user.perfil?.tipo_usuario === 'empleado' || user.perfil?.tipo_usuario === 'diseñador' || user.groups?.includes('Empleados'))
  ), [user]);
  const isCliente = Boolean(user && !isAdmin && !isEmpleado);

  const numericReservaId = Number(reservaId);
  const apiReservaId = Number.isNaN(numericReservaId) ? reservaId : numericReservaId;

  useEffect(() => {
    const fetchReserva = async () => {
      try {
        setLoading(true);
        const data = await serviciosService.getReservaById(reservaId);
        setReserva(data);

        await fetchDiseno(data.id_reserva || reservaId);
      } catch (error) {
        handleApiError(error, 'No pudimos cargar los detalles de la reserva');
        setReserva(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReserva();
  }, [reservaId]);

  useEffect(() => {
    if (!reserva || !isCliente) {
      return;
    }

    if (reserva.estado !== 'completada') {
      return;
    }

    if (reserva.encuesta_cliente_completada) {
      setSurveyState((prev) => ({
        ...prev,
        completada: true,
        yaRespondio: true,
      }));
      return;
    }

    loadEncuesta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reserva, isCliente]);

  const fetchDiseno = async (id) => {
    try {
      const response = await serviciosService.getDisenos({ reserva: id, page_size: 10 });
      const disenosArray = response?.results || response || [];
      if (disenosArray.length === 0) {
        setDiseno(null);
        return;
      }

      const disenoPrincipal = disenosArray[0];
      if (disenoPrincipal?.id_diseno) {
        try {
          const detalle = await serviciosService.getDisenoById(disenoPrincipal.id_diseno);
          setDiseno(detalle);
        } catch (detalleError) {
          console.error('No se pudo cargar el detalle del diseño:', detalleError);
          setDiseno(disenoPrincipal);
        }
      } else {
        setDiseno(disenoPrincipal);
      }
    } catch (error) {
      console.error('No se pudo cargar el diseño asociado:', error);
      setDiseno(null);
    }
  };

  const loadEncuesta = async () => {
    setSurveyState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const encuestaActiva = await encuestasService.obtenerEncuestaActiva();

      const respuestasIniciales = {};
      encuestaActiva.preguntas.forEach((pregunta) => {
        const preguntaId = pregunta.id ?? pregunta.id_pregunta;
        respuestasIniciales[preguntaId] = {
          pregunta_id: preguntaId,
          valor_texto: null,
          valor_numero: null,
          valor_escala: null,
          valor_boolean: null,
          valor_multiple: null,
        };
      });

      const yaRespondio = Boolean(reserva?.encuesta_cliente_completada);

      setSurveyState({
        loading: false,
        encuesta: encuestaActiva,
        respuestas: respuestasIniciales,
        completada: yaRespondio,
        yaRespondio,
        error: null,
      });
    } catch (error) {
      if (error.response?.status === 404) {
        setSurveyState({
          loading: false,
          encuesta: null,
          respuestas: {},
          completada: false,
          yaRespondio: false,
          error: 'Actualmente no hay encuestas disponibles.',
        });
        return;
      }

      handleApiError(error, 'No pudimos cargar la encuesta en este momento');
      setSurveyState({
        loading: false,
        encuesta: null,
        respuestas: {},
        completada: false,
        yaRespondio: false,
        error: 'Ocurrió un error al cargar la encuesta.',
      });
    }
  };

  const handleRespuestaChange = (preguntaId, tipo, valor) => {
    setSurveyState((prev) => ({
      ...prev,
      respuestas: {
        ...prev.respuestas,
        [preguntaId]: {
          ...prev.respuestas[preguntaId],
          [`valor_${tipo}`]: valor,
        },
      },
    }));
  };

  const validarRespuestas = () => {
    const { encuesta, respuestas } = surveyState;
    if (!encuesta) {
      return false;
    }

    for (const pregunta of encuesta.preguntas) {
      if (!pregunta.obligatoria) {
        continue;
      }

      const preguntaId = pregunta.id ?? pregunta.id_pregunta;
      const respuesta = respuestas[preguntaId];
      if (!respuesta) {
        return false;
      }

      const valorCampo = `valor_${pregunta.tipo}`;
      const valor = respuesta[valorCampo];
      if (valor === null || valor === undefined || valor === '') {
        return false;
      }
    }

    return true;
  };

  const handleEnviarEncuesta = async (event) => {
    event.preventDefault();
    if (!validarRespuestas()) {
      handleApiError({ message: 'Completa todas las preguntas obligatorias antes de enviar.' });
      return;
    }

    try {
      setEnviandoEncuesta(true);
      const respuestasArray = Object.values(surveyState.respuestas);
      await encuestasService.responderEncuesta(apiReservaId, respuestasArray);
      success('¡Gracias por compartir tu experiencia!');
      setSurveyState((prev) => ({
        ...prev,
        completada: true,
        yaRespondio: true,
      }));
      setReserva((prev) => (
        prev ? { ...prev, encuesta_cliente_completada: true } : prev
      ));
    } catch (error) {
      handleApiError(error, 'No pudimos enviar la encuesta');
    } finally {
      setEnviandoEncuesta(false);
    }
  };

  const handleRegresar = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(isCliente ? '/mis-servicios' : '/servicios');
  };

  const formatCurrency = (valor) => {
    if (valor === null || valor === undefined) {
      return '0,00';
    }
    return Number(valor).toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      solicitud: 'bg-blue-500',
      en_revision: 'bg-yellow-500',
      en_diseño: 'bg-purple-500',
      diseño_enviado: 'bg-indigo-500',
      revision_diseño: 'bg-orange-500',
      aprobado: 'bg-green-500',
      en_curso: 'bg-cyan-500',
      pausado: 'bg-gray-500',
      completado: 'bg-emerald-500',
      completada: 'bg-emerald-500',
      cancelado: 'bg-red-500',
      cancelada: 'bg-red-500',
      rechazado: 'bg-red-700',
      pendiente: 'bg-yellow-500',
      confirmada: 'bg-blue-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const formatEstado = (estado) => {
    const estados = {
      solicitud: 'Solicitud Inicial',
      en_revision: 'En Revisión',
      en_diseño: 'En Diseño',
      diseño_enviado: 'Diseño Enviado',
      revision_diseño: 'En Revisión de Diseño',
      aprobado: 'Diseño Aprobado',
      en_curso: 'En Ejecución',
      pausado: 'Pausado',
      completado: 'Completado',
      completada: 'Completada',
      cancelado: 'Cancelado',
      cancelada: 'Cancelada',
      rechazado: 'Rechazado',
      pendiente: 'Pendiente',
      confirmada: 'Confirmada',
    };
    return estados[estado] || estado;
  };

  const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjNEY0RjRGIi8+CjxwYXRoIGQ9Ik0zMCA1MEw0NSA2NUw3MCAzNUw5MCA2NVY4NUgxMFY2NUwzMCA1MFoiIGZpbGw9IiM2MzYzNjMiLz4KPGNpcmNsZSBjeD0iMzUiIGN5PSIzNSIgcj0iNSIgZmlsbD0iIzYzNjM2MyIvPgo8L3N2Zz4K';

  const puedeMostrarEncuesta = isCliente && reserva?.estado === 'completada' && surveyState.encuesta && !surveyState.completada;

  const renderPregunta = (pregunta, index) => {
    const preguntaId = pregunta.id ?? pregunta.id_pregunta;
    const respuesta = surveyState.respuestas[preguntaId];

    switch (pregunta.tipo) {
      case 'texto':
        return (
          <textarea
            className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg p-3 focus:ring-2 focus:ring-emerald-500"
            rows={3}
            value={respuesta?.valor_texto || ''}
            onChange={(e) => handleRespuestaChange(preguntaId, 'texto', e.target.value)}
            required={pregunta.obligatoria}
          />
        );
      case 'numero':
        return (
          <input
            type="number"
            className="w-full border border-gray-700 bg-gray-800 text-white rounded-lg p-3 focus:ring-2 focus:ring-emerald-500"
            value={respuesta?.valor_numero ?? ''}
            onChange={(e) => handleRespuestaChange(preguntaId, 'numero', e.target.value ? parseFloat(e.target.value) : null)}
            required={pregunta.obligatoria}
          />
        );
      case 'escala':
        return (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>1 (Muy malo)</span>
              <span>10 (Excelente)</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              className="w-full"
              value={respuesta?.valor_escala ?? 5}
              onChange={(e) => handleRespuestaChange(preguntaId, 'escala', parseInt(e.target.value, 10))}
              required={pregunta.obligatoria}
            />
            <div className="text-center text-2xl font-bold text-emerald-400">
              {respuesta?.valor_escala ?? 5}
            </div>
          </div>
        );
      case 'si_no':
        return (
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name={`pregunta_${preguntaId}`}
                value="true"
                checked={respuesta?.valor_boolean === true}
                onChange={() => handleRespuestaChange(preguntaId, 'boolean', true)}
                required={pregunta.obligatoria}
                className="w-4 h-4 text-emerald-500"
              />
              <span>Sí</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name={`pregunta_${preguntaId}`}
                value="false"
                checked={respuesta?.valor_boolean === false}
                onChange={() => handleRespuestaChange(preguntaId, 'boolean', false)}
                required={pregunta.obligatoria}
                className="w-4 h-4 text-emerald-500"
              />
              <span>No</span>
            </label>
          </div>
        );
      case 'multiple': {
        const opciones = pregunta.opciones_multiple || pregunta.opciones || [];
        return (
          <div className="space-y-2">
            {opciones.map((opcion, opcionIndex) => (
              <label key={opcionIndex} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name={`pregunta_${preguntaId}`}
                  value={opcion}
                  checked={respuesta?.valor_multiple === opcion}
                  onChange={() => handleRespuestaChange(preguntaId, 'multiple', opcion)}
                  required={pregunta.obligatoria}
                  className="w-4 h-4 text-emerald-500"
                />
                <span>{opcion}</span>
              </label>
            ))}
          </div>
        );
      }
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-500 mx-auto" />
          <p className="text-gray-400">Cargando detalles de la reserva...</p>
        </div>
      </div>
    );
  }

  if (!reserva) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
          <h1 className="text-2xl font-bold">Reserva no encontrada</h1>
          <p className="text-gray-400 max-w-md mx-auto">
            No encontramos la reserva solicitada o no tienes permisos para visualizarla.
          </p>
          <button
            onClick={handleRegresar}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={handleRegresar}
          className="inline-flex items-center text-sm text-gray-300 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </button>

        <div className="bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Detalle de la Reserva</h1>
                <p className="text-gray-400">Reserva #{reserva.id_reserva}</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(reserva.estado)}`}>
                  {formatEstado(reserva.estado)}
                </span>
                {reserva.estado_pago && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-700">
                    Pago: {formatEstado(reserva.estado_pago)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            <section className="bg-gray-900 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center mb-4">
                <FileText className="w-6 h-6 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">Información General</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <span className="text-gray-400 text-sm">Cliente</span>
                    <p className="text-lg text-white font-medium">
                      {(reserva.cliente_nombre && reserva.cliente_apellido)
                        ? `${reserva.cliente_nombre} ${reserva.cliente_apellido}`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Servicio</span>
                    <p className="text-lg text-white font-medium">{reserva.servicio_nombre || 'N/A'}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`h-3 w-3 rounded-full ${getStatusColor(reserva.estado)}`} />
                    <span className="text-gray-300">{formatEstado(reserva.estado)}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {reserva.fecha_solicitud && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">
                        Solicitud: {new Date(reserva.fecha_solicitud).toLocaleString('es-AR')}
                      </span>
                    </div>
                  )}
                  {reserva.fecha_reserva && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">
                        Fecha programada: {new Date(reserva.fecha_reserva).toLocaleString('es-AR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                  {reserva.direccion && (
                    <div className="flex items-start space-x-2 bg-gray-800 p-4 rounded-lg">
                      <MapPin className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div className="flex-1">
                        <span className="text-gray-400 text-sm">Dirección del servicio</span>
                        <p className="text-white text-base font-medium">{reserva.direccion}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="bg-gray-900 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center mb-4">
                <CreditCard className="w-6 h-6 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">Información de Pago</h2>
              </div>
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg p-5 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Pago de Seña</h3>
                    <EstadoPagoBadge estado={reserva.estado_pago_sena} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Monto</span>
                      <p className="text-white font-semibold text-lg">${formatCurrency(reserva.monto_sena)} ARS</p>
                    </div>
                    {reserva.fecha_pago_sena && (
                      <div>
                        <span className="text-gray-400">Fecha de pago</span>
                        <p className="text-white">{new Date(reserva.fecha_pago_sena).toLocaleString('es-AR')}</p>
                      </div>
                    )}
                    {reserva.payment_id_sena && (
                      <div className="md:col-span-2">
                        <span className="text-gray-400">ID de transacción</span>
                        <p className="text-white font-mono text-xs bg-gray-900 px-2 py-1 rounded mt-1 break-all">
                          {reserva.payment_id_sena}
                        </p>
                        <a
                          href={`https://www.mercadopago.com.ar/activities?q=${reserva.payment_id_sena}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Ver comprobante
                        </a>
                      </div>
                    )}
                    {isCliente && (reserva.estado_pago_sena === 'pendiente_pago_sena' || reserva.estado_pago_sena === 'pendiente') && (
                      <div className="md:col-span-2">
                        <button
                          onClick={() => handlePagarSena(reserva.id_reserva, setProcesandoPago)}
                          disabled={procesandoPago}
                          className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                        >
                          {procesandoPago ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                              Procesando...
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-5 h-5 mr-2" />
                              Pagar Seña con MercadoPago
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {(reserva.monto_final > 0 || reserva.estado_pago_final !== 'pendiente') && (
                  <div className="bg-gray-800 rounded-lg p-5 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Pago Final</h3>
                      <EstadoPagoBadge estado={reserva.estado_pago_final} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Monto</span>
                        <p className="text-white font-semibold text-lg">${formatCurrency(reserva.monto_final || reserva.monto_total)} ARS</p>
                      </div>
                      {reserva.fecha_pago_final && (
                        <div>
                          <span className="text-gray-400">Fecha de pago</span>
                          <p className="text-white">{new Date(reserva.fecha_pago_final).toLocaleString('es-AR')}</p>
                        </div>
                      )}
                      {reserva.payment_id_final && (
                        <div className="md:col-span-2">
                          <span className="text-gray-400">ID de transacción</span>
                          <p className="text-white font-mono text-xs bg-gray-900 px-2 py-1 rounded mt-1 break-all">
                            {reserva.payment_id_final}
                          </p>
                          <a
                            href={`https://www.mercadopago.com.ar/activities?q=${reserva.payment_id_final}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Ver comprobante
                          </a>
                        </div>
                      )}
                      {isCliente && reserva.estado_pago_final === 'pendiente' && (
                        <div className="md:col-span-2">
                          <button
                            onClick={() => handlePagarFinal(reserva.id_reserva, setProcesandoPago)}
                            disabled={procesandoPago}
                            className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                          >
                            {procesandoPago ? (
                              <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                                Procesando...
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-5 h-5 mr-2" />
                                Pagar Monto Final con MercadoPago
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {reserva.monto_total > 0 && (
                  <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold">Monto Total del Servicio</span>
                      <span className="text-white font-bold text-2xl">${formatCurrency(reserva.monto_total)} ARS</span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {reserva.observaciones && (
              <section className="bg-gray-900 rounded-xl border border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-white mb-3">Descripción del Cliente</h2>
                <p className="text-gray-300 whitespace-pre-wrap">{reserva.observaciones}</p>
              </section>
            )}

            {reserva.notas_adicionales && (
              <section className="bg-gray-900 rounded-xl border border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-white mb-3">Notas Adicionales</h2>
                <p className="text-gray-300 whitespace-pre-wrap">{reserva.notas_adicionales}</p>
              </section>
            )}

            <section className="bg-gray-900 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center mb-4">
                <ImageIcon className="w-6 h-6 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">Imágenes del Servicio</h2>
              </div>
              {reserva.imagenes && reserva.imagenes.length > 0 ? (
                <div className="space-y-6">
                  {reserva.imagenes.some((img) => img.tipo_imagen === 'jardin') && (
                    <div>
                      <h3 className="text-lg font-medium text-white mb-3">Imágenes del jardín actual</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {reserva.imagenes
                          .filter((img) => img.tipo_imagen === 'jardin')
                          .map((imagen) => (
                            <div key={imagen.id_imagen_reserva} className="bg-gray-800 rounded-lg overflow-hidden">
                              <img
                                src={imagen.imagen_url || (imagen.imagen?.startsWith('http') ? imagen.imagen : `http://localhost:8000${imagen.imagen}`)}
                                alt={imagen.descripcion || 'Imagen de la reserva'}
                                className="w-full h-48 object-cover"
                                onError={(e) => {
                                  e.target.src = placeholderImage;
                                }}
                              />
                              {imagen.descripcion && (
                                <div className="p-3 border-t border-gray-700">
                                  <p className="text-sm text-gray-300">{imagen.descripcion}</p>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {reserva.imagenes.some((img) => img.tipo_imagen === 'ideas') && (
                    <div>
                      <h3 className="text-lg font-medium text-white mb-3">Ideas y referencias</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {reserva.imagenes
                          .filter((img) => img.tipo_imagen === 'ideas')
                          .map((imagen) => (
                            <div key={imagen.id_imagen_reserva} className="bg-gray-800 rounded-lg overflow-hidden">
                              <img
                                src={imagen.imagen_url || (imagen.imagen?.startsWith('http') ? imagen.imagen : `http://localhost:8000${imagen.imagen}`)}
                                alt={imagen.descripcion || 'Referencia de diseño'}
                                className="w-full h-48 object-cover"
                                onError={(e) => {
                                  e.target.src = placeholderImage;
                                }}
                              />
                              {imagen.descripcion && (
                                <div className="p-3 border-t border-gray-700">
                                  <p className="text-sm text-gray-300">{imagen.descripcion}</p>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500 italic">
                  No hay imágenes adjuntas para esta reserva.
                </div>
              )}
            </section>

            <section className="bg-gray-900 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center mb-4">
                <Palette className="w-6 h-6 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">Información del Diseño</h2>
              </div>
              {diseno ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-400 text-sm">Título</span>
                        <p className="text-white text-lg font-semibold">{diseno.titulo}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm">Estado</span>
                        <p className="text-white capitalize">{diseno.estado?.replace('_', ' ')}</p>
                      </div>
                      {diseno.fecha_propuesta && (
                        <div className="flex items-center space-x-2 text-gray-300">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Propuesta para {new Date(diseno.fecha_propuesta).toLocaleString('es-AR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      {diseno.disenador_nombre && (
                        <div>
                          <span className="text-gray-400 text-sm">Diseñador</span>
                          <p className="text-white">{diseno.disenador_nombre}</p>
                        </div>
                      )}
                      {diseno.presupuesto && (
                        <div>
                          <span className="text-gray-400 text-sm">Presupuesto estimado</span>
                          <p className="text-white font-semibold text-lg">${formatCurrency(diseno.presupuesto)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {diseno.descripcion && (
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h3 className="text-white font-medium mb-2">Descripción</h3>
                      <p className="text-gray-300 whitespace-pre-wrap">{diseno.descripcion}</p>
                    </div>
                  )}

                  {diseno.imagenes && diseno.imagenes.length > 0 && (
                    <div>
                      <h3 className="text-white font-medium mb-3">Imágenes del diseño</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {diseno.imagenes.map((imagen) => (
                          <div key={imagen.id_imagen_diseno} className="bg-gray-800 rounded-lg overflow-hidden">
                            <img
                              src={imagen.imagen_url}
                              alt={imagen.descripcion || 'Imagen del diseño'}
                              className="w-full h-48 object-cover"
                            />
                            {imagen.descripcion && (
                              <div className="p-3 border-t border-gray-700">
                                <p className="text-sm text-gray-300">{imagen.descripcion}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {diseno.productos && diseno.productos.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-white font-medium">Productos incluidos</h3>
                      <div className="grid grid-cols-1 gap-4">
                        {diseno.productos.map((producto) => {
                          const cantidad = Number(producto.cantidad) || 0;
                          const precioUnitario = Number(producto.precio_unitario) || 0;
                          const subtotal = cantidad * precioUnitario;
                          return (
                            <div key={producto.id_diseno_producto} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-white font-semibold text-lg">{producto.producto_nombre}</p>
                                  {producto.producto_codigo && (
                                    <p className="text-xs text-gray-400 mt-1">Código: {producto.producto_codigo}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-emerald-400 font-bold">${formatCurrency(subtotal)}</p>
                                  <p className="text-xs text-gray-400">{cantidad} x ${formatCurrency(precioUnitario)}</p>
                                </div>
                              </div>
                              {producto.notas && (
                                <div className="mt-3 pt-3 border-t border-gray-700">
                                  <p className="text-xs text-gray-400 mb-1">Notas</p>
                                  <p className="text-gray-300 text-sm">{producto.notas}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500 italic">
                  Aún no hay un diseño asociado a esta reserva.
                </div>
              )}
            </section>

            {!isCliente && reserva.empleados_asignados && reserva.empleados_asignados.length > 0 && (
              <section className="bg-gray-900 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center mb-4">
                  <User className="w-6 h-6 text-emerald-400 mr-2" />
                  <h2 className="text-xl font-semibold text-white">Empleados asignados</h2>
                </div>
                <div className="space-y-3">
                  {reserva.empleados_asignados.map((empleado) => (
                    <div key={empleado.id_reserva_empleado} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">
                          {`${empleado.empleado_nombre || ''} ${empleado.empleado_apellido || ''}`.trim() || 'Empleado asignado'}
                        </p>
                        <p className="text-xs text-gray-400">{empleado.rol_display}</p>
                      </div>
                      <span className="text-sm text-gray-400">
                        Asignado el {new Date(empleado.fecha_asignacion).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section id="encuesta" className="bg-gray-900 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center mb-4">
                <FileText className="w-6 h-6 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">Encuesta de satisfacción</h2>
              </div>

              {!isCliente && (
                <p className="text-gray-400">
                  Las encuestas solo están disponibles para clientes.
                </p>
              )}

              {isCliente && reserva.estado !== 'completada' && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-gray-300">
                  <p>
                    Te avisaremos cuando el servicio esté completado para que puedas contarnos tu experiencia.
                  </p>
                </div>
              )}

              {isCliente && reserva.estado === 'completada' && surveyState.loading && (
                <div className="flex items-center space-x-3 text-gray-300">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500" />
                  <span>Cargando encuesta...</span>
                </div>
              )}

              {isCliente && reserva.estado === 'completada' && !surveyState.loading && surveyState.error && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-gray-300">
                  {surveyState.error}
                </div>
              )}

              {isCliente && reserva.estado === 'completada' && surveyState.completada && (
                <div className="bg-emerald-500/10 border border-emerald-500 rounded-lg p-4 text-emerald-200">
                  <p className="font-semibold">¡Gracias por completar la encuesta!</p>
                  <p className="text-sm text-emerald-100 mt-1">
                    Apreciamos que te tomes el tiempo para compartir tu experiencia.
                  </p>
                </div>
              )}

              {puedeMostrarEncuesta && (
                <form onSubmit={handleEnviarEncuesta} className="space-y-6 mt-4">
                  {surveyState.encuesta?.descripcion && (
                    <p className="text-gray-300">{surveyState.encuesta.descripcion}</p>
                  )}
                  <div className="space-y-6">
                    {surveyState.encuesta?.preguntas?.map((pregunta, index) => (
                      <div key={pregunta.id ?? pregunta.id_pregunta} className="border border-gray-800 rounded-lg p-5 bg-gray-800">
                        <label className="block text-white font-medium mb-3">
                          {index + 1}. {pregunta.texto}
                          {pregunta.obligatoria && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {pregunta.descripcion && (
                          <p className="text-sm text-gray-400 mb-3">{pregunta.descripcion}</p>
                        )}
                        {renderPregunta(pregunta, index)}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={enviandoEncuesta}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      {enviandoEncuesta ? 'Enviando...' : 'Enviar encuesta'}
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

const EstadoPagoBadge = ({ estado }) => {
  if (!estado) {
    return null;
  }

  const config = {
    aprobado: {
      text: 'Pagado',
      color: 'bg-emerald-500/20 text-emerald-300',
      icon: CheckCircle,
    },
    sena_pagada: {
      text: 'Pagado',
      color: 'bg-emerald-500/20 text-emerald-300',
      icon: CheckCircle,
    },
    pagado: {
      text: 'Pagado',
      color: 'bg-emerald-500/20 text-emerald-300',
      icon: CheckCircle,
    },
    pendiente_pago_sena: {
      text: 'Pendiente',
      color: 'bg-yellow-500/20 text-yellow-300',
      icon: Clock,
    },
    pendiente: {
      text: 'Pendiente',
      color: 'bg-yellow-500/20 text-yellow-300',
      icon: Clock,
    },
    rechazado: {
      text: 'Rechazado',
      color: 'bg-red-500/20 text-red-300',
      icon: XCircle,
    },
    cancelado: {
      text: 'Cancelado',
      color: 'bg-red-500/20 text-red-300',
      icon: XCircle,
    },
  };

  const badge = config[estado] || {
    text: estado,
    color: 'bg-gray-600/40 text-gray-100',
    icon: Clock,
  };

  const Icon = badge.icon;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
      <Icon className="w-4 h-4 mr-1" />
      {badge.text}
    </span>
  );
};

export default ReservaDetallePage;
