import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { notificacionesService } from '../services';
import { 
  Leaf, Menu, X, User, LogOut, Home, ShoppingCart, Bell,
  Package, Users, Wrench, ClipboardList, Tag, Building2,
  FileText, Plus, ChevronDown, ChevronRight, LayoutDashboard,
  ShoppingBag, ListChecks, Palette, ShieldCheck, Settings
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const notificationsMenuRef = useRef(null);

  const isAdmin = user && (user.is_staff || user.is_superuser || user.perfil?.tipo_usuario === 'administrador' || user.groups?.includes('Administradores'));
  const isEmpleado = user && (user.perfil?.tipo_usuario === 'empleado' || user.groups?.includes('Empleados'));
  const isCliente = user && !isAdmin && !isEmpleado;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSubmenu = (menuName) => {
    if (openSubmenu === menuName) {
      setOpenSubmenu(null);
    } else {
      setOpenSubmenu(menuName);
      if (isCollapsed) {
        toggleSidebar();
      }
    }
  };

  // Configuración de menús según rol
  const getMenuItems = () => {
    if (!user) return [];

    // Menú para Cliente
    if (isCliente) {
      return [
        { name: 'Inicio', href: '/', icon: Home },
        { name: 'Mis Servicios', href: '/mis-servicios', icon: FileText },
        { name: 'Mis Diseños', href: '/mis-disenos', icon: Palette },
        { name: 'Solicitar Servicio', href: '/solicitar-servicio', icon: Plus },
        { name: 'Mi Perfil', href: '/mi-perfil', icon: User },
      ];
    }

    // Menú para Empleado
    if (isEmpleado) {
      return [
        { name: 'Inicio', href: '/', icon: Home },
        { 
          name: 'Inventario', 
          icon: Package,
          submenu: [
            { name: 'Productos', href: '/productos', icon: ShoppingCart },
            { name: 'Categorías', href: '/categorias', icon: Tag },
            { name: 'Marcas', href: '/marcas', icon: Tag },
            { name: 'Especies', href: '/especies', icon: Leaf },
            { name: 'Tareas', href: '/tareas', icon: ListChecks },
          ]
        },
        { 
          name: 'Compras', 
          icon: ShoppingBag,
          submenu: [
            { name: 'Compras', href: '/compras', icon: ShoppingBag },
            { name: 'Proveedores', href: '/proveedores', icon: Building2 },
          ]
        },
        { name: 'Servicios', href: '/servicios', icon: Wrench },
        { name: 'Diseños', href: '/disenos', icon: Palette },
        { name: 'Mi Perfil', href: '/mi-perfil', icon: User },
      ];
    }

    // Menú para Administrador
    if (isAdmin) {
      return [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Configuración', href: '/configuracion', icon: Settings },
        { name: 'Estadísticas', href: '/estadisticas', icon: FileText },
        { 
          name: 'Inventario', 
          icon: Package,
          submenu: [
            { name: 'Productos', href: '/productos', icon: ShoppingCart },
            { name: 'Categorías', href: '/categorias', icon: Tag },
            { name: 'Marcas', href: '/marcas', icon: Tag },
            { name: 'Especies', href: '/especies', icon: Leaf },
            { name: 'Tareas', href: '/tareas', icon: ListChecks },
          ]
        },
        { 
          name: 'Compras', 
          icon: ShoppingBag,
          submenu: [
            { name: 'Compras', href: '/compras', icon: ShoppingBag },
            { name: 'Proveedores', href: '/proveedores', icon: Building2 },
          ]
        },
        { name: 'Servicios', href: '/servicios', icon: Wrench },
          { name: 'Diseños', href: '/disenos', icon: Palette },
          { name: 'Encuestas', href: '/gestion-encuestas', icon: ClipboardList },
          { name: 'Empleados', href: '/empleados', icon: Users },
          { name: 'Auditoría', href: '/auditoria', icon: ShieldCheck },
      ];
    }

    return [];
  };

  const menuItems = getMenuItems();

  const renderMenuItem = (item, index) => {
    if (item.submenu) {
      const isOpen = openSubmenu === item.name;
      const Icon = item.icon;

      return (
        <div key={index}>
          <button
            onClick={() => toggleSubmenu(item.name)}
            className={`w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon size={20} className="flex-shrink-0" />
              {!isCollapsed && <span className="font-medium">{item.name}</span>}
            </div>
            {!isCollapsed && (
              isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />
            )}
          </button>
          
          {isOpen && !isCollapsed && (
            <div className="bg-gray-750">
              {item.submenu.map((subItem, subIndex) => {
                const SubIcon = subItem.icon;
                return (
                  <NavLink
                    key={subIndex}
                    to={subItem.href}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-2 pl-12 text-sm ${
                        isActive
                          ? 'bg-emerald-600 text-white'
                          : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                      } transition-colors`
                    }
                  >
                    <SubIcon size={16} />
                    <span>{subItem.name}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    const Icon = item.icon;
    return (
      <NavLink
        key={index}
        to={item.href}
        className={({ isActive }) =>
          `flex items-center gap-3 px-4 py-3 ${
            isActive
              ? 'bg-emerald-600 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          } transition-colors ${isCollapsed ? 'justify-center' : ''}`
        }
        title={isCollapsed ? item.name : ''}
      >
        <Icon size={20} className="flex-shrink-0" />
        {!isCollapsed && <span className="font-medium">{item.name}</span>}
      </NavLink>
    );
  };

  if (!user) return null;

  return (
    <>
      {/* Overlay para móvil */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen bg-gray-800 shadow-lg transition-all duration-300 z-50 flex flex-col ${
          isCollapsed ? 'w-16' : 'w-64'
        } md:translate-x-0 ${isCollapsed ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}`}
      >
      {/* Header con Logo */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!isCollapsed ? (
          <>
            <NavLink 
              to="/" 
              className="flex items-center gap-2 text-white hover:text-emerald-400 transition-colors"
            >
              <Leaf className="text-emerald-400" size={24} />
              <span className="font-bold text-lg">El Edén</span>
            </NavLink>
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 w-full">
            <NavLink 
              to="/" 
              className="flex items-center justify-center text-white hover:text-emerald-400 transition-colors"
              title="Ir al inicio"
            >
              <Leaf className="text-emerald-400" size={24} />
            </NavLink>
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              title="Expandir menú"
            >
              <Menu size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item, index) => renderMenuItem(item, index))}
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-gray-700">
        <div className={`p-4 ${isCollapsed ? 'flex justify-center' : ''}`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3 mb-3">
              <img
                className="h-10 w-10 rounded-full"
                src={`https://ui-avatars.com/api/?name=${user?.first_name}+${user?.last_name}&background=10b981&color=fff`}
                alt={`${user?.first_name} ${user?.last_name}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
              <div className="relative" ref={notificationsMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationsOpen((prev) => !prev);
                    if (!isNotificationsOpen) loadNotifications();
                  }}
                  className="relative p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-700"
                  title="Notificaciones"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {isNotificationsOpen && (
                  <div className="origin-bottom-left absolute left-0 bottom-10 w-80 rounded-md shadow-lg py-2 bg-gray-900 ring-1 ring-black ring-opacity-40 z-50">
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
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 mb-3" ref={notificationsMenuRef}>
              <img
                className="h-10 w-10 rounded-full"
                src={`https://ui-avatars.com/api/?name=${user?.first_name}+${user?.last_name}&background=10b981&color=fff`}
                alt={`${user?.first_name} ${user?.last_name}`}
              />
              <button
                type="button"
                onClick={() => {
                  setIsNotificationsOpen((prev) => !prev);
                  if (!isNotificationsOpen) loadNotifications();
                }}
                className="relative p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-700"
                title="Notificaciones"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                    {unreadCount}
                  </span>
                )}
              </button>
              {isNotificationsOpen && (
                <div className="origin-bottom-left absolute left-16 bottom-12 w-80 rounded-md shadow-lg py-2 bg-gray-900 ring-1 ring-black ring-opacity-40 z-50">
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
          
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={isCollapsed ? 'Cerrar Sesión' : ''}
          >
            <LogOut size={20} />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </div>
    </div>

    {selectedNotification && (
      <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center px-4">
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
    </>
  );
};

export default Sidebar;
