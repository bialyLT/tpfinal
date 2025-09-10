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
  const isAdmin = user.is_staff || user.is_superuser || userRole === 'administrador' || user.groups?.includes('Administradores');
  const isEmpleado = userRole === 'empleado' || userRole === 'diseñador' || user.groups?.includes('Empleados');
  const isCliente = userRole === 'cliente' || user.groups?.includes('Clientes');

  // Verificar permisos basándose en roles permitidos
  let hasPermission = false;
  
  for (const role of allowedRoles) {
    if (role === 'administrador' && isAdmin) {
      hasPermission = true;
      break;
    }
    if ((role === 'empleado' || role === 'diseñador') && (isEmpleado || isAdmin)) {
      hasPermission = true;
      break;
    }
    if (role === 'cliente' && (isCliente || isAdmin)) {
      hasPermission = true;
      break;
    }
  }

  console.log(`[ProtectedRoute] Usuario: ${user.username}, Rol: ${userRole}, Grupos: ${user.groups?.join(',')}, Permisos para ${allowedRoles}: ${hasPermission}`);

  if (!hasPermission) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default ProtectedRoute;
