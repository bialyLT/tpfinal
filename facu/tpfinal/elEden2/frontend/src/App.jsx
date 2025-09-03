import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Loading from './components/Loading';

// Pages
import HomePage from './pages/home/HomePage';
import LoginPage from './pages/registro/LoginPage';
import RegisterPage from './pages/registro/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProductosPage from './pages/ProductosPage';
import ServiciosPage from './pages/ServiciosPage';
import EncuestasPage from './pages/EncuestasPage';
import SolicitarServicioPage from './pages/SolicitarServicioPage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <Loading message="Verificando autenticación..." />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Public Route Component (redirect to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <Loading message="Verificando autenticación..." />;
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
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

            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/productos" 
              element={
                <ProtectedRoute>
                  <ProductosPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/servicios" 
              element={
                <ProtectedRoute>
                  <ServiciosPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/encuestas" 
              element={
                <ProtectedRoute>
                  <EncuestasPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/solicitar-servicio" 
              element={
                <ProtectedRoute>
                  <SolicitarServicioPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/mis-servicios" 
              element={
                <ProtectedRoute>
                  <ServiciosPage />
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
