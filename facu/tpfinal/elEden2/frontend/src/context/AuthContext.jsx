import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS':
      return { 
        ...state, 
        isAuthenticated: true, 
        user: action.payload, 
        isLoading: false, 
        error: null 
      };
    case 'LOGIN_FAILURE':
      return { 
        ...state, 
        isAuthenticated: false, 
        user: null, 
        isLoading: false, 
        error: action.payload 
      };
    case 'LOGOUT':
      return { 
        ...state, 
        isAuthenticated: false, 
        user: null, 
        isLoading: false, 
        error: null 
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const user = await authService.getCurrentUser();
        dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      } catch (error) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        dispatch({ type: 'LOGOUT' });
      }
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = async (email, password) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      console.log('🔐 Iniciando login con email:', email);
      
      // Enviar email y password directamente
      const response = await authService.login({ email, password });
      console.log('✅ Login response:', response);
      
      localStorage.setItem('accessToken', response.access);
      localStorage.setItem('refreshToken', response.refresh);
      
      console.log('📱 Obteniendo datos del usuario...');
      const user = await authService.getCurrentUser();
      console.log('👤 Usuario obtenido:', user);
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      toast.success(`¡Bienvenido de vuelta, ${user.first_name || user.username}!`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error en login:', error);
      console.error('❌ Error response:', error.response?.data);
      const message = error.response?.data?.detail || error.response?.data?.message || 'Error al iniciar sesión';
      dispatch({ type: 'LOGIN_FAILURE', payload: message });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      dispatch({ type: 'LOGOUT' });
      toast.success('Sesión cerrada');
    } catch (error) {
      // Aún así cerrar sesión localmente
      dispatch({ type: 'LOGOUT' });
      toast.success('Sesión cerrada');
    }
  };

  const register = async (userData) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authService.register(userData);
      
      // Si el registro incluye tokens, iniciar sesión automáticamente
      if (response.access && response.refresh && response.user) {
        localStorage.setItem('accessToken', response.access);
        localStorage.setItem('refreshToken', response.refresh);
        dispatch({ type: 'LOGIN_SUCCESS', payload: response.user });
        toast.success('¡Registro exitoso! Bienvenido a El Edén.');
      } else {
        // Fallback si no se incluyen tokens
        toast.success('Usuario registrado exitosamente. Ya puedes iniciar sesión.');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error en registro:', error);
      
      // Mejorar el manejo de errores
      let message = 'Error al registrar usuario';
      if (error.response?.data) {
        // Si hay errores específicos de campos
        if (typeof error.response.data === 'object' && !error.response.data.message) {
          const fieldErrors = [];
          Object.entries(error.response.data).forEach(([field, errors]) => {
            if (Array.isArray(errors)) {
              fieldErrors.push(...errors);
            } else {
              fieldErrors.push(errors);
            }
          });
          if (fieldErrors.length > 0) {
            message = fieldErrors.join('. ');
          }
        } else {
          message = error.response.data.message || error.response.data.detail || message;
        }
      }
      
      dispatch({ type: 'LOGIN_FAILURE', payload: message });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const updateUser = (userData) => {
    dispatch({ type: 'SET_USER', payload: userData });
  };

  const value = {
    ...state,
    login,
    logout,
    register,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
