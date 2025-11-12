import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [], redirectTo = '/mis-servicios' }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    console.log('🔒 ProtectedRoute - Loading...');
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  // Si no hay usuario, redirigir al login guardando la URL de destino
  if (!user) {
    console.log('🔒 ProtectedRoute - No user, redirecting to login');
    // Guardar la ruta completa (incluyendo query params) para redirigir después del login
  const search = location.search || '';
  const loginPath = search ? `/login${search}` : '/login';
  return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Si no se especifican roles permitidos, cualquier usuario autenticado puede acceder
  if (allowedRoles.length === 0) {
    return children;
  }

  // Verificar si el usuario tiene uno de los roles permitidos
  const userRole = user.perfil?.tipo_usuario || 'cliente';
  const isAdmin = user.is_staff || user.is_superuser || userRole === 'administrador' || user.groups?.includes('Administradores');
  const isEmpleado = userRole === 'empleado' || userRole === 'diseñador' || user.groups?.includes('Empleados');
  // Un cliente es cualquier usuario que no es admin ni empleado, o que tiene el grupo Clientes
  const isCliente = !isAdmin && !isEmpleado || userRole === 'cliente' || user.groups?.includes('Clientes');

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
