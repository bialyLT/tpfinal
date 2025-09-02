import React, { useState, useEffect } from 'react';
import { serviciosService } from '../services';
import { toast } from 'react-hot-toast';
import Loading from '../components/Loading';

const SolicitarServicioPage = () => {
  const [tiposServicio, setTiposServicio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    tipo_servicio: '',
    descripcion: '',
    fecha_preferida: '',
    direccion_servicio: '',
    notas_adicionales: ''
  });

  useEffect(() => {
    fetchTiposServicio();
  }, []);

  const fetchTiposServicio = async () => {
    try {
      setLoading(true);
      const data = await serviciosService.getTiposServicio();
      setTiposServicio(data);
    } catch (error) {
      toast.error('Error al cargar los tipos de servicio');
      console.error('Error fetching tipos servicio:', error);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await serviciosService.createSolicitud(formData);
      toast.success('Solicitud de servicio enviada correctamente');
      // Reset form
      setFormData({
        tipo_servicio: '',
        descripcion: '',
        fecha_preferida: '',
        direccion_servicio: '',
        notas_adicionales: ''
      });
    } catch (error) {
      toast.error('Error al enviar la solicitud');
      console.error('Error submitting solicitud:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTipo = tiposServicio.find(tipo => tipo.id.toString() === formData.tipo_servicio);

  if (loading) {
    return <Loading message="Cargando formulario..." />;
  }

  return (
    <div className="min-h-screen bg-base-200 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Solicitar Servicio</h1>
          <p className="text-gray-600">Completa el formulario para solicitar un servicio de jardinería</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario */}
          <div className="lg:col-span-2">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-xl mb-6">Detalles del Servicio</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Tipo de Servicio *</span>
                    </label>
                    <select
                      name="tipo_servicio"
                      value={formData.tipo_servicio}
                      onChange={handleChange}
                      className="select select-bordered w-full"
                      required
                    >
                      <option value="">Selecciona un tipo de servicio</option>
                      {tiposServicio.map(tipo => (
                        <option key={tipo.id} value={tipo.id}>
                          {tipo.nombre} - ${tipo.precio_base}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Descripción del Trabajo *</span>
                    </label>
                    <textarea
                      name="descripcion"
                      value={formData.descripcion}
                      onChange={handleChange}
                      placeholder="Describe detalladamente el trabajo que necesitas..."
                      className="textarea textarea-bordered w-full h-32"
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Fecha Preferida</span>
                    </label>
                    <input
                      type="date"
                      name="fecha_preferida"
                      value={formData.fecha_preferida}
                      onChange={handleChange}
                      className="input input-bordered w-full"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Dirección del Servicio *</span>
                    </label>
                    <textarea
                      name="direccion_servicio"
                      value={formData.direccion_servicio}
                      onChange={handleChange}
                      placeholder="Dirección completa donde se realizará el servicio..."
                      className="textarea textarea-bordered w-full"
                      rows="3"
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Notas Adicionales</span>
                    </label>
                    <textarea
                      name="notas_adicionales"
                      value={formData.notas_adicionales}
                      onChange={handleChange}
                      placeholder="Información adicional, accesos especiales, mascotas, etc..."
                      className="textarea textarea-bordered w-full"
                      rows="3"
                    />
                  </div>

                  <div className="form-control mt-8">
                    <button 
                      type="submit" 
                      className={`btn btn-primary btn-lg w-full ${submitting ? 'loading' : ''}`}
                      disabled={submitting}
                    >
                      {submitting ? 'Enviando solicitud...' : 'Enviar Solicitud'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Sidebar con información */}
          <div className="space-y-6">
            {/* Información del servicio seleccionado */}
            {selectedTipo && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title text-lg">Servicio Seleccionado</h3>
                  <div className="space-y-3">
                    <h4 className="font-bold text-primary">{selectedTipo.nombre}</h4>
                    <p className="text-gray-600">{selectedTipo.descripcion}</p>
                    
                    <div className="divider"></div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500">Precio base:</span>
                      <span className="font-bold text-primary">${selectedTipo.precio_base}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500">Duración estimada:</span>
                      <span className="font-bold">{selectedTipo.duracion_estimada}h</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Información importante */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg">Información Importante</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-info mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p>Te contactaremos en 24-48 horas para confirmar los detalles.</p>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-success mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <p>El precio final puede variar según la complejidad del trabajo.</p>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-warning mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p>Asegúrate de proporcionar acceso fácil al área de trabajo.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contacto */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg">¿Necesitas Ayuda?</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Si tienes dudas sobre qué servicio necesitas, contáctanos.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    <span>+54 11 1234-5678</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    <span>info@eleden.com</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolicitarServicioPage;
