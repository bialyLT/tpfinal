import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Home, 
  Package, 
  Wrench, 
  FileText, 
  Users, 
  Settings,
  LogOut,
  Menu,
  X,
  Leaf
} from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Inicio', href: '/', icon: Home },
    { name: 'Productos', href: '/productos', icon: Package },
    { name: 'Servicios', href: '/servicios', icon: Wrench },
    { name: 'Encuestas', href: '/encuestas', icon: FileText },
  ];

  const adminNavigation = [
    { name: 'Usuarios', href: '/admin/usuarios', icon: Users },
    { name: 'Configuración', href: '/admin/configuracion', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="navbar bg-primary text-primary-content shadow-lg">
      <div className="navbar-start">
        <div className="dropdown lg:hidden">
          <button 
            tabIndex={0} 
            className="btn btn-ghost"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          {isOpen && (
            <ul className="menu dropdown-content bg-base-100 text-base-content rounded-box z-[1] mt-3 w-52 p-2 shadow">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <Link 
                      to={item.href}
                      className={`flex items-center gap-2 ${isActive(item.href) ? 'active' : ''}`}
                      onClick={() => setIsOpen(false)}
                    >
                      <Icon size={16} />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
              {user?.is_staff && adminNavigation.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <Link 
                      to={item.href}
                      className={`flex items-center gap-2 ${isActive(item.href) ? 'active' : ''}`}
                      onClick={() => setIsOpen(false)}
                    >
                      <Icon size={16} />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        
        <Link to="/" className="btn btn-ghost text-xl font-bold">
          <Leaf className="mr-2" size={24} />
          El Edén
        </Link>
      </div>

      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.name}>
                <Link 
                  to={item.href}
                  className={`flex items-center gap-2 ${isActive(item.href) ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  {item.name}
                </Link>
              </li>
            );
          })}
          {user?.is_staff && adminNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.name}>
                <Link 
                  to={item.href}
                  className={`flex items-center gap-2 ${isActive(item.href) ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="navbar-end">
        {isAuthenticated ? (
          <div className="dropdown dropdown-end">
            <button tabIndex={0} className="btn btn-ghost">
              <div className="flex items-center gap-2">
                <div className="avatar placeholder">
                  <div className="bg-neutral-focus text-neutral-content rounded-full w-8">
                    <span className="text-xs">
                      {user?.first_name?.[0] || user?.username?.[0] || 'U'}
                    </span>
                  </div>
                </div>
                <span className="hidden md:block">
                  {user?.first_name || user?.username}
                </span>
              </div>
            </button>
            <ul className="menu dropdown-content bg-base-100 text-base-content rounded-box z-[1] mt-3 w-52 p-2 shadow">
              <li className="menu-title">
                <span>{user?.first_name || user?.username}</span>
              </li>
              <li><Link to="/perfil">Mi Perfil</Link></li>
              <li><Link to="/mis-servicios">Mis Servicios</Link></li>
              <div className="divider"></div>
              <li>
                <button onClick={handleLogout} className="text-error">
                  <LogOut size={16} />
                  Cerrar Sesión
                </button>
              </li>
            </ul>
          </div>
        ) : (
          <div className="flex gap-2">
            <Link to="/login" className="btn btn-ghost">
              Iniciar Sesión
            </Link>
            <Link to="/register" className="btn btn-secondary">
              Registrarse
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
