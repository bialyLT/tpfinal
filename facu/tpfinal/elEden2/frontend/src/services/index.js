import api from './api';

// Auth Services
export const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login/', credentials);
    return response.data;
  },
  
  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await api.post('/auth/logout/', { refresh: refreshToken });
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
  
  register: async (userData) => {
    const response = await api.post('/auth/register/', userData);
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/user/');
    return response.data;
  }
};

// Productos Services
export const productosService = {
  getAll: async (params = {}) => {
    const response = await api.get('/productos/', { params });
    return response.data;
  },
  
  // Alias para compatibilidad
  getProductos: async (params = {}) => {
    const response = await api.get('/productos/', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/productos/${id}/`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/productos/', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.put(`/productos/${id}/`, data);
    return response.data;
  },
  
  delete: async (id) => {
    await api.delete(`/productos/${id}/`);
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
    const response = await api.get(`/productos/${productoId}/stock/`);
    return response.data;
  }
};

// Servicios Services
export const serviciosService = {
  getSolicitudes: async (params = {}) => {
    const response = await api.get('/servicios/solicitudes/', { params });
    return response.data;
  },
  
  createSolicitud: async (data) => {
    const response = await api.post('/servicios/solicitudes/', data);
    return response.data;
  },
  
  getPropuestas: async (params = {}) => {
    const response = await api.get('/servicios/propuestas/', { params });
    return response.data;
  },
  
  createPropuesta: async (data) => {
    const response = await api.post('/servicios/propuestas/', data);
    return response.data;
  },
  
  aprobarPropuesta: async (id) => {
    const response = await api.post(`/servicios/propuestas/${id}/aprobar_propuesta/`);
    return response.data;
  },
  
  getServicios: async (params = {}) => {
    const response = await api.get('/servicios/servicios/', { params });
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
  
  getTiposServicio: async () => {
    const response = await api.get('/servicios/tipos-servicio/');
    return response.data;
  }
};

// Encuestas Services
export const encuestasService = {
  getEncuestas: async (params = {}) => {
    const response = await api.get('/encuestas/encuestas/', { params });
    return response.data;
  },
  
  getEncuestaPublica: async (token) => {
    const response = await api.get(`/encuestas/encuestas/publicas/?token=${token}`);
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
  }
};

// Users Services
export const usersService = {
  getUsers: async (params = {}) => {
    const response = await api.get('/users/usuarios/', { params });
    return response.data;
  },
  
  createUser: async (data) => {
    const response = await api.post('/users/usuarios/', data);
    return response.data;
  },
  
  updateUser: async (id, data) => {
    const response = await api.put(`/users/usuarios/${id}/`, data);
    return response.data;
  },
  
  cambiarEstadoUsuario: async (id, estado) => {
    const response = await api.post(`/users/usuarios/${id}/cambiar_estado/`, { estado });
    return response.data;
  },
  
  resetearPassword: async (id) => {
    const response = await api.post(`/users/usuarios/${id}/resetear_password/`);
    return response.data;
  }
};
