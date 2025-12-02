import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { 
  Leaf, Menu, X, User, LogOut, Home, ShoppingCart, 
  Package, Users, Wrench, ClipboardList, Tag, Building2,
  FileText, Plus, ChevronDown, ChevronRight, LayoutDashboard,
  ShoppingBag, ListChecks, Palette, ShieldCheck
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [openSubmenu, setOpenSubmenu] = useState(null);

  const isAdmin = user && (user.is_staff || user.is_superuser || user.perfil?.tipo_usuario === 'administrador' || user.groups?.includes('Administradores'));
  const isEmpleado = user && (user.perfil?.tipo_usuario === 'empleado' || user.groups?.includes('Empleados'));
  const isCliente = user && !isAdmin && !isEmpleado;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
        { 
          name: 'Inventario', 
          icon: Package,
          submenu: [
            { name: 'Productos', href: '/productos', icon: ShoppingCart },
            { name: 'Categorías', href: '/categorias', icon: Tag },
            { name: 'Marcas', href: '/marcas', icon: Tag },
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
            </div>
          ) : (
            <img
              className="h-10 w-10 rounded-full mb-3"
              src={`https://ui-avatars.com/api/?name=${user?.first_name}+${user?.last_name}&background=10b981&color=fff`}
              alt={`${user?.first_name} ${user?.last_name}`}
            />
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
    </>
  );
};

export default Sidebar;
