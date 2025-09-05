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
      <main>
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
            {/* Public Routes - Accesibles para todos */}
            <Route 
              path="/" 
              element={<HomePage />} 
            />
            
            {/* Auth Routes - Solo para no autenticados */}
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

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
        
        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              style: {
                background: '#4ade80',
              },
            },
            error: {
              duration: 5000,
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
      </Router>
    </AuthProvider>
  );
}

export default App
