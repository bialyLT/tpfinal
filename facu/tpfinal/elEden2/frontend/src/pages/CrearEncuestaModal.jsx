import { useState, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import api from '../services/api';
import { encuestasService } from '../services/encuestasService';

const TIPOS_PREGUNTA = [
  { value: 'escala', label: 'Escala (1-10)' }
];

const CrearEncuestaModal = ({ show, onClose, onSuccess, encuesta, modoEdicion }) => {
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    activa: true,
    preguntas: []
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [encuestaActiva, setEncuestaActiva] = useState(null);
  const [loadingActiva, setLoadingActiva] = useState(false);

  const disableActiveCreation = !modoEdicion && !loadingActiva && formData.activa && Boolean(encuestaActiva);

  useEffect(() => {
    const obtenerActiva = async () => {
      setLoadingActiva(true);
      try {
        const activa = await encuestasService.obtenerEncuestaActiva();
        setEncuestaActiva(activa);
      } catch (error) {
        if (error.response?.status === 404) {
          setEncuestaActiva(null);
        } else {
          console.error('Error al verificar encuesta activa:', error);
        }
      } finally {
        setLoadingActiva(false);
      }
    };

    if (!modoEdicion) {
      obtenerActiva();
    }

    if (modoEdicion && encuesta) {
      setFormData({
        titulo: encuesta.titulo,
        descripcion: encuesta.descripcion || '',
        activa: encuesta.activa,
        preguntas: (encuesta.preguntas || []).map((pregunta) => ({
          ...pregunta,
          tipo: 'escala',
          impacta_puntuacion: Boolean(pregunta.impacta_puntuacion),
          opciones: []
        }))
      });
    } else {
      // Resetear form cuando es creación
      setFormData({
        titulo: '',
        descripcion: '',
        activa: true,
        preguntas: []
      });
    }
  }, [modoEdicion, encuesta]);

  const agregarPregunta = () => {
    setFormData(prev => ({
      ...prev,
      preguntas: [
        ...prev.preguntas,
        {
          texto: '',
          tipo: 'escala',
          obligatoria: true,
          opciones: [],
          impacta_puntuacion: false
        }
      ]
    }));
  };

  const eliminarPregunta = (index) => {
    setFormData(prev => ({
      ...prev,
      preguntas: prev.preguntas.filter((_, i) => i !== index)
    }));
  };

  const actualizarPregunta = (index, campo, valor) => {
    setFormData(prev => ({
      ...prev,
      preguntas: prev.preguntas.map((p, i) => {
        if (i === index) {
          return { ...p, [campo]: valor, tipo: 'escala', opciones: [] };
        }
        return p;
      })
    }));
  };

  const agregarOpcion = (indexPregunta) => {
    setFormData(prev => ({
      ...prev,
      preguntas: prev.preguntas.map((p, i) => {
        if (i === indexPregunta) {
          return {
            ...p,
            opciones: [...(p.opciones || []), '']
          };
        }
        return p;
      })
    }));
  };

  const actualizarOpcion = (indexPregunta, indexOpcion, valor) => {
    setFormData(prev => ({
      ...prev,
      preguntas: prev.preguntas.map((p, i) => {
        if (i === indexPregunta) {
          return {
            ...p,
            opciones: p.opciones.map((o, j) => j === indexOpcion ? valor : o)
          };
        }
        return p;
      })
    }));
  };

  const eliminarOpcion = (indexPregunta, indexOpcion) => {
    setFormData(prev => ({
      ...prev,
      preguntas: prev.preguntas.map((p, i) => {
        if (i === indexPregunta) {
          return {
            ...p,
            opciones: p.opciones.filter((_, j) => j !== indexOpcion)
          };
        }
        return p;
      })
    }));
  };

  const validarFormulario = () => {
    const newErrors = {};

    if (!formData.titulo.trim()) {
      newErrors.titulo = 'El título es obligatorio';
    }

    if (formData.preguntas.length === 0) {
      newErrors.preguntas = 'Debe agregar al menos una pregunta';
    }

    formData.preguntas.forEach((pregunta, index) => {
      if (!pregunta.texto.trim()) {
        newErrors[`pregunta_${index}_texto`] = 'El texto de la pregunta es obligatorio';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    if (!modoEdicion && formData.activa && encuestaActiva) {
      setErrors((prev) => ({
        ...prev,
        activa: 'Ya existe una encuesta activa. Desactívala antes de crear una nueva.'
      }));
      return;
    }

    try {
      setLoading(true);

      // Preparar datos: filtrar opciones vacías
      const dataToSend = {
        ...formData,
        preguntas: formData.preguntas.map(p => ({
          ...p,
          tipo: 'escala',
          impacta_puntuacion: Boolean(p.impacta_puntuacion),
          opciones: []
        }))
      };

      if (modoEdicion) {
        await api.put(`/encuestas/${encuesta.id_encuesta}/`, dataToSend);
      } else {
        await api.post('/encuestas/', dataToSend);
      }

      onSuccess();
    } catch (error) {
      console.error('Error al guardar encuesta:', error);
      if (error.response?.data) {
        const serverErrors = {};
        Object.keys(error.response.data).forEach(key => {
          serverErrors[key] = Array.isArray(error.response.data[key])
            ? error.response.data[key][0]
            : error.response.data[key];
        });
        setErrors(serverErrors);
      } else {
        alert('Error al guardar la encuesta');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">
            {modoEdicion ? 'Editar Encuesta' : 'Nueva Encuesta'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Información Básica */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Título *
              </label>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.titulo ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="Ej: Encuesta de Satisfacción Post-Servicio"
              />
              {errors.titulo && (
                <p className="text-red-400 text-sm mt-1">{errors.titulo}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descripción opcional de la encuesta..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activa"
                checked={formData.activa}
                onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="activa" className="text-sm text-gray-300">
                Encuesta activa (visible para responder)
              </label>
            </div>
            {errors.activa && (
              <p className="text-red-400 text-sm mt-1">{errors.activa}</p>
            )}

            {disableActiveCreation && (
              <div className="p-4 rounded-lg border border-amber-400 bg-amber-500/10 text-amber-200">
                <p className="text-sm font-semibold">
                  Ya existe una encuesta activa: <span className="underline">{encuestaActiva.titulo}</span>.
                </p>
                <p className="text-sm mt-1">
                  Debes desactivar esa encuesta antes de crear una nueva como activa.
                </p>
              </div>
            )}
          </div>

          {/* Preguntas */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Preguntas</h3>
              <button
                type="button"
                onClick={agregarPregunta}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Agregar Pregunta
              </button>
            </div>

            {errors.preguntas && (
              <p className="text-red-400 text-sm mb-4">{errors.preguntas}</p>
            )}

            <div className="space-y-4">
              {formData.preguntas.map((pregunta, index) => (
                <div key={index} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex items-center gap-2 text-gray-400 pt-2">
                      <GripVertical className="w-5 h-5" />
                      <span className="font-bold">{index + 1}</span>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div>
                        <input
                          type="text"
                          value={pregunta.texto}
                          onChange={(e) => actualizarPregunta(index, 'texto', e.target.value)}
                          className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`pregunta_${index}_texto`] ? 'border-red-500' : 'border-gray-600'
                          }`}
                          placeholder="Escriba la pregunta..."
                        />
                        {errors[`pregunta_${index}_texto`] && (
                          <p className="text-red-400 text-sm mt-1">{errors[`pregunta_${index}_texto`]}</p>
                        )}
                      </div>

                      <div className="flex gap-3 items-center">
                        <span className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm">
                          Escala (1-10)
                        </span>

                        <label className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            checked={pregunta.obligatoria}
                            onChange={(e) => actualizarPregunta(index, 'obligatoria', e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                          />
                          Obligatoria
                        </label>

                        <label className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            checked={pregunta.impacta_puntuacion}
                            onChange={(e) => actualizarPregunta(index, 'impacta_puntuacion', e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                          />
                          Impacta en puntuación
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => eliminarPregunta(index)}
                      className="text-red-400 hover:text-red-300 transition-colors p-2"
                      title="Eliminar pregunta"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || disableActiveCreation}
            >
              {loading ? 'Guardando...' : modoEdicion ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrearEncuestaModal;
