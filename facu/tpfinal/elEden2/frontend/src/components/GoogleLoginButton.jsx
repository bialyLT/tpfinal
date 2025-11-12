import React from 'react';
import { GoogleLogin, useGoogleLogin } from '@react-oauth/google';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { success, error as showError } from '../utils/notifications';

const GoogleLoginButton = ({ isRegister = false, redirectTo = null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateUser } = useAuth();
  
  // Obtener la URL de destino desde props o desde el state
  const from = redirectTo || location.state?.from;

  const handleGoogleSuccess = async (tokenResponse) => {
    try {
      // Obtener información del usuario desde Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenResponse.access_token}`,
        },
      });
      
      const userInfo = await userInfoResponse.json();
      
      // Generar un ID token simulado (el backend usará el email para identificar)
      // En producción, deberías usar el id_token real de Google
      const idToken = tokenResponse.access_token;
      
      // Enviar el token de Google al backend
      const response = await api.post('/auth/google/', {
        token: idToken,
        email: userInfo.email,
        first_name: userInfo.given_name,
        last_name: userInfo.family_name,
        google_id: userInfo.sub,
      });

      // Guardar tokens
      localStorage.setItem('accessToken', response.data.access);
      localStorage.setItem('refreshToken', response.data.refresh);

      // Actualizar usuario en contexto
      updateUser(response.data.user);

      // Mostrar mensaje apropiado
      if (response.data.is_new_user) {
        success('¡Cuenta creada exitosamente con Google! Bienvenido a El Edén 🌿');
      } else {
        success('¡Inicio de sesión exitoso! Bienvenido de nuevo 👋');
      }

      // Redirigir según el destino guardado o al dashboard por defecto
      if (from) {
        const destino = typeof from === 'string'
          ? from
          : `${from.pathname || '/'}${from.search || ''}${from.hash || ''}`;
        navigate(destino, { replace: true });
      } else if (location.search && new URLSearchParams(location.search).get('reserva')) {
        // Compatibilidad: si la URL todavía usa ?reserva=, redirigir a la nueva vista
        const reservaId = new URLSearchParams(location.search).get('reserva');
        navigate(`/servicios/reservas/${reservaId}#encuesta`, { replace: true });
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Error en Google login:', err);
      showError(
        err.response?.data?.error || 
        'Error al iniciar sesión con Google. Por favor, intenta nuevamente.'
      );
    }
  };

  const handleGoogleError = (error) => {
    console.error('Google login error:', error);
    showError('Error al iniciar sesión con Google. Por favor, intenta nuevamente.');
  };

  const login = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: handleGoogleError,
  });

  return (
    <button
      onClick={() => login()}
      type="button"
      className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          opacity=".7"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          opacity=".8"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          opacity=".6"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          opacity=".9"
        />
      </svg>
      <span className="text-sm font-medium">
        {isRegister ? 'Registrarse con Google' : 'Continuar con Google'}
      </span>
    </button>
  );
};

export default GoogleLoginButton;
