import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { encuestasService } from '../services/encuestasService';
import { XMarkIcon } from '@heroicons/react/24/outline';

const FEEDBACK_PRESETS = [
  'Demora en la atención',
  'Calidad del servicio',
  'Comunicación',
  'No se cumplió lo acordado',
  'Atención del personal',
  'Otro'
];

const getPreguntaId = (pregunta) => pregunta?.id_pregunta ?? pregunta?.id;

const EncuestaModal = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reservaId = searchParams.get('reserva');

  const [encuesta, setEncuesta] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [completada, setCompletada] = useState(false);

  useEffect(() => {
    if (!reservaId) {
      setError('No se proporcionó el ID de la reserva');
      setLoading(false);
      return;
    }

    cargarEncuesta();
  }, [reservaId]);

  const cargarEncuesta = async () => {
    try {
      setLoading(true);
      const data = await encuestasService.obtenerEncuestaActiva();
      setEncuesta(data);
      
      // Inicializar respuestas vacías
      const respuestasIniciales = {};
      data.preguntas.forEach((pregunta, idx) => {
        const preguntaId = getPreguntaId(pregunta) ?? idx;
        respuestasIniciales[preguntaId] = {
          pregunta_id: preguntaId,
          valor_texto: null,
          valor_numero: null,
          valor_escala: null,
          valor_boolean: null,
          valor_multiple: null
        };
      });
      setRespuestas(respuestasIniciales);
    } catch (err) {
      console.error('Error al cargar encuesta:', err);
      setError(err.response?.data?.error || 'No hay encuestas activas disponibles');
    } finally {
      setLoading(false);
    }
  };

  const handleRespuestaChange = (preguntaId, tipo, valor) => {
    setRespuestas(prev => {
      const next = {
        ...prev,
        [preguntaId]: {
          ...prev[preguntaId],
          [`valor_${tipo}`]: valor
        }
      };

      // Si la escala vuelve a 10, limpiar feedback para no enviarlo innecesariamente
      if (tipo === 'escala' && Number(valor) === 10) {
        next[preguntaId].valor_texto = null;
      }

      return next;
    });
  };

  const handleFeedbackPreset = (preguntaId, preset) => {
    setRespuestas(prev => ({
      ...prev,
      [preguntaId]: {
        ...prev[preguntaId],
        valor_texto: preset
      }
    }));
  };

  const validarRespuestas = () => {
    if (!encuesta) return false;

    for (const pregunta of encuesta.preguntas) {
      const preguntaId = getPreguntaId(pregunta);
      const respuesta = respuestas[preguntaId];
      const valorCampo = `valor_${pregunta.tipo}`;
      const valor = respuesta?.[valorCampo];
      const respondida = valor !== undefined && valor !== null;

      if (pregunta.obligatoria && !respondida) {
        alert(`La pregunta "${pregunta.texto}" es obligatoria`);
        return false;
      }

      if (!respondida) {
        continue;
      }

      if (pregunta.tipo === 'escala') {
        const escala = Number(valor);
        if (Number.isNaN(escala) || escala < 1 || escala > 10) {
          alert(`Selecciona un valor entre 1 y 10 para "${pregunta.texto}"`);
          return false;
        }

        if (escala < 10) {
          const feedback = (respuesta?.valor_texto || '').trim();
          if (!feedback) {
            alert(`Agrega un feedback para la pregunta "${pregunta.texto}" al elegir menos de 10.`);
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarRespuestas()) {
      return;
    }

    try {
      setEnviando(true);
      
      // Convertir el objeto de respuestas a un array y normalizar datos
      const respuestasArray = Object.values(respuestas).map(respuesta => ({
        ...respuesta,
        valor_escala: respuesta?.valor_escala ?? null,
        valor_texto: (respuesta?.valor_texto || '').trim() || null
      }));
      
      await encuestasService.responderEncuesta(reservaId, respuestasArray);
      setCompletada(true);
      
      // Redirigir después de 3 segundos
      setTimeout(() => {
        navigate('/mis-servicios');
      }, 3000);
    } catch (err) {
      console.error('Error al enviar encuesta:', err);
      alert(err.response?.data?.error || 'Error al enviar la encuesta');
    } finally {
      setEnviando(false);
    }
  };

  const renderPregunta = (pregunta) => {
    const preguntaId = getPreguntaId(pregunta);
    const respuesta = respuestas[preguntaId] || {};
    const escalaValue = respuesta.valor_escala ?? 5;
    const requiereFeedback = Number(escalaValue) < 10;

    if (pregunta.tipo !== 'escala') {
      return (
        <div className="text-sm text-red-600">
          Este tipo de pregunta ya no está soportado. Contacta al administrador.
        </div>
      );
    }

    return (
      <div className="flex flex-col space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">1 (Muy malo)</span>
          <span className="text-sm text-gray-600">10 (Excelente)</span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          className="w-full"
          value={escalaValue}
          onChange={(e) => handleRespuestaChange(preguntaId, 'escala', parseInt(e.target.value, 10))}
          required={pregunta.obligatoria}
        />
        <div className="flex items-center justify-between">
          <div className="text-center text-2xl font-bold text-green-600">
            {escalaValue}
          </div>
          {/* Mensaje eliminado para clientes */}
        </div>

        {requiereFeedback && (
          <div className="space-y-2 border rounded-lg p-3 bg-amber-50 border-amber-200">
            <p className="text-sm text-amber-800">
              Cuéntanos qué mejorar cuando la puntuación es menor a 10.
            </p>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`px-3 py-1 rounded-full text-sm border ${
                    respuesta.valor_texto === preset
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100'
                  }`}
                  onClick={() => handleFeedbackPreset(preguntaId, preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
            <textarea
              className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-amber-500"
              rows="3"
              placeholder="Ej: La atención fue lenta, faltó comunicación sobre los tiempos..."
              value={respuesta.valor_texto || ''}
              onChange={(e) => handleRespuestaChange(preguntaId, 'texto', e.target.value)}
              required={requiereFeedback}
            />
          </div>
        )}
      </div>
    );
  };

  const cerrarModal = () => {
    if (!completada && !window.confirm('¿Estás seguro de salir sin completar la encuesta?')) {
      return;
    }
    navigate('/mis-servicios');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando encuesta...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <h3 className="text-xl font-bold text-red-600 mb-4">Error</h3>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => navigate('/mis-servicios')}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
          >
            Volver a mis servicios
          </button>
        </div>
      </div>
    );
  }

  if (completada) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-4">¡Gracias!</h3>
          <p className="text-gray-600 mb-4">
            Tu respuesta ha sido enviada exitosamente.
          </p>
          <p className="text-sm text-gray-500">
            Serás redirigido en unos segundos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="bg-green-600 text-white p-6 rounded-t-lg flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{encuesta?.titulo}</h2>
            <p className="text-green-100 text-sm mt-1">{encuesta?.descripcion}</p>
          </div>
          <button
            onClick={cerrarModal}
            className="text-white hover:text-gray-200"
            disabled={enviando}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {encuesta?.preguntas?.map((pregunta, index) => {
              const preguntaId = getPreguntaId(pregunta) ?? index;
              return (
                <div key={preguntaId} className="border-b pb-6 last:border-b-0">
                  <label className="block mb-3">
                    <span className="text-gray-700 font-medium">
                      {index + 1}. {pregunta.texto}
                      {pregunta.obligatoria && <span className="text-red-500 ml-1">*</span>}
                    </span>
                    {pregunta.descripcion && (
                      <p className="text-sm text-gray-500 mt-1">{pregunta.descripcion}</p>
                    )}
                  </label>
                  {renderPregunta(pregunta)}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={cerrarModal}
              disabled={enviando}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enviando ? 'Enviando...' : 'Enviar Encuesta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EncuestaModal;
