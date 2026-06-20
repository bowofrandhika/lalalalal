import { Link } from 'react-router-dom';
import { useProductionSessions, useWorkOrders, useOEESummary, useOverdueMaintenance, useDefects } from '../../hooks';
import {
  ClipboardList, CalendarDays, AlertTriangle, BarChart3,
  TrendingUp, TrendingDown, Activity, Package,
  Clock, CheckCircle, Wrench, ChevronRight, Leaf
} from 'lucide-react';
import { formatDate, getStatusColor } from '../../lib/utils';

export default function DashboardPage() {
  const { data: sessions } = useProductionSessions({ status: 'ACTIVE' });
  const { data: allSessions } = useProductionSessions();
  const { data: workOrders } = useWorkOrders({ status: 'ACTIVE' });
  const { data: oeeSummary } = useOEESummary();
  const { data: overdue } = useOverdueMaintenance();
  const { data: defects } = useDefects({ status: 'OPEN' });

  const today = new Date().toISOString().split('T')[0];
  const todaySessions = sessions?.filter(s => s.session_date === today) || [];

  const completedThisMonth = allSessions?.filter(s => {
    const d = new Date(s.session_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && s.status === 'COMPLETED';
  }) || [];

  const totalActualProd = completedThisMonth.reduce((acc, s) => acc + (s.actual_production || 0), 0);
  const totalTargetProd = completedThisMonth.reduce((acc, s) => acc + (s.target_production || 0), 0);
  const achievementRate = totalTargetProd > 0 ? (totalActualProd / totalTargetProd) * 100 : 0;

  const kpis = [
    {
      name: 'Work Orders Aktif',
      value: workOrders?.length || 0,
      icon: ClipboardList,
      color: 'bg-blue-500',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      href: '/work-orders',
      subtitle: 'Sedang berjalan'
    },
    {
      name: 'Sesi Produksi Hari Ini',
      value: todaySessions.length,
      icon: CalendarDays,
      color: 'bg-green-500',
      bg: 'bg-green-50',
      text: 'text-green-600',
      href: '/daily-instructions',
      subtitle: 'Sesi aktif'
    },
    {
      name: 'Defek Terbuka',
      value: defects?.length || 0,
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      bg: 'bg-yellow-50',
      text: 'text-yellow-600',
      href: '/quality',
      subtitle: 'Perlu ditindaklanjuti'
    },
    {
      name: 'Maintenance Terlambat',
      value: overdue?.length || 0,
      icon: Wrench,
      color: 'bg-red-500',
      bg: 'bg-red-50',
      text: 'text-red-600',
      href: '/maintenance',
      subtitle: overdue?.length ? '⚠ Perlu tindakan segera' : 'Semua terjadwal'
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Leaf className="w-5 h-5 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Produksi SIR 20</h1>
          </div>
          <p className="text-gray-500 text-sm">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link
          to="/daily-instructions/new"
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium gap-2"
        >
          <CalendarDays className="w-4 h-4" />
          Buat Sesi Baru
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => (
          <Link
            key={kpi.name}
            to={kpi.href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${kpi.color} flex items-center justify-center`}>
                <kpi.icon className="w-5 h-5 text-white" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
            <p className={`text-2xl font-bold ${kpi.text}`}>{kpi.value}</p>
            <p className="text-sm font-medium text-gray-700 mt-0.5">{kpi.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{kpi.subtitle}</p>
          </Link>
        ))}
      </div>

      {/* Production Achievement + OEE Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Monthly production */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Produksi Bulan Ini</h2>
          <div className="flex items-end gap-3 mb-4">
            <div>
              <p className="text-3xl font-bold text-gray-900">{totalActualProd.toLocaleString('id-ID')}</p>
              <p className="text-xs text-gray-500 mt-0.5">ton realisasi</p>
            </div>
            <div className="pb-1">
              <span className={`text-sm font-medium ${achievementRate >= 100 ? 'text-green-600' : achievementRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                {achievementRate.toFixed(1)}%
              </span>
              <p className="text-xs text-gray-400">dari target</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Target: {totalTargetProd.toLocaleString('id-ID')} ton</span>
              <span>{completedThisMonth.length} sesi selesai</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  achievementRate >= 100 ? 'bg-green-500' : achievementRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(achievementRate, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* OEE Summary */}
        {oeeSummary ? (
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">OEE Performance</h2>
              <Link to="/oee" className="text-xs text-green-600 hover:text-green-700">Lihat detail →</Link>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { name: 'Availability', value: oeeSummary.avgAvailability, target: 85, icon: Clock },
                { name: 'Performance', value: oeeSummary.avgPerformance, target: 90, icon: TrendingUp },
                { name: 'Quality', value: oeeSummary.avgQuality, target: 95, icon: Package },
                { name: 'OEE', value: oeeSummary.avgOEE, target: 77, icon: Activity, highlight: true },
              ].map(m => (
                <div key={m.name} className={`p-3 rounded-lg ${m.highlight ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">{m.name}</span>
                    {m.value >= m.target
                      ? <TrendingUp className="w-3 h-3 text-green-500" />
                      : <TrendingDown className="w-3 h-3 text-red-500" />
                    }
                  </div>
                  <p className={`text-xl font-bold ${m.highlight ? 'text-green-600' : 'text-gray-800'}`}>
                    {m.value.toFixed(1)}%
                  </p>
                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${m.value >= m.target ? 'bg-green-500' : 'bg-yellow-500'}`}
                      style={{ width: `${Math.min(m.value, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Target {m.target}%</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Data OEE belum tersedia</p>
              <p className="text-xs mt-1">Data muncul setelah sesi produksi diselesaikan</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Row: Recent sessions + Overdue maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Sessions */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Sesi Produksi Aktif</h2>
            <Link to="/daily-instructions" className="text-xs text-green-600 hover:text-green-700">Lihat semua →</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {todaySessions.length > 0 ? (
              todaySessions.slice(0, 5).map((session) => (
                <Link
                  key={session.id}
                  to={`/daily-instructions/${session.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{session.session_number}</p>
                    <p className="text-xs text-gray-500">{session.batch || '—'} · {formatDate(session.session_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {session.actual_production}/{session.target_production} ton
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-5 py-8 text-center">
                <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Tidak ada sesi aktif hari ini</p>
                <Link to="/daily-instructions/new" className="text-xs text-green-600 hover:underline mt-1 block">
                  Buat sesi baru →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Overdue Maintenance */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Maintenance Perlu Perhatian</h2>
            <Link to="/maintenance" className="text-xs text-green-600 hover:text-green-700">Lihat semua →</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {overdue && overdue.length > 0 ? (
              overdue.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-5 py-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    item.priority === 'CRITICAL' ? 'bg-red-500' :
                    item.priority === 'HIGH' ? 'bg-orange-500' : 'bg-yellow-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.equipment_name}</p>
                    <p className="text-xs text-gray-500">{item.maintenance_type} · Due: {formatDate(item.next_maintenance_date)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${getStatusColor(item.priority)}`}>
                    {item.priority}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Semua jadwal maintenance on track</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
