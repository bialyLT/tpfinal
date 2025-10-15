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

  updateServicio: async (id, data) => {
    const response = await api.put(`/servicios/servicios/${id}/`, data);
    return response.data;
  },

  crearDisenoCompleto: async (servicioId, formData) => {
    const response = await api.post(`/servicios/servicios/${servicioId}/crear_diseño/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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

// ⚠️ ADVERTENCIA: Los siguientes endpoints NO EXISTEN en el backend actual
// Este servicio está aquí solo para mantener compatibilidad con EmpleadosPage
// ⚠️ ADVERTENCIA: Las rutas /users/usuarios/* no están implementadas en el backend
// Si necesitas gestionar empleados/usuarios, considera:
// 1. Implementar estos endpoints en el backend (apps/users/views.py)
// 2. O usar los endpoints específicos: /users/clientes/, /users/proveedores/
/*
export const usersService = {
  getUsers: async (params = {}) => {
    const response = await api.get('/users/usuarios/', { params });
    return response.data;
  },
  
  getEmpleados: async (params = {}) => {
    const response = await api.get('/users/usuarios/empleados/', { params });
    return response.data;
  },
  
  getClientes: async (params = {}) => {
    const response = await api.get('/users/usuarios/clientes/', { params });
    return response.data;
  },
  
  getAdministradores: async (params = {}) => {
    const response = await api.get('/users/usuarios/administradores/', { params });
    return response.data;
  },

  createUser: async (data) => {
    const response = await api.post('/users/usuarios/', data);
    return response.data;
  },

  createEmpleado: async (data) => {
    const response = await api.post('/users/register-empleado/', data);
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
*/

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
