import { useState, useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificacionesService } from '../services';
import { 
  Leaf, Bell, Menu, X, User, Settings, LogOut, 
  Home, ShoppingCart, Wrench, ClipboardList, 
  Plus, FileText, Search 
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [selectedNotification, setSelectedNotification] = useState(null);

  const profileMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const notificationsMenuRef = useRef(null);

  const isAdmin = user && (user.is_staff || user.is_superuser || user.perfil?.tipo_usuario === 'administrador' || user.groups?.includes('Administradores'));
  const isEmpleado = user && (user.perfil?.tipo_usuario === 'empleado' || user.groups?.includes('Empleados'));

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
      if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatNotificationDate = (value) => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch (err) {
      return value;
    }
  };

  const loadNotifications = async () => {
    if (!user) return;
    setNotificationsLoading(true);
    setNotificationsError('');
    try {
      const data = await notificacionesService.getAll();
      const list = Array.isArray(data) ? data : data.results || [];
      setNotifications(list);
    } catch (err) {
      setNotifications([]);
      setNotificationsError('No se pudieron cargar las notificaciones.');
    } finally {
      setNotificationsLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read_at && !n.is_read).length;

  const handleOpenNotification = async (notification) => {
    if (!notification) return;
    setSelectedNotification(notification);
    if (!notification.read_at && !notification.is_read) {
      try {
        const updated = await notificacionesService.marcarLeida(notification.id);
        setNotifications((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } catch (err) {
        // ignore
      }
    }
  };

  const handleMarkRead = async (notification, event) => {
    if (event) event.stopPropagation();
    if (!notification || notification.read_at || notification.is_read) return;
    try {
      const updated = await notificacionesService.marcarLeida(notification.id);
      setNotifications((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      if (selectedNotification?.id === updated.id) {
        setSelectedNotification(updated);
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      setNotifications([]);
      setSelectedNotification(null);
      setIsNotificationsOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
    if (isAdmin) {
      return [
        { name: 'Dashboard', href: '/dashboard', icon: Settings },
        { name: 'Inventario', href: '/productos', icon: ShoppingCart },
        { name: 'Compras', href: '/compras', icon: ShoppingCart },
        { name: 'Proveedores', href: '/proveedores', icon: User },
        { name: 'Categorías', href: '/categorias', icon: ClipboardList },
        { name: 'Marcas', href: '/marcas', icon: ClipboardList },
        { name: 'Servicios', href: '/servicios', icon: Wrench },
        { name: 'Encuestas', href: '/encuestas', icon: ClipboardList },
        // { name: 'Empleados', href: '/empleados', icon: User }, // ⚠️ Deshabilitado: endpoints no implementados
      ];
    }
    
    // 3. Lógica para Empleados y Diseñadores
    if (isEmpleado) {
      return [
        { name: 'Mis Servicios', href: '/servicios', icon: Wrench },
        { name: 'Inventario', href: '/productos', icon: ShoppingCart },
        { name: 'Compras', href: '/compras', icon: ShoppingCart },
        { name: 'Proveedores', href: '/proveedores', icon: User },
        { name: 'Mi Perfil', href: '/mi-perfil', icon: User },
      ];
    }

    // 4. Lógica para Clientes (por defecto)
    return [
      { name: 'Mis Servicios', href: '/mis-servicios', icon: FileText },
      { name: 'Solicitar Servicio', href: '/solicitar-servicio', icon: Plus },
      { name: 'Mi Perfil', href: '/mi-perfil', icon: User },
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
            <Link to="/" className="flex-shrink-0 flex items-center gap-2 text-white">
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
                <div className="ml-2 relative" ref={notificationsMenuRef}>
                  <button
                    onClick={() => {
                      setIsNotificationsOpen((prev) => !prev);
                      if (!isNotificationsOpen) loadNotifications();
                    }}
                    className="relative p-1 rounded-full text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                  >
                    <span className="sr-only">Ver notificaciones</span>
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  {isNotificationsOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg py-2 bg-gray-900 ring-1 ring-black ring-opacity-40">
                      <div className="px-4 pb-2 border-b border-gray-800">
                        <p className="text-sm font-semibold text-white">Notificaciones</p>
                        <p className="text-xs text-gray-400">Mensajes enviados por email</p>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notificationsLoading ? (
                          <div className="px-4 py-4 text-sm text-gray-400">Cargando...</div>
                        ) : notificationsError ? (
                          <div className="px-4 py-4 text-sm text-red-400">{notificationsError}</div>
                        ) : notifications.length === 0 ? (
                          <div className="px-4 py-4 text-sm text-gray-400">Sin notificaciones.</div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              onClick={() => handleOpenNotification(notification)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-800 flex items-start gap-3 cursor-pointer"
                            >
                              <span className={`mt-1 h-2 w-2 rounded-full ${notification.read_at || notification.is_read ? 'bg-gray-600' : 'bg-blue-400'}`} />
                              <div className="flex-1">
                                <p className={`text-sm ${notification.read_at || notification.is_read ? 'text-gray-300' : 'text-white font-semibold'}`}>
                                  {notification.subject}
                                </p>
                                <p className="text-xs text-gray-500">{formatNotificationDate(notification.created_at)}</p>
                              </div>
                              {(!notification.read_at && !notification.is_read) && (
                                <button
                                  type="button"
                                  onClick={(event) => handleMarkRead(notification, event)}
                                  className="text-xs text-emerald-400 hover:text-emerald-300"
                                >
                                  Marcar leida
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
                  {isProfileMenuOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b">
                        <p className="font-bold">{user?.first_name} {user?.last_name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                      <button onClick={logout} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <LogOut size={16} /> Cerrar Sesión
                      </button>
                    </div>
                  )}
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
              <button
                onClick={() => {
                  setIsNotificationsOpen((prev) => !prev);
                  if (!isNotificationsOpen) loadNotifications();
                }}
                className="ml-auto relative bg-gray-800 flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-white focus:outline-none"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
            {isNotificationsOpen && (
              <div className="mt-3 px-5">
                <div className="bg-gray-900 rounded-lg border border-gray-700">
                  <div className="px-4 py-2 border-b border-gray-700">
                    <p className="text-sm font-semibold text-white">Notificaciones</p>
                    <p className="text-xs text-gray-400">Mensajes enviados por email</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notificationsLoading ? (
                      <div className="px-4 py-3 text-sm text-gray-400">Cargando...</div>
                    ) : notificationsError ? (
                      <div className="px-4 py-3 text-sm text-red-400">{notificationsError}</div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400">Sin notificaciones.</div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => handleOpenNotification(notification)}
                          className="px-4 py-3 border-b border-gray-800 last:border-b-0 hover:bg-gray-800 cursor-pointer flex gap-3"
                        >
                          <span className={`mt-1 h-2 w-2 rounded-full ${notification.read_at || notification.is_read ? 'bg-gray-500' : 'bg-blue-400'}`} />
                          <div className="flex-1">
                            <p className={`text-sm ${notification.read_at || notification.is_read ? 'text-gray-300' : 'text-white font-semibold'}`}>
                              {notification.subject}
                            </p>
                            <p className="text-xs text-gray-500">{formatNotificationDate(notification.created_at)}</p>
                          </div>
                          {(!notification.read_at && !notification.is_read) && (
                            <button
                              type="button"
                              onClick={(event) => handleMarkRead(notification, event)}
                              className="text-xs text-emerald-400 hover:text-emerald-300"
                            >
                              Marcar leida
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="mt-3 px-2 space-y-1">
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

      {selectedNotification && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h3 className="text-base font-semibold text-white">Detalle de notificacion</h3>
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-4 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <div>
                <p className="text-sm text-gray-400">Asunto</p>
                <p className="text-white font-semibold">{selectedNotification.subject}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Fecha</p>
                <p className="text-gray-300">{formatNotificationDate(selectedNotification.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Mensaje</p>
                <p className="text-gray-300 whitespace-pre-wrap">{selectedNotification.body}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-700">
              {(!selectedNotification.read_at && !selectedNotification.is_read) && (
                <button
                  type="button"
                  onClick={() => handleMarkRead(selectedNotification)}
                  className="px-3 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                >
                  Marcar como leida
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="px-3 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;