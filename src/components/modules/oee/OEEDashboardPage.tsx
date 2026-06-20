import { useState } from 'react';
import { useOEESummary, useProductionSessions } from '../../../hooks';
import { BarChart3, TrendingUp, TrendingDown, Clock, Package, Gauge } from 'lucide-react';

// Simple SVG bar chart component
function BarChart({ data, height = 160 }: { data: { label: string; value: number; color?: string }[]; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="w-full">
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-gray-500 font-medium">{d.value > 0 ? `${d.value.toFixed(0)}%` : ''}</span>
            <div className="w-full relative" style={{ height: height - 28 }}>
              <div
                className="absolute bottom-0 left-0 right-0 rounded-t transition-all"
                style={{
                  height: `${(d.value / max) * 100}%`,
                  backgroundColor: d.color || (d.value >= 77 ? '#22c55e' : d.value >= 60 ? '#f59e0b' : '#ef4444')
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-xs text-gray-400 truncate block">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Gauge / donut chart
function GaugeChart({ value, target, color }: { value: number; target: number; color: string }) {
  const pct = Math.min((value / 100) * 100, 100);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg viewBox="0 0 88 88" className="w-24 h-24 -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
        <circle
          cx="44" cy="44" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-lg font-bold text-gray-900 leading-none">{value.toFixed(0)}%</p>
        <p className="text-xs text-gray-400">/{target}%</p>
      </div>
    </div>
  );
}

export default function OEEDashboardPage() {
  const [dateRange, setDateRange] = useState('30');
  const { data: oeeSummary, isLoading } = useOEESummary();
  const { data: sessions } = useProductionSessions();

  // Build weekly bar data from sessions (last 7 days)
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const daySessions = sessions?.filter(s => s.session_date === dateStr) || [];
    const totalTarget = daySessions.reduce((a, s) => a + (s.target_production || 0), 0);
    const totalActual = daySessions.reduce((a, s) => a + (s.actual_production || 0), 0);
    const rate = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
    return {
      label: d.toLocaleDateString('id-ID', { weekday: 'short' }),
      value: Math.min(rate, 100),
    };
  });

  const metrics = [
    { name: 'Availability', value: oeeSummary?.avgAvailability || 0, target: 85, color: '#3b82f6', icon: Clock, desc: 'Waktu mesin siap produksi' },
    { name: 'Performance', value: oeeSummary?.avgPerformance || 0, target: 90, color: '#22c55e', icon: TrendingUp, desc: 'Output aktual vs ideal' },
    { name: 'Quality', value: oeeSummary?.avgQuality || 0, target: 95, color: '#a855f7', icon: Package, desc: 'Produk good vs total output' },
    { name: 'OEE', value: oeeSummary?.avgOEE || 0, target: 77, color: '#f59e0b', icon: Gauge, desc: 'Overall Equipment Effectiveness', highlight: true },
  ];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Memuat data OEE...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OEE Dashboard</h1>
          <p className="text-gray-500 text-sm">Overall Equipment Effectiveness — Monitoring Efisiensi Mesin</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
          >
            <option value="7">7 hari terakhir</option>
            <option value="30">30 hari terakhir</option>
            <option value="90">3 bulan terakhir</option>
          </select>
        </div>
      </div>

      {/* OEE Gauge Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {metrics.map(m => (
          <div key={m.name} className={`bg-white rounded-xl border p-5 ${m.highlight ? 'border-amber-200 bg-amber-50' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-700">{m.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
              </div>
              {m.value >= m.target
                ? <TrendingUp className="w-4 h-4 text-green-500 flex-shrink-0" />
                : <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0" />
              }
            </div>
            <div className="flex items-center justify-center">
              <GaugeChart value={m.value} target={m.target} color={m.value >= m.target ? '#22c55e' : m.color} />
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>0%</span>
                <span className="font-medium">Target: {m.target}%</span>
                <span>100%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(m.value, 100)}%`, backgroundColor: m.value >= m.target ? '#22c55e' : '#f59e0b' }}
                />
              </div>
            </div>
            <div className={`mt-2 text-center text-xs font-medium ${m.value >= m.target ? 'text-green-600' : 'text-amber-600'}`}>
              {m.value >= m.target ? '✓ Di atas target' : `${(m.target - m.value).toFixed(1)}% di bawah target`}
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Production trend chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Pencapaian Produksi — 7 Hari Terakhir</h2>
              <p className="text-xs text-gray-400 mt-0.5">% realisasi vs target per hari</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-500" /><span className="text-gray-500">≥ Target</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-400" /><span className="text-gray-500">&lt; Target</span></div>
            </div>
          </div>
          {sessions && sessions.length > 0 ? (
            <BarChart data={weeklyData} height={180} />
          ) : (
            <div className="h-44 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Data akan muncul setelah sesi produksi diselesaikan</p>
              </div>
            </div>
          )}
        </div>

        {/* OEE Component breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Ringkasan Komponen OEE</h2>
          <div className="space-y-4">
            {metrics.slice(0, 3).map(m => (
              <div key={m.name}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-600">{m.name}</span>
                  <span className="text-xs font-bold" style={{ color: m.value >= m.target ? '#22c55e' : '#f59e0b' }}>
                    {m.value.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(m.value, 100)}%`, backgroundColor: m.value >= m.target ? '#22c55e' : '#f59e0b' }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                  <span>Target: {m.target}%</span>
                  <span>{m.value >= m.target ? '✓' : `Gap: ${(m.target - m.value).toFixed(1)}%`}</span>
                </div>
              </div>
            ))}

            <div className="pt-3 border-t border-gray-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-gray-700">OEE Total</span>
                <span className={`text-sm font-bold ${(oeeSummary?.avgOEE || 0) >= 77 ? 'text-green-600' : 'text-amber-600'}`}>
                  {(oeeSummary?.avgOEE || 0).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{
                    width: `${Math.min(oeeSummary?.avgOEE || 0, 100)}%`,
                    backgroundColor: (oeeSummary?.avgOEE || 0) >= 77 ? '#22c55e' : '#f59e0b'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom stats */}
      <div className="grid grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Sesi Dianalisis</p>
          <p className="text-3xl font-bold text-gray-900">{oeeSummary?.count || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Sesi produksi selesai</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Target OEE Pabrik</p>
          <p className="text-3xl font-bold text-gray-900">77%</p>
          <p className="text-xs text-gray-400 mt-1">Standar industri karet</p>
        </div>
        <div className={`rounded-xl border p-5 ${(oeeSummary?.avgOEE || 0) >= 77 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className="text-xs font-medium text-gray-500 mb-1">Status Keseluruhan</p>
          <p className={`text-xl font-bold ${(oeeSummary?.avgOEE || 0) >= 77 ? 'text-green-600' : 'text-amber-600'}`}>
            {(oeeSummary?.avgOEE || 0) >= 77 ? '✓ On Target' : '⚠ Below Target'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {(oeeSummary?.avgOEE || 0) >= 77
              ? 'Efisiensi mesin sesuai target'
              : `Perlu perbaikan ${(77 - (oeeSummary?.avgOEE || 0)).toFixed(1)}%`}
          </p>
        </div>
      </div>
    </div>
  );
}
