import api from './api';

// Auth Services
export const authService = {
  login: async (credentials) => {
    // SimplejWT usa /token/ para login y espera username/password
    // Pero nosotros enviamos email, así que el backend debe aceptar email
    const response = await api.post('/token/', {
      username: credentials.email, // Enviar email como username
      password: credentials.password
    });
    return response.data;
  },
  
  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await api.post('/token/blacklist/', { refresh: refreshToken });
      } catch (error) {
        console.error('Error al hacer blacklist del token:', error);
      }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
  
  register: async (userData) => {
    const response = await api.post('/users/register/', userData);
    return response.data;
  },
  
  getCurrentUser: async () => {
    // Obtener el usuario actual usando el token JWT
    const response = await api.get('/users/me/');
    return response.data;
  },
  
  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await api.post('/token/refresh/', { refresh: refreshToken });
    return response.data;
  }
};

export const  addressService = {
  lookup: async (addressText) => {
    const response = await api.post('/users/address/lookup/', { address: addressText });
    return response.data;
  },
  suggest: async (query, limit = 5) => {
    const response = await api.get('/users/address/lookup/', {
      params: { q: query, limit }
    });
    return response.data;
  },
};

// Productos Services
export const productosService = {
  getAll: async (params = {}) => {
    const response = await api.get('/productos/productos/', { params });
    return response.data;
  },
  
  // Alias para compatibilidad
  getProductos: async (params = {}) => {
    const response = await api.get('/productos/productos/', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/productos/productos/${id}/`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/productos/productos/', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.put(`/productos/productos/${id}/`, data);
    return response.data;
  },
  
  delete: async (id) => {
    await api.delete(`/productos/productos/${id}/`);
  },
  
  getCategorias: async () => {
    const response = await api.get('/productos/categorias/');
    return response.data;
  },
  
  getMarcas: async () => {
    const response = await api.get('/productos/marcas/');
    return response.data;
  },
  
  getStock: async (productoId) => {
    const response = await api.get(`/productos/productos/${productoId}/stock/`);
    return response.data;
  }
};

// Servicios Services
export const serviciosService = {
  getSolicitudes: async (params = {}) => {
    // Las solicitudes son servicios con estado 'solicitud'
    const response = await api.get('/servicios/servicios/', { 
      params: { ...params, estado: 'solicitud' } 
    });
    return response.data;
  },
  
  createSolicitud: async (data) => {
    // Crear servicio es lo mismo que crear solicitud
    const response = await api.post('/servicios/servicios/', data);
    return response.data;
  },
  
  getServicios: async (params = {}) => {
    // Los servicios son aquellos que no están en estado 'solicitado'
    const response = await api.get('/servicios/servicios/', { params });
    return response.data;
  },
  
  // Reservas
  createReserva: async (data) => {
    const response = await api.post('/servicios/reservas/', data);
    return response.data;
  },

  // Solicitar servicio (crear reserva con FormData para imágenes)
  solicitarServicio: async (formData) => {
    const response = await api.post('/servicios/reservas/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getReservas: async (params = {}) => {
    const response = await api.get('/servicios/reservas/', { params });
    return response.data;
  },

  // Jardín relacionado a reserva
  getJardinByReserva: async (reservaId) => {
    const response = await api.get(`/servicios/reservas/${reservaId}/jardin/`);
    return response.data;
  },

  upsertJardin: async (reservaId, data) => {
    // If there are per-zone images attached, construct a FormData
    if (data && data.zonas && data.zonas.some(z => z.imagenes && z.imagenes.length > 0)) {
      const formData = new FormData();
      // Non-file fields
      Object.keys(data).forEach((key) => {
        if (key !== 'zonas') {
          formData.append(key, data[key]);
        }
      });
      // Append zones content as JSON string
      formData.append('zonas', JSON.stringify(data.zonas.map(z => ({ nombre: z.nombre, ancho: z.ancho, largo: z.largo, forma: z.forma, notas: z.notas }))));
      // Append per-zone files and descriptions
      data.zonas.forEach((z, idx) => {
        if (z.imagenes && z.imagenes.length > 0) {
          z.imagenes.forEach(imgObj => {
            formData.append(`imagenes_zona_${idx}`, imgObj.file);
          });
          // Descriptions for the zone images (optional)
          const descripciones = z.imagenes.map(imgObj => imgObj.descripcion || '');
          formData.append(`descripciones_zona_${idx}`, JSON.stringify(descripciones));
        }
      });
      const response = await api.post(`/servicios/reservas/${reservaId}/jardin/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    }
    const response = await api.post(`/servicios/reservas/${reservaId}/jardin/`, data);
    return response.data;
  },

  getFormasTerreno: async () => {
    const response = await api.get('/servicios/formas-terreno/');
    return response.data;
  },

  updateReserva: async (id, data) => {
    const response = await api.patch(`/servicios/reservas/${id}/`, data);
    return response.data;
  },

  finalizarServicio: async (id) => {
    const response = await api.post(`/servicios/reservas/${id}/finalizar-servicio/`);
    return response.data;
  },
  
  iniciarServicio: async (id) => {
    const response = await api.post(`/servicios/servicios/${id}/iniciar_servicio/`);
    return response.data;
  },
  
  completarServicio: async (id) => {
    const response = await api.post(`/servicios/servicios/${id}/completar_servicio/`);
    return response.data;
  },

  getServicioById: async (id) => {
    const response = await api.get(`/servicios/servicios/${id}/`);
    return response.data;
  },

  getReservaById: async (id) => {
    const response = await api.get(`/servicios/reservas/${id}/`);
    return response.data;
  },
  
  // MercadoPago - Crear preferencias
  crearPreferenciaSena: async (reservaId) => {
    const response = await api.post(`/mercadopago/reservas/${reservaId}/crear-pago-sena/`);
    return response.data;
  },
  
  crearPreferenciaFinal: async (reservaId) => {
    const response = await api.post(`/mercadopago/reservas/${reservaId}/crear-pago-final/`);
    return response.data;
  },
  
  // MercadoPago - Confirmar pagos
  confirmarPagoSena: async (reservaId, paymentData) => {
    const response = await api.post(`/mercadopago/reservas/${reservaId}/confirmar-pago-sena/`, paymentData);
    return response.data;
  },
  
  confirmarPagoFinal: async (reservaId, paymentData) => {
    const response = await api.post(`/mercadopago/reservas/${reservaId}/confirmar-pago-final/`, paymentData);
    return response.data;
  },

  updateServicio: async (id, data) => {
    const response = await api.put(`/servicios/servicios/${id}/`, data);
    return response.data;
  },

  crearDisenoCompleto: async (formData) => {
    const response = await api.post(`/servicios/disenos/crear-completo/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getDisenos: async (params = {}) => {
    const response = await api.get('/servicios/disenos/', { params });
    return response.data;
  },

  getDiseno: async (id) => {
    const response = await api.get(`/servicios/disenos/${id}/`);
    return response.data;
  },

  getDisenoById: async (id) => {
    const response = await api.get(`/servicios/disenos/${id}/`);
    return response.data;
  },

  updateDiseno: async (id, formData) => {
    const response = await api.put(`/servicios/disenos/${id}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  presentarDiseno: async (id) => {
    const response = await api.post(`/servicios/disenos/${id}/presentar/`);
    return response.data;
  },

  aceptarDiseno: async (id, observaciones = null) => {
    const response = await api.post(`/servicios/disenos/${id}/aceptar/`, { observaciones });
    return response.data;
  },

  rechazarDiseno: async (id, observaciones = null) => {
    const response = await api.post(`/servicios/disenos/${id}/rechazar/`, { observaciones });
    return response.data;
  },

  aceptarDisenoCliente: async (id, data = {}) => {
    const response = await api.post(`/servicios/disenos/${id}/aceptar_cliente/`, data);
    return response.data;
  },

  rechazarDisenoCliente: async (id, feedbackOrData) => {
    // feedbackOrData may be either a string or an object with { feedback, cancelar_servicio }
    const payload = typeof feedbackOrData === 'string' ? { feedback: feedbackOrData } : feedbackOrData || {};
    const response = await api.post(`/servicios/disenos/${id}/rechazar_cliente/`, payload);
    return response.data;
  },

  getEmpleadosDisponibles: async (fecha) => {
    const response = await api.get('/servicios/reservas/empleados-disponibles/', { 
      params: { fecha } 
    });
    return response.data;
  },

  getFechasDisponibles: async (fecha_inicio, fecha_fin = null) => {
    const params = { fecha_inicio };
    if (fecha_fin) {
      params.fecha_fin = fecha_fin;
    }
    const response = await api.get('/servicios/reservas/fechas-disponibles/', { params });
    return response.data;
  },

  createServicio: async (data) => {
    const formData = new FormData();
    
    // Agregar datos básicos
    Object.keys(data).forEach(key => {
      if (key !== 'imagenes_jardin' && key !== 'imagenes_ideas') {
        formData.append(key, data[key]);
      }
    });
    
    // Agregar imágenes de jardín
    if (data.imagenes_jardin) {
      data.imagenes_jardin.forEach((imagen) => {
        formData.append('imagenes_jardin', imagen);
      });
    }
    
    // Agregar imágenes de ideas
    if (data.imagenes_ideas) {
      data.imagenes_ideas.forEach((imagen) => {
        formData.append('imagenes_ideas', imagen);
      });
    }
    
    const response = await api.post('/servicios/servicios/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

// Encuestas Services
export const encuestasService = {
  getEncuestas: async (params = {}) => {
    const response = await api.get('/encuestas/encuestas/', { params });
    return response.data;
  },
  
  
  completarEncuesta: async (id, respuestas) => {
    const response = await api.post(`/encuestas/encuestas/${id}/completar_encuesta/`, {
      respuestas
    });
    return response.data;
  },
  
  enviarEncuesta: async (id) => {
    const response = await api.post(`/encuestas/encuestas/${id}/enviar_encuesta/`);
    return response.data;
  },

  getImpactoRespuestasEmpleado: async (params = {}) => {
    const response = await api.get('/encuestas/empleados/impacto-respuestas/', { params });
    return response.data;
  }
};

// ⚠️ ADVERTENCIA: Los siguientes endpoints NO EXISTEN en el backend actual
// Este servicio está aquí solo para mantener compatibilidad con EmpleadosPage
// Users/Empleados Services
export const usersService = {
  getEmpleados: async (params = {}) => {
    const response = await api.get('/users/empleados/', { params });
    return response.data;
  },

  createEmpleado: async (data) => {
    const response = await api.post('/users/empleados/', data);
    return response.data;
  },

  updateEmpleado: async (id, data) => {
    const response = await api.put(`/users/empleados/${id}/`, data);
    return response.data;
  },
  
  deleteEmpleado: async (id) => {
    const response = await api.delete(`/users/empleados/${id}/`);
    return response.data;
  },

  activarEmpleado: async (id) => {
    const response = await api.post(`/users/empleados/${id}/activar/`);
    return response.data;
  },

  resetearPassword: async (id) => {
    const response = await api.post(`/users/empleados/${id}/resetear_password/`);
    return response.data;
  }
};


// Clientes Services (usar este en lugar de usersService para clientes)
export const clientesService = {
  getAll: async (params = {}) => {
    const response = await api.get('/users/clientes/', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/users/clientes/${id}/`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/users/clientes/', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.put(`/users/clientes/${id}/`, data);
    return response.data;
  },
  
  delete: async (id) => {
    await api.delete(`/users/clientes/${id}/`);
  }
};

// Proveedores Services
export const proveedoresService = {
  getAll: async (params = {}) => {
    const response = await api.get('/users/proveedores/', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/users/proveedores/${id}/`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/users/proveedores/', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.put(`/users/proveedores/${id}/`, data);
    return response.data;
  },
  
  delete: async (id) => {
    await api.delete(`/users/proveedores/${id}/`);
  }
};

// Weather Services
export const weatherService = {
  getPendingAlerts: async () => {
    const response = await api.get('/weather/alerts/pending/');
    return response.data;
  },

  simulateRainAlert: async (payload) => {
    const response = await api.post('/weather/simulate/', payload);
    return response.data;
  },

  checkForecast: async (payload) => {
    const response = await api.post('/weather/check/', payload);
    return response.data;
  },

  applyReprogramacion: async (reservaId, data) => {
    const response = await api.post(`/servicios/reservas/${reservaId}/reprogramar-por-clima/`, data);
    return response.data;
  },

  dismissAlert: async (alertId, data = {}) => {
    const response = await api.post(`/weather/alerts/${alertId}/dismiss/`, data);
    return response.data;
  },

  getReservationForecastSummary: async (params = {}) => {
    const response = await api.get('/weather/reservas/forecast-summary/', { params });
    return response.data;
  }
};

// Auditoría Services
export const auditService = {
  listLogs: async (params = {}) => {
    const response = await api.get('/audit/logs/', { params });
    return response.data;
  },
};

// Categorías Services
export const categoriasService = {
  getAll: async (params = {}) => {
    const response = await api.get('/productos/categorias/', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/productos/categorias/${id}/`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/productos/categorias/', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.put(`/productos/categorias/${id}/`, data);
    return response.data;
  },
  
  delete: async (id) => {
    await api.delete(`/productos/categorias/${id}/`);
  }
};

// Marcas Services
export const marcasService = {
  getAll: async (params = {}) => {
    const response = await api.get('/productos/marcas/', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/productos/marcas/${id}/`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/productos/marcas/', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.put(`/productos/marcas/${id}/`, data);
    return response.data;
  },
  
  delete: async (id) => {
    await api.delete(`/productos/marcas/${id}/`);
  }
};

// Especies Services
export const especiesService = {
  getAll: async (params = {}) => {
    const response = await api.get('/productos/especies/', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/productos/especies/${id}/`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/productos/especies/', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/productos/especies/${id}/`, data);
    return response.data;
  },

  delete: async (id) => {
    await api.delete(`/productos/especies/${id}/`);
  },
};

// Tareas Services
export const tareasService = {
  getAll: async (params = {}) => {
    const response = await api.get('/productos/tareas/', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/productos/tareas/${id}/`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/productos/tareas/', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/productos/tareas/${id}/`, data);
    return response.data;
  },

  delete: async (id) => {
    await api.delete(`/productos/tareas/${id}/`);
  },
};

// Compras Services
export const comprasService = {
  getAll: async (params = {}) => {
    const response = await api.get('/ventas/compras/', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/ventas/compras/${id}/`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/ventas/compras/', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.put(`/ventas/compras/${id}/`, data);
    return response.data;
  },
  
  delete: async (id) => {
    await api.delete(`/ventas/compras/${id}/`);
  }
};

// Detalles de Compra Services
export const detallesCompraService = {
  getAll: async (params = {}) => {
    const response = await api.get('/ventas/detalles-compra/', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/ventas/detalles-compra/${id}/`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/ventas/detalles-compra/', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.put(`/ventas/detalles-compra/${id}/`, data);
    return response.data;
  },
  
  delete: async (id) => {
    await api.delete(`/ventas/detalles-compra/${id}/`);
  }
};

// Personas Services (necesario para crear proveedores)
export const personasService = {
  getAll: async (params = {}) => {
    const response = await api.get('/users/personas/', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/users/personas/${id}/`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/users/personas/', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.put(`/users/personas/${id}/`, data);
    return response.data;
  },
  
  delete: async (id) => {
    await api.delete(`/users/personas/${id}/`);
  }
};

// Géneros Services (necesario para crear personas)
export const generosService = {
  getAll: async () => {
    const response = await api.get('/users/generos/');
    return response.data;
  }
};

// Tipos de Documento Services (necesario para crear personas)
export const tiposDocumentoService = {
  getAll: async () => {
    const response = await api.get('/users/tipos-documento/');
    return response.data;
  }
};

// Localidades Services (necesario para crear personas)
export const localidadesService = {
  getAll: async (params = {}) => {
    const response = await api.get('/users/localidades/', { params });
    return response.data;
  }
};

// Admin Services
export const adminService = {
  fetchStats: async () => {
    const response = await api.get('/admin/stats/');
    return response.data;
  },

  fetchCurrentTemperature: async () => {
    const response = await api.get('/weather/current-temperature/');
    return response.data;
  }
};
