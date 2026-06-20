import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Settings,
  Users,
  BarChart3,
  Wrench,
  ShieldCheck,
  PackageSearch,
  Gauge,
  AlertTriangle,
  Clock,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Factory,
  Package,
  FileText,
  Database,
  ScrollText
} from 'lucide-react';

interface NavItem {
  name: string;
  path?: string;
  icon: ReactNode;
  roles?: string[];
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { name: 'Work Orders', path: '/work-orders', icon: <ClipboardList className="w-5 h-5" />, roles: ['ADMIN', 'SPV'] },
  { name: 'Daily Instructions', path: '/daily-instructions', icon: <CalendarDays className="w-5 h-5" /> },
  { name: 'Packing & Traceability', path: '/packing-workflow', icon: <ScrollText className="w-5 h-5" /> },
  {
    name: 'Production',
    icon: <Factory className="w-5 h-5" />,
    children: [
      { name: 'Pre-Production', path: '/pre-production', icon: <Settings className="w-4 h-4" /> },
      { name: 'Production Process', path: '/production', icon: <Package className="w-4 h-4" /> },
      { name: 'Dryer Monitoring', path: '/dryer', icon: <Gauge className="w-4 h-4" /> },
      { name: 'Packing (per session)', path: '/packing', icon: <Package className="w-4 h-4" /> }
    ]
  },
  {
    name: 'Issues',
    icon: <AlertTriangle className="w-5 h-5" />,
    children: [
      { name: 'Bottleneck', path: '/bottleneck', icon: <AlertTriangle className="w-4 h-4" /> },
      { name: 'Downtime', path: '/downtime', icon: <Clock className="w-4 h-4" /> }
    ]
  },
  { name: 'OEE Dashboard', path: '/oee', icon: <BarChart3 className="w-5 h-5" /> },
  { name: 'Traceability', path: '/traceability', icon: <PackageSearch className="w-5 h-5" /> },
  { name: 'Maintenance', path: '/maintenance', icon: <Wrench className="w-5 h-5" /> },
  { name: 'Quality', path: '/quality', icon: <ShieldCheck className="w-5 h-5" /> },
  { name: 'Reports', path: '/reports', icon: <FileText className="w-5 h-5" /> },
  {
    name: 'Admin',
    icon: <Settings className="w-5 h-5" />,
    roles: ['ADMIN', 'SPV'],
    children: [
      { name: 'Users', path: '/admin/users', icon: <Users className="w-4 h-4" /> },
      { name: 'Master Data', path: '/admin/master', icon: <Database className="w-4 h-4" /> },
      { name: 'Audit Log', path: '/admin/audit', icon: <ScrollText className="w-4 h-4" /> }
    ]
  }
];

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, appUser, logout, hasRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['Production']));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleMenu = (name: string) => {
    setExpandedMenus(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.some(role => hasRole(role));
  });

  const isChildActive = (children: NavItem[]) =>
    children.some(c => c.path && location.pathname.startsWith(c.path));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <img
              src="/LOGO_PBS.png"
              alt="PBS Logo"
              className="w-9 h-9 flex-shrink-0 object-contain"
            />
            {sidebarOpen && (
              <div>
                <span className="text-sm font-bold text-gray-900 block leading-tight">POTENSI BUMI SAKTI</span>
                <span className="text-xs text-gray-500">Production System</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded-lg hover:bg-gray-100 flex-shrink-0"
          >
            {sidebarOpen ? (
              <X className="w-4 h-4 text-gray-500" />
            ) : (
              <Menu className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3">
          <ul className="space-y-0.5 px-2">
            {filteredNavItems.map((item) => (
              <li key={item.name}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                        isChildActive(item.children)
                          ? 'bg-green-50 text-green-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {item.icon}
                        {sidebarOpen && <span>{item.name}</span>}
                      </div>
                      {sidebarOpen && (
                        <ChevronDown
                          className={`w-4 h-4 transition-transform flex-shrink-0 ${
                            expandedMenus.has(item.name) ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                    </button>
                    {expandedMenus.has(item.name) && sidebarOpen && (
                      <ul className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-gray-100 pl-3">
                        {item.children.map((child) => (
                          <li key={child.name}>
                            <Link
                              to={child.path || '#'}
                              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                child.path && location.pathname.startsWith(child.path)
                                  ? 'bg-green-50 text-green-700 font-medium'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              {child.icon}
                              <span>{child.name}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    to={item.path!}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      location.pathname === item.path
                        ? 'bg-green-50 text-green-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.icon}
                    {sidebarOpen && <span>{item.name}</span>}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* User Info */}
        <div className="p-3 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <span className="text-green-700 font-semibold text-sm">
                {appUser?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{appUser?.full_name || 'User'}</p>
                <p className="text-xs text-gray-500">{appUser?.role}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center space-x-2 px-3 py-2 text-red-600 rounded-lg hover:bg-red-50 text-sm transition-colors ${
              !sidebarOpen ? 'justify-center' : ''
            }`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <div className="min-h-screen">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
