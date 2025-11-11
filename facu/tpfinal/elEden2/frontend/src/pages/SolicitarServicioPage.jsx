import React, { useState, useEffect } from 'react';
import { serviciosService } from '../services';
import { success, error, handleApiError } from '../utils/notifications';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, 
  MapPin, 
  FileText, 
  Send, 
  Settings, 
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Camera,
  Image,
  Upload,
  X
} from 'lucide-react';

const SolicitarServicioPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [serviciosDisponibles, setServiciosDisponibles] = useState([]);
  const [fechasBloqueadas, setFechasBloqueadas] = useState([]);
  const [formData, setFormData] = useState({
    servicio: '', // ID del servicio del catálogo
    descripcion: '',
    fecha_preferida: '',
    direccion_servicio: '',
    notas_adicionales: '',
    imagenes_jardin: [],
    imagenes_ideas: []
  });

  const steps = [
    { id: 1, title: 'Tipo de Servicio', icon: Settings },
    { id: 2, title: 'Detalles', icon: FileText },
    { id: 3, title: 'Programación', icon: Calendar },
    { id: 4, title: 'Confirmación', icon: CheckCircle }
  ];

  // Cargar servicios disponibles y dirección del cliente al montar el componente
  useEffect(() => {
    const fetchServicios = async () => {
      try {
        setLoading(true);
        const response = await serviciosService.getServicios();
        // Filtrar solo servicios activos
        const serviciosActivos = (response.results || response).filter(s => s.activo);
        setServiciosDisponibles(serviciosActivos);
      } catch (err) {
        handleApiError(err, 'Error al cargar servicios');
      } finally {
        setLoading(false);
      }
    };

    fetchServicios();

    if (user?.cliente?.direccion_completa) {
      setFormData(prev => ({
        ...prev,
        direccion_servicio: user.cliente.direccion_completa
      }));
    }
  }, [user]);

  // Cargar fechas bloqueadas al montar el componente
  useEffect(() => {
    const fetchFechasBloqueadas = async () => {
      try {
        const hoy = new Date().toISOString().split('T')[0];
        // Obtener fechas bloqueadas para los próximos 60 días
        const response = await serviciosService.getFechasDisponibles(hoy);
        setFechasBloqueadas(response.fechas_bloqueadas || []);
      } catch (err) {
        console.error('Error al cargar fechas bloqueadas:', err);
      }
    };

    fetchFechasBloqueadas();
  }, []);

  // Cleanup function para liberar URLs al desmontar el componente
  useEffect(() => {
    return () => {
      formData.imagenes_jardin.forEach(img => {
        if (img.preview) URL.revokeObjectURL(img.preview);
      });
      formData.imagenes_ideas.forEach(img => {
        if (img.preview) URL.revokeObjectURL(img.preview);
      });
    };
  }, [formData.imagenes_jardin, formData.imagenes_ideas]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Si es la fecha, verificar si está bloqueada
    if (name === 'fecha_preferida' && value) {
      if (fechasBloqueadas.includes(value)) {
        error('Esta fecha no está disponible. Todos los empleados están ocupados ese día.');
        return;
      }
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const isFechaBloqueada = (fecha) => {
    return fechasBloqueadas.includes(fecha);
  };

  const handleImageUpload = (e, tipo) => {
    const files = Array.from(e.target.files);
    const campo = tipo === 'jardin' ? 'imagenes_jardin' : 'imagenes_ideas';
    
    // Crear objetos con archivo, URL de preview, descripción vacía y un ID único
    const filesWithPreview = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ID único
      file: file,
      preview: URL.createObjectURL(file),
      name: file.name,
      descripcion: ''
    }));
    
    setFormData(prev => ({
      ...prev,
      [campo]: [...prev[campo], ...filesWithPreview]
    }));
  };

  const handleImageDescriptionChange = (imageId, tipo, descripcion) => {
    const campo = tipo === 'jardin' ? 'imagenes_jardin' : 'imagenes_ideas';
    
    setFormData(prev => ({
      ...prev,
      [campo]: prev[campo].map(img => 
        img.id === imageId ? { ...img, descripcion } : img
      )
    }));
  };

  const removeImage = (imageId, tipo) => {
    const campo = tipo === 'jardin' ? 'imagenes_jardin' : 'imagenes_ideas';
    
    setFormData(prev => {
      // Encontrar la imagen a eliminar y revocar su URL
      const imageToRemove = prev[campo].find(img => img.id === imageId);
      if (imageToRemove?.preview) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      
      return {
        ...prev,
        [campo]: prev[campo].filter(img => img.id !== imageId)
      };
    });
  };

  // Verificar si el servicio seleccionado es "Diseño de jardines"
  const isDisenioJardines = () => {
    const servicioSeleccionado = serviciosDisponibles.find(s => s.id_servicio === parseInt(formData.servicio));
    // Verificar si el nombre del servicio contiene "diseño" (case insensitive)
    return servicioSeleccionado?.nombre?.toLowerCase().includes('diseño');
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
        if (!formData.servicio) {
          error('Por favor selecciona un tipo de servicio');
          return false;
        }
        break;
      case 2:
        if (!formData.descripcion.trim()) {
          error('Por favor ingresa una descripción del servicio');
          return false;
        }
        break;
      case 3:
        if (!formData.fecha_preferida) {
          error('Por favor selecciona una fecha preferida');
          return false;
        }
        if (!formData.direccion_servicio.trim()) {
          error('Por favor ingresa la dirección del servicio');
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
      const servicioSeleccionado = serviciosDisponibles.find(s => s.id_servicio === parseInt(formData.servicio));
      
      // Preparar observaciones con la información del cliente
      let observaciones = `${formData.descripcion}\n\n`;
      
      if (formData.notas_adicionales) {
        observaciones += `Notas adicionales: ${formData.notas_adicionales}`;
      }

      console.log('🔵 Iniciando proceso de pago...');

      // Función auxiliar para convertir File a base64
      const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
        });
      };

      // Crear FormData con TODOS los datos de la reserva (incluyendo imágenes)
      const formDataToSend = new FormData();
      formDataToSend.append('servicio', parseInt(formData.servicio));
      formDataToSend.append('descripcion', formData.descripcion || `Solicitud de ${servicioSeleccionado?.nombre || 'servicio'}`);
      formDataToSend.append('fecha_preferida', formData.fecha_preferida);
      formDataToSend.append('direccion_servicio', formData.direccion_servicio);
      formDataToSend.append('notas_adicionales', formData.notas_adicionales || '');
      
      // Agregar imágenes del jardín
      formData.imagenes_jardin.forEach((img) => {
        formDataToSend.append('imagenes_jardin[]', img.file);
      });
      
      // Agregar imágenes de ideas
      formData.imagenes_ideas.forEach((img) => {
        formDataToSend.append('imagenes_ideas[]', img.file);
      });
      
      success('Creando reserva...');
      
      // PASO 1: Crear la reserva (sin pago aún)
      console.log('� Creando reserva...');
      const reservaResponse = await serviciosService.solicitarServicio(formDataToSend);
      
      console.log('✅ Reserva creada:', reservaResponse);
      const reservaId = reservaResponse.reserva?.id_reserva || reservaResponse.id_reserva;
      console.log('📋 Reserva ID:', reservaId);
      
      if (!reservaId) {
        throw new Error('No se recibió el ID de la reserva');
      }
      
      // PASO 2: Crear la preferencia de pago usando el MISMO endpoint que funciona en el modal
      console.log('💳 Creando preferencia de pago para la seña...');
      const preferencia = await serviciosService.crearPreferenciaSena(reservaId);
      
      console.log('✅ Preferencia de pago creada:', preferencia);
      
      // Limpiar URLs de preview
      formData.imagenes_jardin.forEach(img => {
        if (img.preview) URL.revokeObjectURL(img.preview);
      });
      formData.imagenes_ideas.forEach(img => {
        if (img.preview) URL.revokeObjectURL(img.preview);
      });
      
      success('Redirigiendo a la página de pago...');
      
      // Redirigir a MercadoPago en la misma ventana
      setTimeout(() => {
        const redirectUrl = preferencia.sandbox_init_point || preferencia.init_point;
        console.log('🌐 Redirigiendo a MercadoPago:', redirectUrl);
        
        // Redirigir en la misma ventana - MercadoPago devolverá a /reservas/pago-exitoso
        window.location.href = redirectUrl;
      }, 1000);
      
    } catch (err) {
      console.error('❌ Error al crear reserva y pago:', err);
      handleApiError(err, 'No se pudo crear la reserva o generar el link de pago');
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedServiceType = () => {
    return serviciosDisponibles.find(s => s.id_servicio === parseInt(formData.servicio));
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
              <h2 className="text-xl font-semibold text-white mb-4">Selecciona el servicio</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {serviciosDisponibles.map(servicio => (
                  <div
                    key={servicio.id_servicio}
                    className={`p-6 border-2 rounded-lg cursor-pointer transition-all hover:scale-105 ${
                      formData.servicio === servicio.id_servicio.toString()
                        ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                    onClick={() => setFormData({...formData, servicio: servicio.id_servicio.toString()})}
                  >
                    <div className="text-center">
                      <div className="text-5xl mb-4">🌻</div>
                      <h3 className="text-xl font-semibold text-white mb-2">{servicio.nombre}</h3>
                      <p className="text-sm text-gray-400 mb-3">{servicio.descripcion || 'Servicio profesional de jardinería'}</p>
                    </div>
                  </div>
                ))}
              </div>
              {serviciosDisponibles.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400">No hay servicios disponibles en este momento</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Details */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">
                Detalles de la solicitud
              </h2>
              <p className="text-gray-400 mb-6">
                Tipo: <span className="text-green-400 font-semibold">{getSelectedServiceType()?.nombre} {getSelectedServiceType()?.icon}</span>
              </p>
              
              <div className="space-y-6">
                {/* Descripción - común para ambos tipos */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Descripción de lo que necesita *
                  </label>
                  <textarea
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleChange}
                    rows={4}
                    placeholder={isDisenioJardines() 
                      ? "Cuéntenos sobre su proyecto de diseño de jardín..."
                      : "Describa el mantenimiento que necesita (frecuencia, tareas específicas, etc.)..."
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Campos específicos para Diseño de jardines */}
                {isDisenioJardines() && (
                  <>
                    {/* Sección de imágenes para diseño */}
                    <div className="space-y-6 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                      <h3 className="text-lg font-medium text-white flex items-center">
                        <Camera className="w-5 h-5 mr-2 text-green-400" />
                        Imágenes (opcional pero recomendado)
                      </h3>
                      <p className="text-sm text-gray-400">
                        Las imágenes nos ayudan a entender mejor sus necesidades y crear un diseño personalizado.
                      </p>

                      {/* Imágenes del jardín actual */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                          <Image className="w-4 h-4 inline mr-2 text-blue-400" />
                          Fotos de su jardín actual
                        </label>
                        
                        <div className="flex flex-wrap gap-3 mb-3">
                          {formData.imagenes_jardin.map((imagen, index) => (
                            <div key={imagen.id} className="relative bg-gray-700 p-3 rounded-lg" style={{ width: '180px' }}>
                              <div className="relative mb-2">
                                <div className="w-full h-32 rounded-lg overflow-hidden border border-gray-600">
                                  <img 
                                    src={imagen.preview} 
                                    alt={`Jardín ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeImage(imagen.id, 'jardin')}
                                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600 z-10"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                              <textarea
                                placeholder="Descripción (opcional)"
                                value={imagen.descripcion || ''}
                                onChange={(e) => handleImageDescriptionChange(imagen.id, 'jardin', e.target.value)}
                                maxLength={200}
                                rows={3}
                                className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                              />
                              <p className="text-xs text-gray-400 mt-1 text-right">
                                {(imagen.descripcion || '').length}/200
                              </p>
                            </div>
                          ))}
                          
                          <label className="w-20 h-20 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-500 transition-colors">
                            <Upload className="w-6 h-6 text-gray-400 mb-1" />
                            <span className="text-xs text-gray-400">Subir</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => handleImageUpload(e, 'jardin')}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Imágenes de ideas */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                          <Image className="w-4 h-4 inline mr-2 text-purple-400" />
                          Ideas de referencia
                        </label>
                        
                        <div className="flex flex-wrap gap-3 mb-3">
                          {formData.imagenes_ideas.map((imagen, index) => (
                            <div key={imagen.id} className="relative bg-gray-700 p-3 rounded-lg" style={{ width: '180px' }}>
                              <div className="relative mb-2">
                                <div className="w-full h-32 rounded-lg overflow-hidden border border-gray-600">
                                  <img 
                                    src={imagen.preview} 
                                    alt={`Idea ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeImage(imagen.id, 'ideas')}
                                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600 z-10"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                              <textarea
                                placeholder="Descripción (opcional)"
                                value={imagen.descripcion || ''}
                                onChange={(e) => handleImageDescriptionChange(imagen.id, 'ideas', e.target.value)}
                                maxLength={200}
                                rows={3}
                                className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                              />
                              <p className="text-xs text-gray-400 mt-1 text-right">
                                {(imagen.descripcion || '').length}/200
                              </p>
                            </div>
                          ))}
                          
                          <label className="w-20 h-20 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-500 transition-colors">
                            <Upload className="w-6 h-6 text-gray-400 mb-1" />
                            <span className="text-xs text-gray-400">Subir</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => handleImageUpload(e, 'ideas')}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Notas adicionales - común para ambos tipos */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Notas adicionales
                  </label>
                  <textarea
                    name="notas_adicionales"
                    value={formData.notas_adicionales}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Cualquier información adicional que considere relevante..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Dirección - al final del formulario */}
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
                    placeholder="Calle, número, ciudad..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Se ha cargado tu dirección registrada por defecto. Puedes modificarla si el servicio será en otra ubicación.
                  </p>
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
                    className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      formData.fecha_preferida && fechasBloqueadas.includes(formData.fecha_preferida) 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-600'
                    }`}
                  />
                  <p className="text-sm text-gray-400 mt-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Se asignarán empleados automáticamente al aceptar el diseño
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
                    <span className="text-gray-300">Tipo de servicio: </span>
                    <span className="text-white font-medium">
                      {getSelectedServiceType()?.nombre} {getSelectedServiceType()?.icon}
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

                {formData.notas_adicionales && (
                  <div className="flex items-start">
                    <FileText className="w-5 h-5 text-green-400 mr-3 mt-0.5" />
                    <div>
                      <span className="text-gray-300">Notas adicionales: </span>
                      <span className="text-white">{formData.notas_adicionales}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-green-400 mr-3" />
                  <div>
                    <span className="text-gray-300">Dirección: </span>
                    <span className="text-white">{formData.direccion_servicio}</span>
                  </div>
                </div>

                {/* Imágenes para diseño */}
                {isDisenioJardines() && (
                  <>
                    {(formData.imagenes_jardin.length > 0 || formData.imagenes_ideas.length > 0) && (
                      <div className="flex items-start">
                        <Camera className="w-5 h-5 text-green-400 mr-3 mt-0.5" />
                        <div>
                          <span className="text-gray-300">Imágenes: </span>
                          <span className="text-white">
                            {formData.imagenes_jardin.length} foto(s) del jardín, {formData.imagenes_ideas.length} idea(s) de referencia
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}

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
                      <span className="text-gray-300">Notas adicionales: </span>
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
                      Revisaremos tu solicitud y nos pondremos en contacto contigo dentro de las próximas 24 horas para confirmar los detalles y enviarte una propuesta personalizada.
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
