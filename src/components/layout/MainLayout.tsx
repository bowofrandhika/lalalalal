import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { useQuery } from '@tanstack/react-query';
import { woNotificationService } from '../../services';
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
  ScrollText,
  Bell
} from 'lucide-react';

interface NavItem {
  name: string;
  path?: string;
  icon: ReactNode;
  roles?: string[];
  children?: NavItem[];
}

// Role hierarchy for access control
const ROLE_RANK: Record<string, number> = {
  SUPER_USER: 6, ADMIN: 5, SPV: 4, MANDOR: 3, DRYER_OPERATOR: 2, PACKING_OPERATOR: 2
};

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  {
    name: 'Work Orders',
    path: '/work-orders',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['SUPER_USER', 'ADMIN', 'SPV']
  },
  {
    name: 'Daily Instructions',
    path: '/daily-instructions',
    icon: <CalendarDays className="w-5 h-5" />,
    roles: ['SUPER_USER', 'ADMIN', 'SPV', 'MANDOR']
  },
  {
    name: 'Production',
    icon: <Factory className="w-5 h-5" />,
    roles: ['SUPER_USER', 'ADMIN', 'SPV', 'MANDOR'],
    children: [
      { name: 'Pre-Production', path: '/pre-production', icon: <Settings className="w-4 h-4" /> },
      { name: 'Production Log', path: '/production', icon: <Package className="w-4 h-4" /> },
      { name: 'Dryer Monitoring', path: '/dryer', icon: <Gauge className="w-4 h-4" /> },
      { name: 'Packing (session)', path: '/packing', icon: <Package className="w-4 h-4" /> }
    ]
  },
  {
    name: 'Issues',
    icon: <AlertTriangle className="w-5 h-5" />,
    roles: ['SUPER_USER', 'ADMIN', 'SPV', 'MANDOR'],
    children: [
      { name: 'Bottleneck', path: '/bottleneck', icon: <AlertTriangle className="w-4 h-4" /> },
      { name: 'Downtime', path: '/downtime', icon: <Clock className="w-4 h-4" /> }
    ]
  },
  {
    name: 'Reports',
    path: '/reports',
    icon: <FileText className="w-5 h-5" />,
    roles: ['SUPER_USER', 'ADMIN', 'SPV']
  },
  { name: 'OEE Dashboard', path: '/oee', icon: <BarChart3 className="w-5 h-5" />, roles: ['SUPER_USER', 'ADMIN', 'SPV'] },
  { name: 'Traceability', path: '/traceability', icon: <PackageSearch className="w-5 h-5" />, roles: ['SUPER_USER', 'ADMIN'] },
  { name: 'Maintenance', path: '/maintenance', icon: <Wrench className="w-5 h-5" />, roles: ['SUPER_USER', 'ADMIN', 'SPV'] },
  { name: 'Quality', path: '/quality', icon: <ShieldCheck className="w-5 h-5" />, roles: ['SUPER_USER', 'ADMIN', 'SPV'] },
  { name: 'Packing & Traceability', path: '/packing-workflow', icon: <ScrollText className="w-5 h-5" />, roles: ['SUPER_USER', 'ADMIN', 'SPV'] },
  {
    name: 'Admin',
    icon: <Settings className="w-5 h-5" />,
    roles: ['SUPER_USER', 'ADMIN'],
    children: [
      { name: 'Users', path: '/admin/users', icon: <Users className="w-4 h-4" /> },
      { name: 'Master Data', path: '/admin/master', icon: <Database className="w-4 h-4" /> },
      { name: 'Audit Log', path: '/admin/audit', icon: <ScrollText className="w-4 h-4" /> }
    ]
  }
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_USER: 'Super User',
  ADMIN: 'Administrator',
  SPV: 'Supervisor',
  MANDOR: 'Foreman',
  DRYER_OPERATOR: 'Dryer Operator',
  PACKING_OPERATOR: 'Packing Operator',
};

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { appUser, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['Production']));
  const [showNotifs, setShowNotifs] = useState(false);

  const userRole = appUser?.role || '';
  const userRank = ROLE_RANK[userRole] || 0;

  const canAccess = (roles?: string[]) => {
    if (!roles || roles.length === 0) return true;
    return roles.some(r => userRank >= (ROLE_RANK[r] || 0));
  };

  const { data: notifications = [] } = useQuery({
    queryKey: ['wo-notifications'],
    queryFn: () => woNotificationService.getPending(),
    refetchInterval: 30000,
    enabled: userRank >= 5,
  });

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

  const filteredNavItems = navItems.filter(item => canAccess(item.roles));

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
              className="w-11 h-11 flex-shrink-0 object-contain"
            />
            {sidebarOpen && (
              <div>
                <span className="text-sm font-bold text-blue-700 block leading-tight tracking-wide">POTENSI BUMI SAKTI</span>
                <span className="text-xs text-gray-500">Production System</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded-lg hover:bg-gray-100 flex-shrink-0"
          >
            {sidebarOpen ? <X className="w-4 h-4 text-gray-500" /> : <Menu className="w-4 h-4 text-gray-500" />}
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

        {/* User Info + Logout */}
        <div className="p-3 border-t border-gray-200 flex-shrink-0 space-y-2">
          {/* Notification Bell (Super User / Admin only) */}
          {userRank >= 5 && sidebarOpen && (
            <div className="relative">
              <button
                onClick={() => setShowNotifs(s => !s)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Bell className="w-4 h-4 flex-shrink-0" />
                <span>Notifications</span>
                {notifications.length > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
              {showNotifs && notifications.length > 0 && (
                <div className="absolute bottom-full left-0 mb-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="px-3 py-2 border-b border-gray-100 text-xs font-medium text-gray-600">
                    WO Completion Alerts
                  </div>
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      className="px-3 py-2 text-xs hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate('/work-orders')}
                    >
                      <p className="font-medium text-gray-900">
                        {(n as any).work_orders?.wo_number}
                      </p>
                      <p className="text-gray-500">
                        Reached {(n as any).work_orders?.qty_kg}kg target — confirm completion
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* User Avatar + Info */}
          <div className="flex items-center space-x-3">
            <div className="relative flex-shrink-0">
              {appUser?.photo_url ? (
                <img
                  src={appUser.photo_url}
                  alt={appUser.full_name}
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-700 font-semibold text-sm">
                    {appUser?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{appUser?.full_name || 'User'}</p>
                <p className="text-xs text-gray-500">{ROLE_LABELS[userRole] || userRole}</p>
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
