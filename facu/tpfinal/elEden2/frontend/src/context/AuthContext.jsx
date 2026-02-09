/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services';
import { success, handleApiError } from '../utils/notifications';

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
    console.log('🔍 Verificando estado de autenticación...');
    const token = localStorage.getItem('accessToken');
    console.log('🔑 Token encontrado:', token ? 'SÍ (len: ' + token.length + ')' : 'NO');
    
    if (token) {
      try {
        console.log('📡 Obteniendo usuario actual...');
        const user = await authService.getCurrentUser();
        console.log('✅ Usuario autenticado:', user.email);
        dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      } catch (error) {
        console.error('❌ Error al verificar autenticación:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        dispatch({ type: 'LOGOUT' });
      }
    } else {
      console.log('⚠️ No hay token, usuario no autenticado');
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
      
      // Mensaje personalizado según el tipo de usuario
      const userType = user.perfil?.tipo_usuario || 'cliente';
      const welcomeMessages = {
        'cliente': `¡Bienvenido, ${user.first_name || user.username}! Ya puedes solicitar nuestros servicios.`,
        'empleado': `¡Bienvenido de vuelta, ${user.first_name || user.username}! Tienes acceso al panel de empleado.`,
        'diseñador': `¡Bienvenido, ${user.first_name || user.username}! Tienes acceso al panel de diseño.`,
        'administrador': `¡Bienvenido, ${user.first_name || user.username}! Acceso completo al sistema.`
      };
      
      success(welcomeMessages[userType] || welcomeMessages['cliente']);
      return { success: true };
    } catch (err) {
      console.error('❌ Error en login:', err);
      console.error('❌ Error response:', err.response?.data);
      const message = handleApiError(err, 'Error al iniciar sesión');
      dispatch({ type: 'LOGIN_FAILURE', payload: message });
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      dispatch({ type: 'LOGOUT' });
      success('Sesión cerrada');
    } catch {
      // Aún así cerrar sesión localmente
      dispatch({ type: 'LOGOUT' });
      success('Sesión cerrada');
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
        success('¡Registro exitoso! Bienvenido a El Edén.');
      } else {
        // Fallback si no se incluyen tokens
        success('Usuario registrado exitosamente. Ya puedes iniciar sesión.');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
      
      return { success: true };
    } catch (err) {
      console.error('Error en registro:', err);
      
      const message = handleApiError(err, 'Error al registrar usuario');
      dispatch({ type: 'LOGIN_FAILURE', payload: message });
      return { success: false, error: message };
    }
  };

  const updateUser = (userData) => {
    dispatch({ type: 'SET_USER', payload: userData });
  };

  const value = {
    ...state,
    loading: state.isLoading,
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
