import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Menu } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SidebarProvider, useSidebar } from './context/SidebarContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Loading from './components/Loading';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import HomePage from './pages/home/HomePage';
import LoginPage from './pages/registro/LoginPage';
import RegisterPage from './pages/registro/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProductosPage from './pages/ProductosPage';
import ServiciosPage from './pages/ServiciosPage';
import EncuestasPage from './pages/EncuestasPage';
import EmpleadosPage from './pages/EmpleadosPage';
import SolicitarServicioPage from './pages/SolicitarServicioPage';
import MiPerfil from './pages/MiPerfil';
// ABM Pages
import ComprasPage from './pages/ComprasPage';
import CategoriasPage from './pages/CategoriasPage';
import MarcasPage from './pages/MarcasPage';
import ProveedoresPage from './pages/ProveedoresPage';

// Basic Protected Route Component (solo requiere autenticación)
const BasicProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <Loading message="Verificando autenticación..." />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Public Route Component (redirect to appropriate page if authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <Loading message="Verificando autenticación..." />;
  }
  
  if (user) {
    // Redirigir según el tipo de usuario
    const userRole = user.perfil?.tipo_usuario || 'cliente';
    const isAdmin = user.is_staff || user.is_superuser || userRole === 'administrador' || user.groups?.includes('Administradores');
    const isEmpleado = userRole === 'empleado' || userRole === 'diseñador' || user.groups?.includes('Empleados');
    
    if (isAdmin) {
      return <Navigate to="/dashboard" replace />;
    } else if (isEmpleado) {
      return <Navigate to="/servicios" replace />;
    } else {
      return <Navigate to="/mis-servicios" replace />;
    }
  }
  
  return children;
};

// App Layout Component
const AppLayout = ({ children }) => {
  const { user } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const location = useLocation();
  
  // Determinar si el usuario es admin o empleado
  const isAdmin = user && (user.is_staff || user.is_superuser || user.perfil?.tipo_usuario === 'administrador' || user.groups?.includes('Administradores'));
  const isEmpleado = user && (user.perfil?.tipo_usuario === 'empleado' || user.groups?.includes('Empleados'));
  const isCliente = user && !isAdmin && !isEmpleado;
  
  // Páginas donde NO se debe mostrar el Navbar (login y register)
  const hideNavbarPages = ['/login', '/register'];
  const shouldShowNavbar = !hideNavbarPages.includes(location.pathname);
  
  return (
    <div className="min-h-screen bg-gray-900">
      {user ? (
        <>
          {/* Administradores y Empleados usan Sidebar */}
          {(isAdmin || isEmpleado) ? (
            <>
              <Sidebar />
              {/* Mobile menu button */}
              <button
                onClick={toggleSidebar}
                className="md:hidden fixed top-4 left-4 z-30 p-2 bg-gray-800 text-white rounded-lg shadow-lg"
              >
                <Menu size={24} />
              </button>
              <main className={`transition-all duration-300 ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
                {children}
              </main>
            </>
          ) : (
            /* Clientes usan Navbar */
            <>
              {shouldShowNavbar && <Navbar />}
              <main className={shouldShowNavbar ? 'pt-16' : ''}>
                {children}
              </main>
            </>
          )}
        </>
      ) : (
        /* Usuarios no autenticados usan Navbar (excepto en login/register) */
        <>
          {shouldShowNavbar && <Navbar />}
          <main className={shouldShowNavbar ? 'pt-16' : ''}>
            {children}
          </main>
        </>
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <SidebarProvider>
        <Router>
          <AppLayout>
            <Routes>
            {/* Public Routes */}
            <Route 
              path="/" 
              element={
                  <HomePage />
              } 
            />
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              } 
            />
            <Route 
              path="/register" 
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              } 
            />

            {/* Protected Routes with Role-based Access */}
            
            {/* Dashboard - Solo Administradores */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['administrador']}>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />

            {/* Usuarios (Empleados) - Solo Administradores */}
            <Route 
              path="/usuarios" 
              element={
                <ProtectedRoute allowedRoles={['administrador']}>
                  <EmpleadosPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Productos - Solo Empleados y Administradores */}
            <Route 
              path="/productos" 
              element={
                <ProtectedRoute allowedRoles={['empleado', 'diseñador', 'administrador']}>
                  <ProductosPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Servicios (vista administrativa) - Solo Empleados y Administradores */}
            <Route 
              path="/servicios" 
              element={
                <ProtectedRoute allowedRoles={['empleado', 'diseñador', 'administrador']}>
                  <ServiciosPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Encuestas - Solo Empleados y Administradores */}
            <Route 
              path="/encuestas" 
              element={
                <ProtectedRoute allowedRoles={['empleado', 'diseñador', 'administrador']}>
                  <EncuestasPage />
                </ProtectedRoute>
              } 
            />

            {/* Compras - Solo Empleados y Administradores */}
            <Route 
              path="/compras" 
              element={
                <ProtectedRoute allowedRoles={['empleado', 'diseñador', 'administrador']}>
                  <ComprasPage />
                </ProtectedRoute>
              } 
            />

            {/* Categorías - Solo Empleados y Administradores */}
            <Route 
              path="/categorias" 
              element={
                <ProtectedRoute allowedRoles={['empleado', 'diseñador', 'administrador']}>
                  <CategoriasPage />
                </ProtectedRoute>
              } 
            />

            {/* Marcas - Solo Empleados y Administradores */}
            <Route 
              path="/marcas" 
              element={
                <ProtectedRoute allowedRoles={['empleado', 'diseñador', 'administrador']}>
                  <MarcasPage />
                </ProtectedRoute>
              } 
            />

            {/* Proveedores - Solo Empleados y Administradores */}
            <Route 
              path="/proveedores" 
              element={
                <ProtectedRoute allowedRoles={['empleado', 'diseñador', 'administrador']}>
                  <ProveedoresPage />
                </ProtectedRoute>
              } 
            />

            {/* Solicitar Servicio - Solo Clientes */}
            <Route 
              path="/solicitar-servicio" 
              element={
                <ProtectedRoute allowedRoles={['cliente']}>
                  <SolicitarServicioPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Mis Servicios - Solo Clientes (vista para ver sus solicitudes) */}
            <Route 
              path="/mis-servicios" 
              element={
                <ProtectedRoute allowedRoles={['cliente']}>
                  <ServiciosPage />
                </ProtectedRoute>
              } 
            />

            {/* Mi Perfil - Solo Clientes */}
            <Route 
              path="/mi-perfil" 
              element={
                <ProtectedRoute allowedRoles={['cliente']}>
                  <MiPerfil />
                </ProtectedRoute>
              } 
            />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
        
        {/* Toast notifications */}
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          containerClassName=""
          containerStyle={{}}
          toastOptions={{
            // Configuración base manejada por el sistema de notificaciones
            className: '',
            duration: 4000,
            style: {
              background: '#374151',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            },
          }}
        />
        </Router>
      </SidebarProvider>
    </AuthProvider>
  );
}

export default App
