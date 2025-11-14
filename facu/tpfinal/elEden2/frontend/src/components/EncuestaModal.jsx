import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { encuestasService } from '../services/encuestasService';
import { XMarkIcon } from '@heroicons/react/24/outline';

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
      data.preguntas.forEach(pregunta => {
        respuestasIniciales[pregunta.id] = {
          pregunta_id: pregunta.id,
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
    setRespuestas(prev => ({
      ...prev,
      [preguntaId]: {
        ...prev[preguntaId],
        [`valor_${tipo}`]: valor
      }
    }));
  };

  const validarRespuestas = () => {
    if (!encuesta) return false;

    for (const pregunta of encuesta.preguntas) {
      if (!pregunta.obligatoria) continue;

      const respuesta = respuestas[pregunta.id];
      const valorCampo = `valor_${pregunta.tipo}`;
      
      if (!respuesta[valorCampo] && respuesta[valorCampo] !== 0 && respuesta[valorCampo] !== false) {
        alert(`La pregunta "${pregunta.texto}" es obligatoria`);
        return false;
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
      
      // Convertir el objeto de respuestas a un array
      const respuestasArray = Object.values(respuestas);
      
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
    const respuesta = respuestas[pregunta.id];

    switch (pregunta.tipo) {
      case 'texto':
        return (
          <textarea
            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500"
            rows="3"
            value={respuesta.valor_texto || ''}
            onChange={(e) => handleRespuestaChange(pregunta.id, 'texto', e.target.value)}
            required={pregunta.obligatoria}
          />
        );

      case 'numero':
        return (
          <input
            type="number"
            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500"
            value={respuesta.valor_numero || ''}
            onChange={(e) => handleRespuestaChange(pregunta.id, 'numero', parseFloat(e.target.value))}
            required={pregunta.obligatoria}
          />
        );

      case 'escala':
        return (
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">1 (Muy malo)</span>
              <span className="text-sm text-gray-600">10 (Excelente)</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              className="w-full"
              value={respuesta.valor_escala || 5}
              onChange={(e) => handleRespuestaChange(pregunta.id, 'escala', parseInt(e.target.value))}
              required={pregunta.obligatoria}
            />
            <div className="text-center text-2xl font-bold text-green-600">
              {respuesta.valor_escala || 5}
            </div>
          </div>
        );

      case 'si_no':
        return (
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name={`pregunta_${pregunta.id}`}
                value="true"
                checked={respuesta.valor_boolean === true}
                onChange={() => handleRespuestaChange(pregunta.id, 'boolean', true)}
                required={pregunta.obligatoria}
                className="w-4 h-4 text-green-600"
              />
              <span>Sí</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name={`pregunta_${pregunta.id}`}
                value="false"
                checked={respuesta.valor_boolean === false}
                onChange={() => handleRespuestaChange(pregunta.id, 'boolean', false)}
                required={pregunta.obligatoria}
                className="w-4 h-4 text-green-600"
              />
              <span>No</span>
            </label>
          </div>
        );

      case 'multiple': {
        const opciones = pregunta.opciones_multiple || [];
        return (
          <div className="space-y-2">
            {opciones.map((opcion, index) => (
              <label key={index} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name={`pregunta_${pregunta.id}`}
                  value={opcion}
                  checked={respuesta.valor_multiple === opcion}
                  onChange={() => handleRespuestaChange(pregunta.id, 'multiple', opcion)}
                  required={pregunta.obligatoria}
                  className="w-4 h-4 text-green-600"
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
            {encuesta?.preguntas?.map((pregunta, index) => (
              <div key={pregunta.id} className="border-b pb-6 last:border-b-0">
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
            ))}
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
