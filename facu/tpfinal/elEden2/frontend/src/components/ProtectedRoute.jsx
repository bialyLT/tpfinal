import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [], redirectTo = '/mis-servicios' }) => {
  const { user, loading } = useAuth();

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  // Si no hay usuario, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si no se especifican roles permitidos, cualquier usuario autenticado puede acceder
  if (allowedRoles.length === 0) {
    return children;
  }

  // Verificar si el usuario tiene uno de los roles permitidos
  const userRole = user.perfil?.tipo_usuario || 'cliente';
  const hasPermission = allowedRoles.includes(userRole) || 
                       (allowedRoles.includes('administrador') && user.is_staff) ||
                       (allowedRoles.includes('administrador') && user.is_superuser);

  if (!hasPermission) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default ProtectedRoute;
