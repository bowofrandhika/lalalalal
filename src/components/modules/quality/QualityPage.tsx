import { useState } from 'react';
import {
  useInspections, useDefects, useCAPAs,
  useCreateInspection, useCreateDefect, useCreateCAPA,
  useApproveInspection, useResolveDefect
} from '../../../hooks';
import { Shield, AlertTriangle, CheckCircle, Plus, X, TestTube } from 'lucide-react';
import { formatDate, getStatusColor } from '../../../lib/utils';

type ActiveTab = 'inspections' | 'defects' | 'capa';

export default function QualityPage() {
  const { data: inspections, isLoading: loadingInsp } = useInspections();
  const { data: defects, isLoading: loadingDef } = useDefects();
  const { data: capas, isLoading: loadingCapa } = useCAPAs();

  const createInspection = useCreateInspection();
  const createDefect = useCreateDefect();
  const createCAPA = useCreateCAPA();
  const approveInspection = useApproveInspection();
  const resolveDefect = useResolveDefect();

  const [activeTab, setActiveTab] = useState<ActiveTab>('inspections');
  const [showInspModal, setShowInspModal] = useState(false);
  const [showDefectModal, setShowDefectModal] = useState(false);
  const [showCAPAModal, setShowCAPAModal] = useState(false);

  // Form states
  const [inspForm, setInspForm] = useState({
    inspection_date: new Date().toISOString().split('T')[0],
    inspection_type: 'IN_PROCESS' as const,
    sample_qty: 0,
    passed_qty: 0,
    failed_qty: 0,
    inspection_result: 'PENDING' as const,
    observations: '',
    status: 'DRAFT' as const,
  });

  const [defectForm, setDefectForm] = useState({
    defect_time: new Date().toISOString().slice(0, 16),
    defect_type: '',
    defect_category: '',
    defect_severity: 'MINOR' as const,
    defect_qty: 1,
    defect_description: '',
    process_step: '',
    status: 'OPEN' as const,
  });

  const [capaForm, setCAPAForm] = useState({
    capa_number: `CAPA-${Date.now().toString().slice(-6)}`,
    capa_type: 'CORRECTIVE' as const,
    source: 'INSPECTION' as const,
    problem_statement: '',
    root_cause_analysis: '',
    immediate_action: '',
  });

  const pendingInspections = inspections?.filter(i => i.status === 'DRAFT' || i.status === 'SUBMITTED').length || 0;
  const openDefects = defects?.filter(d => d.status === 'OPEN' || d.status === 'IN_PROGRESS').length || 0;
  const openCAPAs = capas?.filter(c => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length || 0;

  const avgPassRate = inspections?.length
    ? inspections.reduce((acc, i) => acc + (i.pass_rate || 0), 0) / inspections.length
    : 0;

  const handleCreateInspection = async () => {
    const pass_rate = inspForm.sample_qty > 0
      ? (inspForm.passed_qty / inspForm.sample_qty) * 100
      : 0;
    await createInspection.mutateAsync({ ...inspForm, pass_rate });
    setShowInspModal(false);
    setInspForm({ ...inspForm, observations: '', sample_qty: 0, passed_qty: 0, failed_qty: 0 });
  };

  const handleCreateDefect = async () => {
    await createDefect.mutateAsync(defectForm);
    setShowDefectModal(false);
    setDefectForm({ ...defectForm, defect_type: '', defect_description: '', defect_qty: 1 });
  };

  const handleCreateCAPA = async () => {
    await createCAPA.mutateAsync(capaForm);
    setShowCAPAModal(false);
    setCAPAForm({ ...capaForm, problem_statement: '', root_cause_analysis: '', immediate_action: '', capa_number: `CAPA-${Date.now().toString().slice(-6)}` });
  };

  const tabs: { key: ActiveTab; label: string; count: number }[] = [
    { key: 'inspections', label: 'Inspeksi', count: pendingInspections },
    { key: 'defects', label: 'Defek', count: openDefects },
    { key: 'capa', label: 'CAPA', count: openCAPAs },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quality Management</h1>
          <p className="text-gray-500 text-sm">Inspeksi, defek, dan pengendalian mutu SIR 20</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'inspections' && (
            <button onClick={() => setShowInspModal(true)} className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 gap-2 text-sm">
              <Plus className="w-4 h-4" /> Inspeksi Baru
            </button>
          )}
          {activeTab === 'defects' && (
            <button onClick={() => setShowDefectModal(true)} className="inline-flex items-center px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 gap-2 text-sm">
              <Plus className="w-4 h-4" /> Catat Defek
            </button>
          )}
          {activeTab === 'capa' && (
            <button onClick={() => setShowCAPAModal(true)} className="inline-flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 gap-2 text-sm">
              <Plus className="w-4 h-4" /> Buat CAPA
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <TestTube className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{avgPassRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500">Rata-rata Pass Rate</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{pendingInspections}</p>
            <p className="text-xs text-gray-500">Inspeksi Pending</p>
          </div>
        </div>
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${openDefects > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
          <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className={`text-xl font-bold ${openDefects > 0 ? 'text-yellow-700' : 'text-gray-900'}`}>{openDefects}</p>
            <p className="text-xs text-gray-500">Defek Terbuka</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{openCAPAs}</p>
            <p className="text-xs text-gray-500">CAPA Terbuka</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.key ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Inspections Tab */}
      {activeTab === 'inspections' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loadingInsp ? (
            <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" /></div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tipe</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sample</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Lulus</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Pass Rate</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Hasil</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inspections && inspections.length > 0 ? (
                  inspections.slice(0, 15).map(i => (
                    <tr key={i.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3.5 text-sm text-gray-900">{formatDate(i.inspection_date)}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{i.inspection_type}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-900">{i.sample_qty}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-900">{i.passed_qty}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{(i.pass_rate || 0).toFixed(1)}%</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(i.inspection_result)}`}>
                          {i.inspection_result}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(i.status)}`}>
                          {i.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {(i.status === 'DRAFT' || i.status === 'SUBMITTED') && (
                          <button
                            onClick={() => approveInspection.mutateAsync(i.id)}
                            className="text-xs text-green-600 hover:text-green-800 font-medium"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-gray-400">
                      <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Belum ada data inspeksi</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Defects Tab */}
      {activeTab === 'defects' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loadingDef ? (
            <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" /></div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Waktu</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tipe Defek</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Qty</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Severity</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Proses</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {defects && defects.length > 0 ? (
                  defects.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3.5 text-sm text-gray-900">{formatDate(d.defect_time)}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{d.defect_type}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-900">{d.defect_qty}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(d.defect_severity)}`}>
                          {d.defect_severity}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{d.process_step || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(d.status)}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {(d.status === 'OPEN' || d.status === 'IN_PROGRESS') && (
                          <button
                            onClick={() => resolveDefect.mutateAsync({ id: d.id })}
                            className="text-xs text-green-600 hover:text-green-800 font-medium"
                          >
                            Selesai
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                      <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30 text-green-400" />
                      <p className="text-sm">Tidak ada defek terbuka</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CAPA Tab */}
      {activeTab === 'capa' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loadingCapa ? (
            <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" /></div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">No. CAPA</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tipe</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sumber</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Pernyataan Masalah</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {capas && capas.length > 0 ? (
                  capas.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3.5 text-sm font-mono font-medium text-gray-900">{c.capa_number}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{c.capa_type}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{c.source || '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-900 max-w-xs truncate">{c.problem_statement}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(c.status)}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                      <p className="text-sm">Belum ada CAPA</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal Inspeksi */}
      {showInspModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Inspeksi Baru</h3>
              <button onClick={() => setShowInspModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal Inspeksi</label>
                  <input type="date" value={inspForm.inspection_date} onChange={e => setInspForm({...inspForm, inspection_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipe Inspeksi</label>
                  <select value={inspForm.inspection_type} onChange={e => setInspForm({...inspForm, inspection_type: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500">
                    <option value="INCOMING">Incoming</option>
                    <option value="IN_PROCESS">In Process</option>
                    <option value="FINAL">Final</option>
                    <option value="OUTGOING">Outgoing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Jumlah Sample</label>
                  <input type="number" min="0" value={inspForm.sample_qty} onChange={e => setInspForm({...inspForm, sample_qty: +e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Jumlah Lulus</label>
                  <input type="number" min="0" max={inspForm.sample_qty} value={inspForm.passed_qty} onChange={e => setInspForm({...inspForm, passed_qty: +e.target.value, failed_qty: inspForm.sample_qty - +e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Hasil</label>
                  <select value={inspForm.inspection_result} onChange={e => setInspForm({...inspForm, inspection_result: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500">
                    <option value="PENDING">Pending</option>
                    <option value="PASSED">Passed</option>
                    <option value="FAILED">Failed</option>
                    <option value="CONDITIONAL">Conditional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Pass Rate</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-green-700">
                    {inspForm.sample_qty > 0 ? ((inspForm.passed_qty / inspForm.sample_qty) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Observasi</label>
                <textarea value={inspForm.observations} onChange={e => setInspForm({...inspForm, observations: e.target.value})}
                  rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Catatan hasil inspeksi..." />
              </div>
              <div className="flex gap-3">
                <button onClick={handleCreateInspection} disabled={createInspection.isPending}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50">
                  {createInspection.isPending ? 'Menyimpan...' : 'Simpan Inspeksi'}
                </button>
                <button onClick={() => setShowInspModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Defek */}
      {showDefectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Catat Defek</h3>
              <button onClick={() => setShowDefectModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipe Defek *</label>
                  <input value={defectForm.defect_type} onChange={e => setDefectForm({...defectForm, defect_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    placeholder="cth: Ash content tinggi" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Severity</label>
                  <select value={defectForm.defect_severity} onChange={e => setDefectForm({...defectForm, defect_severity: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500">
                    <option value="MINOR">Minor</option>
                    <option value="MAJOR">Major</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Jumlah (bale)</label>
                  <input type="number" min="1" value={defectForm.defect_qty} onChange={e => setDefectForm({...defectForm, defect_qty: +e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Langkah Proses</label>
                  <input value={defectForm.process_step} onChange={e => setDefectForm({...defectForm, process_step: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    placeholder="cth: Drying" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea value={defectForm.defect_description} onChange={e => setDefectForm({...defectForm, defect_description: e.target.value})}
                  rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Jelaskan defek..." />
              </div>
              <div className="flex gap-3">
                <button onClick={handleCreateDefect} disabled={createDefect.isPending || !defectForm.defect_type}
                  className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium disabled:opacity-50">
                  {createDefect.isPending ? 'Menyimpan...' : 'Simpan Defek'}
                </button>
                <button onClick={() => setShowDefectModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal CAPA */}
      {showCAPAModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Buat CAPA Baru</h3>
              <button onClick={() => setShowCAPAModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">No. CAPA</label>
                  <input value={capaForm.capa_number} readOnly
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipe</label>
                  <select value={capaForm.capa_type} onChange={e => setCAPAForm({...capaForm, capa_type: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500">
                    <option value="CORRECTIVE">Corrective</option>
                    <option value="PREVENTIVE">Preventive</option>
                    <option value="BOTH">Both</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sumber</label>
                  <select value={capaForm.source} onChange={e => setCAPAForm({...capaForm, source: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500">
                    <option value="INSPECTION">Inspection</option>
                    <option value="CUSTOMER_COMPLAINT">Customer Complaint</option>
                    <option value="INTERNAL_AUDIT">Internal Audit</option>
                    <option value="PROCESS_DEVIATION">Process Deviation</option>
                    <option value="REJECT_ANALYSIS">Reject Analysis</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Pernyataan Masalah *</label>
                <textarea value={capaForm.problem_statement} onChange={e => setCAPAForm({...capaForm, problem_statement: e.target.value})}
                  rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Deskripsikan masalah..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tindakan Segera</label>
                <textarea value={capaForm.immediate_action} onChange={e => setCAPAForm({...capaForm, immediate_action: e.target.value})}
                  rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Tindakan yang sudah diambil..." />
              </div>
              <div className="flex gap-3">
                <button onClick={handleCreateCAPA} disabled={createCAPA.isPending || !capaForm.problem_statement}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium disabled:opacity-50">
                  {createCAPA.isPending ? 'Menyimpan...' : 'Buat CAPA'}
                </button>
                <button onClick={() => setShowCAPAModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
