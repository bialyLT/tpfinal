import React, { useState, useEffect } from 'react';
import { serviciosService } from '../services';
import { success, error, handleApiError } from '../utils/notifications';
import { 
  Calendar, 
  MapPin, 
  FileText, 
  Send, 
  Settings, 
  CheckCircle,
  AlertCircle,
  Clock,
  User
} from 'lucide-react';

const SolicitarServicioPage = () => {
  const [tiposServicio, setTiposServicio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    tipo_servicio: '',
    descripcion: '',
    fecha_preferida: '',
    direccion_servicio: '',
    notas_adicionales: ''
  });

  const steps = [
    { id: 1, title: 'Tipo de Servicio', icon: Settings },
    { id: 2, title: 'Detalles', icon: FileText },
    { id: 3, title: 'Programación', icon: Calendar },
    { id: 4, title: 'Confirmación', icon: CheckCircle }
  ];

  useEffect(() => {
    fetchTiposServicio();
  }, []);

  const fetchTiposServicio = async () => {
    try {
      setLoading(true);
      const data = await serviciosService.getTiposServicio();
      setTiposServicio(data.results || []);
    } catch (err) {
      handleApiError(err, 'Error al cargar los tipos de servicio');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.tipo_servicio) {
          error('Por favor selecciona un tipo de servicio');
          return false;
        }
        break;
      case 2:
        if (!formData.descripcion.trim()) {
          error('Por favor ingresa una descripción del servicio');
          return false;
        }
        if (!formData.direccion_servicio.trim()) {
          error('Por favor ingresa la dirección del servicio');
          return false;
        }
        break;
      case 3:
        if (!formData.fecha_preferida) {
          error('Por favor selecciona una fecha preferida');
          return false;
        }
        break;
      default:
        return true;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setSubmitting(true);
    try {
      await serviciosService.createSolicitud(formData);
      success('Solicitud de servicio enviada correctamente');
      // Reset form
      setFormData({
        tipo_servicio: '',
        descripcion: '',
        fecha_preferida: '',
        direccion_servicio: '',
        notas_adicionales: ''
      });
      setCurrentStep(1);
    } catch (err) {
      handleApiError(err, 'Error al enviar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedServiceType = () => {
    return tiposServicio.find(tipo => tipo.id == formData.tipo_servicio);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-400"></div>
          <p className="text-gray-300 mt-4">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <Send className="w-8 h-8 mr-3 text-green-400" />
            Solicitar Servicio
          </h1>
          <p className="text-gray-400">
            Complete el formulario para solicitar un servicio de jardinería
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                        isCompleted
                          ? 'bg-green-600 text-white'
                          : isActive
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-sm ${isActive ? 'text-white' : 'text-gray-400'}`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-4 ${
                        currentStep > step.id ? 'bg-green-600' : 'bg-gray-700'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <div className="bg-gray-800 rounded-lg p-6">
          {/* Step 1: Service Type */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Selecciona el tipo de servicio</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tiposServicio.map(tipo => (
                  <div
                    key={tipo.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.tipo_servicio == tipo.id
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                    onClick={() => setFormData({...formData, tipo_servicio: tipo.id})}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="tipo_servicio"
                        value={tipo.id}
                        checked={formData.tipo_servicio == tipo.id}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <Settings className="w-8 h-8 text-green-400 mr-4" />
                      <div>
                        <h3 className="text-lg font-medium text-white">{tipo.nombre}</h3>
                        <p className="text-sm text-gray-400 mt-1">{tipo.descripcion}</p>
                        {tipo.precio_base && (
                          <p className="text-green-400 font-semibold mt-2">
                            Desde ${tipo.precio_base}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Detalles del servicio</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Descripción del servicio
                  </label>
                  <textarea
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Describe detalladamente el servicio que necesitas..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Dirección del servicio
                  </label>
                  <input
                    type="text"
                    name="direccion_servicio"
                    value={formData.direccion_servicio}
                    onChange={handleChange}
                    placeholder="Ingresa la dirección donde se realizará el servicio"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Notas adicionales (opcional)
                  </label>
                  <textarea
                    name="notas_adicionales"
                    value={formData.notas_adicionales}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Información adicional que consideres importante..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Scheduling */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Programación</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Fecha preferida
                  </label>
                  <input
                    type="date"
                    name="fecha_preferida"
                    value={formData.fecha_preferida}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <p className="text-sm text-gray-400 mt-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Nos pondremos en contacto contigo para confirmar la disponibilidad
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Confirmar solicitud</h2>
              <div className="space-y-4 bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center">
                  <Settings className="w-5 h-5 text-green-400 mr-3" />
                  <div>
                    <span className="text-gray-300">Servicio: </span>
                    <span className="text-white font-medium">
                      {getSelectedServiceType()?.nombre}
                    </span>
                  </div>
                </div>

                <div className="flex items-start">
                  <FileText className="w-5 h-5 text-green-400 mr-3 mt-0.5" />
                  <div>
                    <span className="text-gray-300">Descripción: </span>
                    <span className="text-white">{formData.descripcion}</span>
                  </div>
                </div>

                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-green-400 mr-3" />
                  <div>
                    <span className="text-gray-300">Dirección: </span>
                    <span className="text-white">{formData.direccion_servicio}</span>
                  </div>
                </div>

                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-green-400 mr-3" />
                  <div>
                    <span className="text-gray-300">Fecha preferida: </span>
                    <span className="text-white">{formData.fecha_preferida}</span>
                  </div>
                </div>

                {formData.notas_adicionales && (
                  <div className="flex items-start">
                    <FileText className="w-5 h-5 text-green-400 mr-3 mt-0.5" />
                    <div>
                      <span className="text-gray-300">Notas: </span>
                      <span className="text-white">{formData.notas_adicionales}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-blue-400 mr-3" />
                  <div>
                    <h4 className="text-blue-300 font-medium">¿Qué sigue?</h4>
                    <p className="text-sm text-gray-300 mt-1">
                      Revisaremos tu solicitud y nos pondremos en contacto contigo dentro de las próximas 24 horas para confirmar los detalles y programar el servicio.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`px-4 py-2 rounded-lg ${
                currentStep === 1
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-600 text-white hover:bg-gray-500'
              }`}
            >
              Anterior
            </button>

            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`px-6 py-2 rounded-lg transition-colors flex items-center ${
                  submitting
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Solicitud
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolicitarServicioPage;
