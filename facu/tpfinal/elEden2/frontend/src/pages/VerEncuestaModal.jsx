import { X, CheckCircle, Circle } from 'lucide-react';

const VerEncuestaModal = ({ show, onClose, encuesta }) => {
  if (!show || !encuesta) return null;

  const getTipoLabel = (tipo) => {
    const tipos = {
      'texto': 'Texto Libre',
      'numero': 'Número',
      'escala': 'Escala (1-10)',
      'si_no': 'Sí/No',
      'multiple': 'Opción Múltiple'
    };
    return tipos[tipo] || tipo;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">{encuesta.titulo}</h2>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  encuesta.activa
                    ? 'bg-green-900/50 text-green-400 border border-green-500'
                    : 'bg-red-900/50 text-red-400 border border-red-500'
                }`}
              >
                {encuesta.activa ? 'Activa' : 'Inactiva'}
              </span>
              <span className="text-sm text-gray-400">
                {encuesta.total_preguntas} pregunta{encuesta.total_preguntas !== 1 ? 's' : ''}
              </span>
              <span className="text-sm text-gray-400">
                {encuesta.total_respuestas} respuesta{encuesta.total_respuestas !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors ml-4"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Descripción */}
          {encuesta.descripcion && (
            <div className="mb-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Descripción:</h3>
              <p className="text-gray-300">{encuesta.descripcion}</p>
            </div>
          )}

          {/* Preguntas */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Preguntas</h3>
            <div className="space-y-4">
              {encuesta.preguntas && encuesta.preguntas.length > 0 ? (
                encuesta.preguntas.map((pregunta, index) => (
                  <div key={pregunta.id_pregunta} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    {/* Encabezado de la pregunta */}
                    <div className="flex items-start gap-3 mb-3">
                      <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold text-sm flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-white font-medium mb-2">{pregunta.texto}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-gray-600 text-gray-300 rounded text-xs">
                            {getTipoLabel(pregunta.tipo)}
                          </span>
                          {pregunta.obligatoria ? (
                            <span className="px-2 py-1 bg-red-900/50 text-red-400 border border-red-500 rounded text-xs flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Obligatoria
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-600 text-gray-400 rounded text-xs flex items-center gap-1">
                              <Circle className="w-3 h-3" />
                              Opcional
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Opciones para preguntas múltiples */}
                    {pregunta.tipo === 'multiple' && pregunta.opciones && pregunta.opciones.length > 0 && (
                      <div className="ml-11 mt-3 space-y-2">
                        <p className="text-sm text-gray-400 mb-2">Opciones disponibles:</p>
                        <div className="space-y-1">
                          {pregunta.opciones.map((opcion, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2 text-sm">
                              <Circle className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-300">{opcion}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Vista previa del tipo de respuesta */}
                    {pregunta.tipo === 'escala' && (
                      <div className="ml-11 mt-3 flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <div key={num} className="w-10 h-10 flex items-center justify-center bg-gray-600 text-gray-300 rounded-lg text-sm">
                            {num}
                          </div>
                        ))}
                      </div>
                    )}

                    {pregunta.tipo === 'si_no' && (
                      <div className="ml-11 mt-3 flex gap-3">
                        <div className="px-4 py-2 bg-green-900/30 text-green-400 border border-green-600 rounded-lg text-sm">
                          Sí
                        </div>
                        <div className="px-4 py-2 bg-red-900/30 text-red-400 border border-red-600 rounded-lg text-sm">
                          No
                        </div>
                      </div>
                    )}

                    {pregunta.tipo === 'texto' && (
                      <div className="ml-11 mt-3">
                        <div className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-400 text-sm italic">
                          Respuesta de texto libre...
                        </div>
                      </div>
                    )}

                    {pregunta.tipo === 'numero' && (
                      <div className="ml-11 mt-3">
                        <div className="w-32 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-400 text-sm italic">
                          Número...
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-8">No hay preguntas en esta encuesta</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerEncuestaModal;
