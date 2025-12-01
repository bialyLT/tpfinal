import React, { useState, useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import api from '../services/api';
import { addressService, serviciosService } from '../services';
import { success, error, handleApiError } from '../utils/notifications';
import { useAuth } from '../context/AuthContext';
import { handlePagarSena } from '../utils/pagoHelpers';
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
  X,
  Ruler,
  Palette,
  Hammer,
  DollarSign,
  Info,
  Zap,
  Shovel
} from 'lucide-react';

const SolicitarServicioPage = () => {
  const { user } = useAuth();
  const fpRef = useRef(null);
  const fpInstanceRef = useRef(null);
  const fpTimeRef = useRef(null);
  const fpTimeInstanceRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [serviciosDisponibles, setServiciosDisponibles] = useState([]);
  const [fechasBloqueadas, setFechasBloqueadas] = useState([]);
  const [formData, setFormData] = useState({
    servicio: '', // ID del servicio del catálogo
    descripcion: '',
    fecha_preferida: '',
    hora_preferida: '',
    direccion_servicio: '',
    localidad_id: '',
    notas_adicionales: '',
    imagenes_jardin: [],
    imagenes_ideas: [],
    // Nuevos campos
    tipo_servicio_solicitado: 'diseno_completo', // Default
    superficie_aproximada: '',
    objetivo_diseno: '',
    nivel_intervencion: '',
    presupuesto_aproximado: ''
  });
  const [referenceData, setReferenceData] = useState({ localidades: [] });
  const [addressSearch, setAddressSearch] = useState('');
  const [addressInfo, setAddressInfo] = useState(null);
  const [addressError, setAddressError] = useState('');
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [showManualLocalidad, setShowManualLocalidad] = useState(false);

  const selectedLocalidad = referenceData.localidades.find(
    (loc) => String(loc.id) === String(formData.localidad_id)
  );
  const userLocalidad = user?.persona?.localidad;
  const ciudadDisplay = addressInfo?.ciudad || selectedLocalidad?.nombre || userLocalidad?.nombre || '';
  const provinciaDisplay = addressInfo?.provincia || selectedLocalidad?.provincia || userLocalidad?.provincia || '';
  const paisDisplay = addressInfo?.pais || selectedLocalidad?.pais || userLocalidad?.pais || '';
  const cpDisplay = addressInfo?.codigo_postal || selectedLocalidad?.cp || userLocalidad?.cp || '';
  const hasAddressDetails = Boolean(ciudadDisplay || provinciaDisplay || paisDisplay || cpDisplay);
  const locationDetailsList = [
    ciudadDisplay && `Ciudad: ${ciudadDisplay}`,
    provinciaDisplay && `Provincia: ${provinciaDisplay}`,
    paisDisplay && `País: ${paisDisplay}`,
    cpDisplay && `CP: ${cpDisplay}`,
  ].filter(Boolean);
  const locationSummaryText = locationDetailsList.join(' • ');

  const steps = [
    { id: 1, title: 'Tipo de Servicio', icon: Settings },
    { id: 2, title: 'Detalles', icon: FileText },
    { id: 3, title: 'Cita de Revisión', icon: Calendar },
    { id: 4, title: 'Confirmación', icon: CheckCircle }
  ];

  // Opciones para selectores
  const OBJETIVO_OPCIONES = [
    { value: 'bajo_mantenimiento', label: 'Bajo Mantenimiento' },
    { value: 'mucho_color', label: 'Mucho Color' },
    { value: 'selvatico', label: 'Estilo Selvático' },
    { value: 'minimalista', label: 'Estilo Minimalista' },
    { value: 'mascotas', label: 'Espacio para Mascotas' },
    { value: 'ninos', label: 'Espacio para Niños' },
    { value: 'huerta', label: 'Huerta' },
    { value: 'otro', label: 'Otro' }
  ];

  const NIVEL_INTERVENCION_OPCIONES = [
    { value: 'remodelacion', label: 'Remodelación Parcial' },
    { value: 'desde_cero', label: 'Diseño Completo desde Cero' }
  ];

  const PRESUPUESTO_OPCIONES = [
    { value: 'bajo', label: 'Económico / Ajustado' },
    { value: 'medio', label: 'Intermedio / Flexible' },
    { value: 'alto', label: 'Premium / Sin Restricciones' }
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

    if (user) {
      setFormData(prev => ({
        ...prev,
        direccion_servicio: prev.direccion_servicio || user.cliente?.direccion_completa || '',
        localidad_id: prev.localidad_id || (user.persona?.localidad?.id ? String(user.persona.localidad.id) : '')
      }));
      setAddressSearch(prev => prev || user.cliente?.direccion_completa || '');
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

  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const response = await api.get('/reference-data/');
        setReferenceData(response.data);
      } catch (err) {
        console.error('Error al cargar localidades:', err);
      }
    };

    fetchReferenceData();
  }, []);

  // Initialize flatpickr
  useEffect(() => {
    // Only initialize if we are on step 3 (Cita de Revisión)
    if (currentStep !== 3) return;

    // Date Picker
    if (fpRef.current) {
      if (fpInstanceRef.current) {
        fpInstanceRef.current.destroy();
        fpInstanceRef.current = null;
      }

      const options = {
        enableTime: false,
        dateFormat: 'Y-m-d',
        minDate: 'today',
        disable: fechasBloqueadas || [],
        defaultDate: formData.fecha_preferida || null,
        onChange: (selectedDates, dateStr) => {
          setFormData(prev => ({ ...prev, fecha_preferida: dateStr }));
        }
      };
      
      options.onDayCreate = (...args) => {
        const dayElem = args[3];
        const dayObj = dayElem?.dateObj;
        if (!dayObj) return;
        const dayISO = dayObj.toISOString().split('T')[0];
        if (fechasBloqueadas?.includes(dayISO)) {
          dayElem.classList.add('blocked');
        }
      };

      fpInstanceRef.current = flatpickr(fpRef.current, options);
    }

    // Time Picker
    if (fpTimeRef.current) {
      if (fpTimeInstanceRef.current) {
        fpTimeInstanceRef.current.destroy();
        fpTimeInstanceRef.current = null;
      }

      const optionsTime = {
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        time_24hr: true,
        minuteIncrement: 15,
        defaultDate: formData.hora_preferida || null,
        minTime: "08:00",
        maxTime: "20:00",
        onChange: (selectedDates, dateStr) => {
          setFormData(prev => ({ ...prev, hora_preferida: dateStr }));
        }
      };

      fpTimeInstanceRef.current = flatpickr(fpTimeRef.current, optionsTime);
    }

    return () => {
      if (fpInstanceRef.current) {
        fpInstanceRef.current.destroy();
        fpInstanceRef.current = null;
      }
      if (fpTimeInstanceRef.current) {
        fpTimeInstanceRef.current.destroy();
        fpTimeInstanceRef.current = null;
      }
    };
  }, [currentStep, fechasBloqueadas, formData.fecha_preferida, formData.hora_preferida]);

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

    if (name === 'direccion_servicio') {
      setAddressSearch(value);
    }

    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAddressLookup = async () => {
    if (!addressSearch.trim()) {
      setAddressError('Ingresa una dirección completa para buscar');
      return;
    }

    setIsAddressLoading(true);
    setAddressError('');
    try {
      const data = await addressService.lookup(addressSearch.trim());
      setAddressInfo(data);
      setShowManualLocalidad(false);
      setAddressSearch(data.direccion_formateada || addressSearch.trim());
      setFormData(prev => ({
        ...prev,
        direccion_servicio: data.direccion_formateada || prev.direccion_servicio || addressSearch.trim(),
        localidad_id: data.localidad_id ? String(data.localidad_id) : prev.localidad_id,
      }));
    } catch (err) {
      console.error('Error al buscar dirección', err);
      setAddressInfo(null);
      setAddressError(err.response?.data?.error || 'No pudimos validar la dirección, intenta nuevamente.');
    } finally {
      setIsAddressLoading(false);
    }
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

  // Helpers para identificar servicios
  const getDisenoService = () => {
    return serviciosDisponibles.find(s => s.nombre.toLowerCase().includes('diseño'));
  };

  const getMantenimientoService = () => {
    return serviciosDisponibles.find(s =>
      s.nombre.toLowerCase().includes('mantenimiento') ||
      s.nombre.toLowerCase().includes('jardinería') ||
      s.nombre.toLowerCase().includes('poda')
    );
  };

  const isDisenoCompleto = () => {
    return formData.tipo_servicio_solicitado === 'diseno_completo';
  };

  const isConsultaExpress = () => {
    return formData.tipo_servicio_solicitado === 'consulta_express';
  };

  // Selección de servicio con auto-avance
  const handleSelectService = (tipo) => {
    let serviceId = '';

    if (tipo === 'diseno_completo' || tipo === 'consulta_express') {
      const disenoService = getDisenoService();
      if (!disenoService) {
        error('El servicio de Diseño no está disponible en este momento.');
        return;
      }
      serviceId = disenoService.id_servicio.toString();
    } else if (tipo === 'mantenimiento') {
      const mantService = getMantenimientoService();
      if (!mantService) {
        error('El servicio de Mantenimiento no está disponible en este momento.');
        return;
      }
      serviceId = mantService.id_servicio.toString();
    }

    setFormData(prev => ({
      ...prev,
      servicio: serviceId,
      tipo_servicio_solicitado: tipo
    }));

    // Auto-avance
    setCurrentStep(2);
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
        if (isDisenoCompleto()) {
          // Validaciones específicas para Diseño Completo
          if (!formData.objetivo_diseno) {
            error('Por favor selecciona un objetivo para el diseño');
            return false;
          }
          if (!formData.nivel_intervencion) {
            error('Por favor selecciona el nivel de intervención');
            return false;
          }
          if (!formData.presupuesto_aproximado) {
            error('Por favor selecciona un presupuesto aproximado');
            return false;
          }
          if (formData.imagenes_jardin.length === 0) {
            error('Para un diseño completo, necesitamos al menos una foto del jardín actual');
            return false;
          }
        } else {
          // Validación estándar para Mantenimiento o Consulta Express
          if (!formData.descripcion.trim()) {
            error('Por favor ingresa una descripción del servicio');
            return false;
          }
        }
        break;
      case 3:
        if (!formData.fecha_preferida) {
          error('Por favor selecciona una fecha');
          return false;
        }
        if (!formData.direccion_servicio.trim()) {
          error('Por favor ingresa la dirección del servicio');
          return false;
        }
        if (!formData.localidad_id) {
          error('Busca tu dirección o selecciona una localidad para continuar');
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
      // Crear FormData con TODOS los datos de la reserva (incluyendo imágenes)
      const formDataToSend = new FormData();
      formDataToSend.append('servicio', parseInt(formData.servicio));

      // Manejo de descripción y observaciones según el tipo
      let observacionesCompletas = '';

      if (isDisenoCompleto()) {
        observacionesCompletas = `SOLICITUD DE DISEÑO COMPLETO
Superficie: ${formData.superficie_aproximada || 'A medir en visita'} m2
Objetivo: ${OBJETIVO_OPCIONES.find(o => o.value === formData.objetivo_diseno)?.label}
Intervención: ${NIVEL_INTERVENCION_OPCIONES.find(o => o.value === formData.nivel_intervencion)?.label}
Presupuesto: ${PRESUPUESTO_OPCIONES.find(o => o.value === formData.presupuesto_aproximado)?.label}

Notas adicionales: ${formData.notas_adicionales || 'Ninguna'}`;

        formDataToSend.append('tipo_servicio_solicitado', 'diseno_completo');
        if (formData.superficie_aproximada) formDataToSend.append('superficie_aproximada', formData.superficie_aproximada);
        formDataToSend.append('objetivo_diseno', formData.objetivo_diseno);
        formDataToSend.append('nivel_intervencion', formData.nivel_intervencion);
        formDataToSend.append('presupuesto_aproximado', formData.presupuesto_aproximado);

      } else {
        // Consulta express o Mantenimiento
        observacionesCompletas = formData.notas_adicionales
          ? `${formData.descripcion}\n\nNotas adicionales: ${formData.notas_adicionales}`
          : formData.descripcion;

        if (isConsultaExpress()) {
          formDataToSend.append('tipo_servicio_solicitado', 'consulta_express');
        }
        // Para mantenimiento no enviamos tipo_servicio_solicitado específico (o podríamos agregar uno 'mantenimiento' si el backend lo soporta, pero por ahora null o default)
      }

      const ubicacionExtra = [
        locationSummaryText && `Ubicación detectada: ${locationSummaryText}`,
        formData.localidad_id && `Localidad asociada (ID): ${formData.localidad_id}`,
      ].filter(Boolean).join('\n');

      if (ubicacionExtra) {
        observacionesCompletas = observacionesCompletas
          ? `${observacionesCompletas}\n\n${ubicacionExtra}`
          : ubicacionExtra;
      }

      formDataToSend.append('observaciones', observacionesCompletas);
      
      // Combinar fecha y hora si existe hora preferida
      let fechaReserva = formData.fecha_preferida;
      if (formData.hora_preferida) {
        fechaReserva = `${formData.fecha_preferida}T${formData.hora_preferida}:00`;
      }
      formDataToSend.append('fecha_reserva', fechaReserva);
      
      formDataToSend.append('direccion', formData.direccion_servicio);

      // Agregar imágenes del jardín
      formData.imagenes_jardin.forEach((img) => {
        formDataToSend.append('imagenes_jardin', img.file);
      });

      // Agregar imágenes de ideas
      formData.imagenes_ideas.forEach((img) => {
        formDataToSend.append('imagenes_ideas', img.file);
      });

      // Agregar descripciones de las imágenes
      const descripcionesJardin = formData.imagenes_jardin.map(img => img.descripcion || '');
      const descripcionesIdeas = formData.imagenes_ideas.map(img => img.descripcion || '');

      if (descripcionesJardin.length > 0) {
        formDataToSend.append('descripciones_jardin', JSON.stringify(descripcionesJardin));
      }

      if (descripcionesIdeas.length > 0) {
        formDataToSend.append('descripciones_ideas', JSON.stringify(descripcionesIdeas));
      }

      success('Creando reserva...');

      // PASO 1: Crear la reserva
      const reservaResponse = await serviciosService.solicitarServicio(formDataToSend);
      const reservaId = reservaResponse.reserva?.id_reserva || reservaResponse.id_reserva;

      if (!reservaId) {
        throw new Error('No se recibió el ID de la reserva');
      }

      success('Reserva creada exitosamente. Redirigiendo al pago...');

      // Limpiar URLs de preview
      formData.imagenes_jardin.forEach(img => {
        if (img.preview) URL.revokeObjectURL(img.preview);
      });
      formData.imagenes_ideas.forEach(img => {
        if (img.preview) URL.revokeObjectURL(img.preview);
      });

      // PASO 2: Redirigir al pago de seña
      await handlePagarSena(reservaId, setSubmitting);

    } catch (err) {
      console.error('❌ Error al crear reserva:', err);
      handleApiError(err, 'No se pudo crear la reserva');
      setSubmitting(false);
    }
  };

  const getSelectedServiceName = () => {
    if (isDisenoCompleto()) return "Diseño Completo de Jardín";
    if (isConsultaExpress()) return "Consulta Express";
    if (formData.tipo_servicio_solicitado === 'mantenimiento') return "Mantenimiento de Jardín";

    const s = serviciosDisponibles.find(s => s.id_servicio === parseInt(formData.servicio));
    return s ? s.nombre : 'Servicio';
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
                      className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${isCompleted
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
                      className={`flex-1 h-0.5 mx-4 ${currentStep > step.id ? 'bg-green-600' : 'bg-gray-700'
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
          {/* Step 1: Service Type Selection */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">¿Qué tipo de servicio necesita?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Opción 1: Diseño Completo */}
                <div
                  className="p-6 border-2 border-gray-600 rounded-lg cursor-pointer transition-all hover:scale-105 hover:border-green-500 hover:bg-gray-700 group"
                  onClick={() => handleSelectService('diseno_completo')}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                      <Palette className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Diseño Completo</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Transformación total de su espacio. Incluye visita técnica, planos detallados y presupuesto integral.
                    </p>
                    <ul className="text-xs text-gray-500 text-left space-y-1 list-disc list-inside">
                      <li>Relevamiento en terreno</li>
                      <li>Entrevista de estilo</li>
                      <li>Proyecto personalizado</li>
                    </ul>
                  </div>
                </div>

                {/* Opción 2: Consulta Express */}
                <div
                  className="p-6 border-2 border-gray-600 rounded-lg cursor-pointer transition-all hover:scale-105 hover:border-blue-500 hover:bg-gray-700 group"
                  onClick={() => handleSelectService('consulta_express')}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                      <Zap className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Consulta Express</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Asesoramiento rápido e ideas preliminares. Ideal para dudas puntuales o pequeños cambios.
                    </p>
                    <ul className="text-xs text-gray-500 text-left space-y-1 list-disc list-inside">
                      <li>Sin visita obligatoria</li>
                      <li>Ideas rápidas</li>
                      <li>Presupuesto estimativo</li>
                    </ul>
                  </div>
                </div>

                {/* Opción 3: Mantenimiento */}
                <div
                  className="p-6 border-2 border-gray-600 rounded-lg cursor-pointer transition-all hover:scale-105 hover:border-orange-500 hover:bg-gray-700 group"
                  onClick={() => handleSelectService('mantenimiento')}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto bg-orange-500/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-orange-500/20 transition-colors">
                      <Shovel className="w-8 h-8 text-orange-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Mantenimiento</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Cuidado profesional para su jardín. Poda, corte de césped, limpieza y fertilización.
                    </p>
                    <ul className="text-xs text-gray-500 text-left space-y-1 list-disc list-inside">
                      <li>Servicio periódico o puntual</li>
                      <li>Herramientas propias</li>
                      <li>Personal calificado</li>
                    </ul>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">
                Detalles de la solicitud: <span className="text-green-400">{getSelectedServiceName()}</span>
              </h2>

              <div className="space-y-6">

                {/* FORMULARIO PARA DISEÑO COMPLETO */}
                {isDisenoCompleto() ? (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Superficie */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <Ruler className="w-4 h-4 inline mr-2" />
                          Superficie aproximada (m²)
                        </label>
                        <input
                          type="number"
                          name="superficie_aproximada"
                          value={formData.superficie_aproximada}
                          onChange={handleChange}
                          placeholder="Ej: 50 (Si no sabe, deje vacío)"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">Si no conoce la medida, lo mediremos en la visita técnica.</p>
                      </div>

                      {/* Objetivo */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <Palette className="w-4 h-4 inline mr-2" />
                          Objetivo del diseño *
                        </label>
                        <select
                          name="objetivo_diseno"
                          value={formData.objetivo_diseno}
                          onChange={handleChange}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Seleccione un objetivo...</option>
                          {OBJETIVO_OPCIONES.map(op => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Nivel de Intervención */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <Hammer className="w-4 h-4 inline mr-2" />
                          Nivel de intervención *
                        </label>
                        <select
                          name="nivel_intervencion"
                          value={formData.nivel_intervencion}
                          onChange={handleChange}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Seleccione nivel...</option>
                          {NIVEL_INTERVENCION_OPCIONES.map(op => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Presupuesto */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <DollarSign className="w-4 h-4 inline mr-2" />
                          Presupuesto aproximado *
                        </label>
                        <select
                          name="presupuesto_aproximado"
                          value={formData.presupuesto_aproximado}
                          onChange={handleChange}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Seleccione rango...</option>
                          {PRESUPUESTO_OPCIONES.map(op => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* FORMULARIO ESTÁNDAR / CONSULTA EXPRESS / MANTENIMIENTO */
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
                      placeholder={isConsultaExpress()
                        ? "Cuéntenos brevemente su idea o consulta..."
                        : "Describa el mantenimiento que necesita (poda, corte de pasto, limpieza, etc.)..."
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                )}

                {/* Dirección */}
                <div className="space-y-4 p-4 bg-gray-800/40 border border-gray-700 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      Dirección del servicio *
                    </label>
                    <p className="text-xs text-gray-400">
                      Busca la dirección completa donde se realizará el servicio
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 mt-2">
                      <input
                        type="text"
                        value={addressSearch}
                        onChange={(e) => setAddressSearch(e.target.value)}
                        placeholder="Ej: Av. Siempre Viva 742, Buenos Aires"
                        className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddressLookup}
                        disabled={isAddressLoading}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {isAddressLoading ? 'Buscando...' : 'Buscar dirección'}
                      </button>
                    </div>
                    {addressError && <p className="text-sm text-red-400 mt-2">{addressError}</p>}
                    {addressInfo?.direccion_formateada && (
                      <p className="text-sm text-emerald-400 mt-2">
                        Dirección sugerida: {addressInfo.direccion_formateada}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Dirección confirmada para la visita *
                    </label>
                    <input
                      type="text"
                      name="direccion_servicio"
                      value={formData.direccion_servicio}
                      onChange={handleChange}
                      placeholder="Confirma o ajusta la dirección detectada"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Se precarga tu domicilio registrado, pero puedes indicar una ubicación distinta para esta solicitud.
                    </p>
                  </div>

                  {!isDisenoCompleto() && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Ciudad</label>
                          <input
                            type="text"
                            value={ciudadDisplay}
                            readOnly
                            placeholder="-"
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Provincia</label>
                          <input
                            type="text"
                            value={provinciaDisplay}
                            readOnly
                            placeholder="-"
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">País</label>
                          <input
                            type="text"
                            value={paisDisplay}
                            readOnly
                            placeholder="-"
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Código Postal</label>
                          <input
                            type="text"
                            value={cpDisplay}
                            readOnly
                            placeholder="-"
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => setShowManualLocalidad(!showManualLocalidad)}
                          className="text-sm text-emerald-400 hover:text-emerald-300 underline"
                        >
                          {showManualLocalidad ? 'Ocultar selección manual de localidad' : 'Seleccionar localidad manualmente'}
                        </button>
                        {showManualLocalidad && (
                          referenceData.localidades.length > 0 ? (
                            <select
                              name="localidad_id"
                              value={formData.localidad_id}
                              onChange={handleChange}
                              className="mt-2 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                              <option value="">Selecciona una localidad...</option>
                              {referenceData.localidades.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                  {loc.nombre} - {loc.provincia} ({loc.pais})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <p className="mt-2 text-sm text-gray-400">Cargando listado de localidades...</p>
                          )
                        )}
                        {!showManualLocalidad && !formData.localidad_id && (
                          <p className="text-xs text-yellow-400 mt-2">
                            Si la búsqueda no detecta tu localidad, selecciónala manualmente para continuar.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Sección de imágenes */}
                <div className="space-y-6 p-4 bg-gray-800/50 rounded-lg border border-gray-600 mt-6">
                  <h3 className="text-lg font-medium text-white flex items-center">
                    <Camera className="w-5 h-5 mr-2 text-green-400" />
                    Imágenes {isDisenoCompleto() ? '(Requerido: Jardín Actual)' : '(Opcional)'}
                  </h3>

                  {/* Imágenes del jardín actual */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      <Image className="w-4 h-4 inline mr-2 text-blue-400" />
                      Fotos de su jardín actual {isDisenoCompleto() && <span className="text-red-400">*</span>}
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

                  {/* Imágenes de ideas (Solo para diseño) */}
                  {(isDisenoCompleto() || isConsultaExpress()) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        <Image className="w-4 h-4 inline mr-2 text-purple-400" />
                        Ideas de referencia (Opcional)
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
                  )}
                </div>

                {/* Notas adicionales */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Notas adicionales / Comentarios libres
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


              </div>
            </div>
          )}

          {/* Step 3: Scheduling */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Programación</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      {isDisenoCompleto() ? 'Fecha preferida para Cita de Revisión' : 'Fecha preferida del servicio'}
                    </label>
                    <div className="bg-gray-900 p-2 rounded-md border border-gray-700">
                      <div className="relative">
                        <input
                          ref={fpRef}
                          type="text"
                          readOnly
                          placeholder="Seleccionar fecha"
                          className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white focus:outline-none focus:ring-2 ${formData.fecha_preferida && fechasBloqueadas.includes(formData.fecha_preferida) ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-green-500'}`}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Clock className="w-4 h-4 inline mr-2" />
                      Hora preferida
                    </label>
                    <div className="bg-gray-900 p-2 rounded-md border border-gray-700">
                      <div className="relative">
                        <input
                          ref={fpTimeRef}
                          type="text"
                          readOnly
                          placeholder="Seleccionar hora"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-400 mt-2">
                  <Info className="w-4 h-4 inline mr-1" />
                  {isDisenoCompleto()
                    ? 'Esta fecha es para la visita técnica inicial. El trabajo comenzará una vez aprobado el diseño.'
                    : 'Sujeto a disponibilidad de los empleados.'}
                </p>
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
                      {getSelectedServiceName()}
                    </span>
                  </div>
                </div>

                {isDisenoCompleto() ? (
                  <>
                    <div className="flex items-start">
                      <Info className="w-5 h-5 text-green-400 mr-3 mt-0.5" />
                      <div>
                        <span className="text-gray-300">Detalles del Diseño: </span>
                        <ul className="text-white list-disc list-inside mt-1">
                          <li>Superficie: {formData.superficie_aproximada || 'A medir'} m²</li>
                          <li>Objetivo: {OBJETIVO_OPCIONES.find(o => o.value === formData.objetivo_diseno)?.label}</li>
                          <li>Intervención: {NIVEL_INTERVENCION_OPCIONES.find(o => o.value === formData.nivel_intervencion)?.label}</li>
                          <li>Presupuesto: {PRESUPUESTO_OPCIONES.find(o => o.value === formData.presupuesto_aproximado)?.label}</li>
                        </ul>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start">
                    <FileText className="w-5 h-5 text-green-400 mr-3 mt-0.5" />
                    <div>
                      <span className="text-gray-300">Descripción: </span>
                      <span className="text-white">{formData.descripcion}</span>
                    </div>
                  </div>
                )}

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
                    {locationSummaryText && (
                      <p className="text-sm text-gray-400">{locationSummaryText}</p>
                    )}
                  </div>
                </div>

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

                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-green-400 mr-3" />
                  <div>
                    <span className="text-gray-300">{isDisenoCompleto() ? 'Fecha de Revisión:' : 'Fecha del Servicio:'} </span>
                    <span className="text-white">{formData.fecha_preferida}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-blue-400 mr-3" />
                  <div>
                    <h4 className="text-blue-300 font-medium">¿Qué sigue?</h4>
                    <p className="text-sm text-gray-300 mt-1">
                      Se le responderá su solicitud en 24 horas hábiles después de realizado el pago.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          {currentStep > 1 && (
            <div className="flex justify-between mt-8">
              <button
                onClick={handlePrevious}
                className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500"
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
                  className={`px-6 py-2 rounded-lg transition-colors flex items-center ${submitting
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
                      <DollarSign className="w-4 h-4 mr-2" />
                      Pagar seña
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SolicitarServicioPage;
