import { useState } from 'react';
import { useWorkOrders, useProductionSessions, useDefects, useInspections } from '../../../hooks';
import { FileText, Download, Calendar, BarChart3, Shield, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { formatDate } from '../../../lib/utils';

type ReportType = 'production' | 'quality' | 'oee' | 'downtime' | 'reject' | 'audit';

interface Report {
  name: string;
  nameId: string;
  description: string;
  type: ReportType;
  icon: React.ElementType;
  color: string;
  iconBg: string;
}

const reports: Report[] = [
  {
    name: 'Production Summary Report',
    nameId: 'Laporan Rekapitulasi Produksi',
    description: 'Rekapitulasi harian/mingguan output SIR 20, target vs realisasi per shift & line',
    type: 'production',
    icon: BarChart3,
    color: 'text-blue-600',
    iconBg: 'bg-blue-100',
  },
  {
    name: 'Quality Report',
    nameId: 'Laporan Mutu SIR 20',
    description: 'Pass rate, defek, parameter uji SNI 06-1903-2000: ash content, volatile matter, PRI, Po',
    type: 'quality',
    icon: Shield,
    color: 'text-green-600',
    iconBg: 'bg-green-100',
  },
  {
    name: 'OEE Report',
    nameId: 'Laporan OEE Mesin',
    description: 'Overall Equipment Effectiveness — availability, performance, quality tiap mesin',
    type: 'oee',
    icon: Clock,
    color: 'text-purple-600',
    iconBg: 'bg-purple-100',
  },
  {
    name: 'Downtime Report',
    nameId: 'Laporan Downtime Mesin',
    description: 'Analisis downtime per kategori, mesin, dan shift. Pareto penyebab henti produksi',
    type: 'downtime',
    icon: AlertTriangle,
    color: 'text-orange-600',
    iconBg: 'bg-orange-100',
  },
  {
    name: 'Reject Report',
    nameId: 'Laporan Reject & Defek',
    description: 'Analisis produk reject per tipe, disposisi, dan tindakan perbaikan',
    type: 'reject',
    icon: AlertTriangle,
    color: 'text-red-600',
    iconBg: 'bg-red-100',
  },
  {
    name: 'Audit Trail',
    nameId: 'Laporan Audit Log',
    description: 'Riwayat lengkap semua aktivitas sistem: login, perubahan data, approval',
    type: 'audit',
    icon: FileText,
    color: 'text-gray-600',
    iconBg: 'bg-gray-100',
  },
];

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [generating, setGenerating] = useState<ReportType | null>(null);
  const [generated, setGenerated] = useState<ReportType | null>(null);

  const { data: workOrders } = useWorkOrders();
  const { data: sessions } = useProductionSessions();
  const { data: defects } = useDefects();
  const { data: inspections } = useInspections();

  const now = new Date();
  const activeWO = workOrders?.filter(w => w.status === 'ACTIVE').length || 0;
  const completedWO = workOrders?.filter(w => w.status === 'COMPLETED').length || 0;
  const activeSessions = sessions?.filter(s => s.status === 'ACTIVE').length || 0;
  const completedSessions = sessions?.filter(s => s.status === 'COMPLETED').length || 0;

  const thisMonthSessions = sessions?.filter(s => {
    const d = new Date(s.session_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }) || [];

  const totalActual = thisMonthSessions.reduce((a, s) => a + (s.actual_production || 0), 0);
  const totalTarget = thisMonthSessions.reduce((a, s) => a + (s.target_production || 0), 0);
  const achievement = totalTarget > 0 ? ((totalActual / totalTarget) * 100).toFixed(1) : '0';

  const openDefects = defects?.filter(d => d.status === 'OPEN').length || 0;
  const avgPassRate = inspections?.length
    ? (inspections.reduce((a, i) => a + (i.pass_rate || 0), 0) / inspections.length).toFixed(1)
    : '—';

  const handleGenerate = async (type: ReportType) => {
    setGenerating(type);
    setGenerated(null);
    await new Promise(r => setTimeout(r, 1200));
    setGenerating(null);
    setGenerated(type);
    setTimeout(() => setGenerated(null), 3000);
  };

  // Preview table data
  const previewSessions = sessions?.filter(s => {
    const d = s.session_date;
    return d >= startDate && d <= endDate;
  }).slice(0, 8) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Laporan & Analytics</h1>
        <p className="text-gray-500 text-sm">Generate dan ekspor laporan produksi SIR 20</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Work Order Aktif" value={activeWO} sub={`${completedWO} selesai`} color="text-blue-600" />
        <StatCard label="Sesi Aktif" value={activeSessions} sub={`${completedSessions} selesai`} color="text-green-600" />
        <StatCard label="Produksi Bulan Ini" value={`${totalActual.toLocaleString('id-ID')} ton`} sub={`${achievement}% dari target`} />
        <StatCard
          label="Pass Rate QC"
          value={avgPassRate === '—' ? '—' : `${avgPassRate}%`}
          sub={`${openDefects} defek terbuka`}
          color={parseFloat(avgPassRate) >= 95 ? 'text-green-600' : 'text-amber-600'}
        />
      </div>

      {/* Date range filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Periode Laporan:</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Dari</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Sampai</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
          />
        </div>
        <span className="text-xs text-gray-400">
          {previewSessions.length} sesi ditemukan dalam periode ini
        </span>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {reports.map((report) => (
          <div
            key={report.type}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${report.iconBg} flex items-center justify-center`}>
                <report.icon className={`w-5 h-5 ${report.color}`} />
              </div>
              {generated === report.type ? (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <CheckCircle className="w-4 h-4" /> Siap diunduh
                </span>
              ) : (
                <button
                  onClick={() => handleGenerate(report.type)}
                  disabled={generating === report.type}
                  className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-0.5">{report.nameId}</h3>
            <p className="text-xs text-gray-400 mb-1">{report.name}</p>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">{report.description}</p>
            <button
              onClick={() => handleGenerate(report.type)}
              disabled={generating !== null}
              className={`w-full py-2 text-sm rounded-lg border transition-colors font-medium disabled:opacity-50 ${
                generated === report.type
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : generating === report.type
                  ? 'border-gray-200 bg-gray-50 text-gray-500'
                  : `${report.color} border-current hover:bg-gray-50`
              }`}
            >
              {generating === report.type
                ? '⏳ Memproses...'
                : generated === report.type
                ? '✓ Berhasil digenerate'
                : 'Generate Laporan'
              }
            </button>
          </div>
        ))}
      </div>

      {/* Preview Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Preview Data Produksi</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {startDate} s/d {endDate} · {previewSessions.length} sesi
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">No. Sesi</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Batch</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Target (ton)</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Realisasi (ton)</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Pencapaian</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {previewSessions.length > 0 ? (
                previewSessions.map(s => {
                  const pct = s.target_production > 0
                    ? (s.actual_production / s.target_production) * 100
                    : 0;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">{s.session_number}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{formatDate(s.session_date)}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{s.batch || '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-900 text-right">{s.target_production}</td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-900 text-right">{s.actual_production}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`text-sm font-medium ${pct >= 100 ? 'text-green-600' : pct >= 80 ? 'text-amber-600' : 'text-red-500'}`}>
                          {pct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          s.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                          s.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center">
                    <BarChart3 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Tidak ada data dalam periode yang dipilih</p>
                  </td>
                </tr>
              )}
            </tbody>
            {previewSessions.length > 0 && (
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={3} className="px-5 py-3 text-xs font-semibold text-gray-600">TOTAL</td>
                  <td className="px-5 py-3 text-sm font-bold text-gray-900 text-right">
                    {previewSessions.reduce((a, s) => a + s.target_production, 0)} ton
                  </td>
                  <td className="px-5 py-3 text-sm font-bold text-gray-900 text-right">
                    {previewSessions.reduce((a, s) => a + s.actual_production, 0)} ton
                  </td>
                  <td className="px-5 py-3 text-sm font-bold text-right">
                    {(() => {
                      const t = previewSessions.reduce((a, s) => a + s.target_production, 0);
                      const r = previewSessions.reduce((a, s) => a + s.actual_production, 0);
                      return t > 0 ? <span className={r/t >= 1 ? 'text-green-600' : 'text-amber-600'}>{((r/t)*100).toFixed(1)}%</span> : '—';
                    })()}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
