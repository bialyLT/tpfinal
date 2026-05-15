import axios from 'axios';

const normalizeApiBaseUrl = (value) => {
  // If user provided a VITE_API_URL, normalize it to end with /api/v1
  if (value) {
    const trimmed = String(value).replace(/\/+$/, '');
    return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
  }

  // If no env var provided, default to same origin to avoid mixed-content
  // when frontend is served over HTTPS (ngrok, https dev tunnels, etc.).
  // This makes requests go to: <current origin>/api/v1
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.protocol}//${window.location.host}/api/v1`;
  }

  // Fallback: localhost (useful in node env or when window is not available)
  return 'http://localhost:8000/api/v1';
};

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

// Crear instancia de axios con configuración base
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Si se envía FormData, permitir que axios configure automáticamente el Content-Type
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
            refresh: refreshToken
          });
          
          const { access } = response.data;
          localStorage.setItem('accessToken', access);
          
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Error al refrescar token:', refreshError);
        // Si el refresh token también falló, limpiar localStorage y redirigir al login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
