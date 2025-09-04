import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Leaf, Bell, Menu, X, User, Settings, LogOut, 
  Home, ShoppingCart, Wrench, ClipboardList, 
  Plus, FileText, Search 
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const profileMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

const getNavLinks = () => {
    // 1. Lógica para Invitado (usuario no logueado)
    if (!user) {
      return [
        { name: 'Inicio', href: '/', icon: Home },
        { name: 'Servicios realizados', href: '/#', icon: Search },
        { name: 'Sobre nosotros', href: '/#', icon: Search },
      ];
    }

    // 2. Lógica para Administradores
    if (user.groups?.includes('Administradores')) {
      return [
        { name: 'Dashboard', href: '/dashboard', icon: Settings },
        { name: 'Productos', href: '/productos', icon: ShoppingCart },
        { name: 'Servicios', href: '/servicios', icon: Wrench },
        { name: 'Encuestas', href: '/encuestas', icon: ClipboardList },
      ];
    }
    
    // 3. Lógica para Empleados
    if (user.groups?.includes('Empleados')) {
      return [
        { name: 'Mis Servicios', href: '/servicios', icon: Wrench },
        { name: 'Productos', href: '/productos', icon: ShoppingCart },
        { name: 'Encuestas', href: '/encuestas', icon: ClipboardList },
      ];
    }

    // 4. Lógica para Clientes (si no es admin ni empleado, es cliente)
    return [
      { name: 'Mis Servicios', href: '/mis-servicios', icon: FileText },
      { name: 'Solicitar Servicio', href: '/solicitar-servicio', icon: Plus },
      { name: 'Productos', href: '/productos', icon: ShoppingCart },
    ];
};

  const navLinks = getNavLinks();

  const activeLinkClass = "bg-gray-700 text-white";
  const inactiveLinkClass = "text-gray-300 hover:bg-gray-700 hover:text-white";

  const renderNavLinks = (isMobile = false) => (
    navLinks.map((link) => (
      <NavLink
        key={link.name}
        to={link.href}
        onClick={() => isMobile && setIsMobileMenuOpen(false)}
        className={({ isActive }) =>
          `${isMobile ? 'block' : ''} px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${isActive ? activeLinkClass : inactiveLinkClass}`
        }
      >
        <link.icon size={16} />
        {link.name}
      </NavLink>
    ))
  );

  return (
    <nav className="bg-gray-800 shadow-lg fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo y links principales */}
          <div className="flex items-center">
            <Link to={user ? "/dashboard" : "/"} className="flex-shrink-0 flex items-center gap-2 text-white">
              <Leaf className="text-emerald-400" size={24} />
              <span className="font-bold text-lg">El Edén</span>
            </Link>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {renderNavLinks()}
              </div>
            </div>
          </div>

          {/* Iconos de la derecha y menú de perfil */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {user && (
                <button className="p-1 rounded-full text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
                  <span className="sr-only">View notifications</span>
                  <Bell size={20} />
                </button>
              )}

              {user ? (
                /* Profile dropdown para usuarios autenticados */
                <div className="ml-3 relative" ref={profileMenuRef}>
                  <div>
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="max-w-xs bg-gray-800 rounded-full flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                    >
                      <span className="sr-only">Open user menu</span>
                      <img className="h-8 w-8 rounded-full" src={`https://ui-avatars.com/api/?name=${user?.first_name}+${user?.last_name}&background=0D8ABC&color=fff`} alt="" />
                    </button>
                  </div>
                  <div
                    className={`origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none transition-all duration-200 ease-out ${
                      isProfileMenuOpen ? 'transform opacity-100 scale-100' : 'transform opacity-0 scale-95'
                    }`}
                  >
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <p className="font-bold">{user?.first_name} {user?.last_name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <Link to="/perfil" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <User size={16} /> Mi Perfil
                    </Link>
                    <button onClick={logout} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <LogOut size={16} /> Cerrar Sesión
                    </button>
                  </div>
                </div>
              ) : (
                /* Botón de Iniciar Sesión para usuarios no autenticados */
                <Link
                  to="/login"
                  className="ml-3 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors duration-200"
                >
                  <User size={16} />
                  Iniciar Sesión
                </Link>
              )}
            </div>
          </div>

          {/* Menú de hamburguesa para móviles */}
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Panel del menú móvil */}
      <div
        ref={mobileMenuRef}
        className={`md:hidden transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}
      >
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {renderNavLinks(true)}
        </div>
        {user ? (
          /* Sección de perfil para usuarios autenticados */
          <div className="pt-4 pb-3 border-t border-gray-700">
            <div className="flex items-center px-5">
              <div className="flex-shrink-0">
                <img className="h-10 w-10 rounded-full" src={`https://ui-avatars.com/api/?name=${user?.first_name}+${user?.last_name}&background=0D8ABC&color=fff`} alt="" />
              </div>
              <div className="ml-3">
                <div className="text-base font-medium leading-none text-white">{user?.first_name} {user?.last_name}</div>
                <div className="text-sm font-medium leading-none text-gray-400">{user?.email}</div>
              </div>
              <button className="ml-auto bg-gray-800 flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-white focus:outline-none">
                <Bell size={20} />
              </button>
            </div>
            <div className="mt-3 px-2 space-y-1">
              <Link to="/perfil" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700">Mi Perfil</Link>
              <button onClick={() => { logout(); setIsMobileMenuOpen(false); }} className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700">Cerrar Sesión</button>
            </div>
          </div>
        ) : (
          /* Botón de Iniciar Sesión para usuarios no autenticados */
          <div className="pt-4 pb-3 border-t border-gray-700">
            <div className="px-2">
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-md text-base font-medium flex items-center justify-center gap-2 transition-colors duration-200"
              >
                <User size={16} />
                Iniciar Sesión
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;