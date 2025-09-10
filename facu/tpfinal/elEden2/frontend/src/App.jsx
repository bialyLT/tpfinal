import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
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
    if (userRole === 'administrador') {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/mis-servicios" replace />;
    }
  }
  
  return children;
};

// App Layout Component
const AppLayout = ({ children }) => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-base-200">
      {user && <Navbar />}
      <main className={user ? 'pt-16' : ''}>
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout>
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/" 
              element={
                <PublicRoute>
                  <HomePage />
                </PublicRoute>
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

            {/* Empleados - Solo Administradores */}
            <Route 
              path="/empleados" 
              element={
                <ProtectedRoute allowedRoles={['administrador']}>
                  <EmpleadosPage />
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

            {/* Admin Routes - TODO: Add role-based protection */}
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-base-200 p-4">
                    <div className="max-w-7xl mx-auto">
                      <div className="card bg-base-100 shadow-xl">
                        <div className="card-body text-center">
                          <h2 className="card-title justify-center text-2xl mb-4">Panel de Administración</h2>
                          <p className="text-gray-600">Esta sección está en desarrollo.</p>
                          <div className="text-6xl mb-4">🚧</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ProtectedRoute>
              } 
            />

            {/* Profile Route - TODO: Create Profile page */}
            <Route 
              path="/perfil" 
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-base-200 p-4">
                    <div className="max-w-4xl mx-auto">
                      <div className="card bg-base-100 shadow-xl">
                        <div className="card-body text-center">
                          <h2 className="card-title justify-center text-2xl mb-4">Mi Perfil</h2>
                          <p className="text-gray-600">Esta sección está en desarrollo.</p>
                          <div className="text-6xl mb-4">👤</div>
                        </div>
                      </div>
                    </div>
                  </div>
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
    </AuthProvider>
  );
}

export default App
