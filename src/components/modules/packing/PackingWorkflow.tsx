import { useState, useMemo } from 'react';
import {
  Package, CheckCircle, AlertTriangle, Clock, Weight,
  ShieldCheck, Truck, RefreshCw, ChevronRight, Plus,
  X, Info, ArrowRight, Eye
} from 'lucide-react';
import type { Pallet, PalletStatus, PalletCondition, PalletTreatment } from '../../../types/database';

// ─── Mock data ───────────────────────────────────────────────────────────────
const MOCK_SESSIONS = [
  { id: 's1', session_number: 'PBS.DP.190626.1.AB.0001', wo: 'PBS.WO.300626.BEL.0001', batch: 'SIR-2252', shift: 'Morning', line: 'AB', date: '2026-06-19', operator: 'Ahmad Fauzi' },
  { id: 's2', session_number: 'PBS.DP.190626.2.A.0001',  wo: 'PBS.WO.150726.KAM.0001', batch: 'SIR-2253', shift: 'Afternoon', line: 'A',  date: '2026-06-19', operator: 'Budi Santoso' },
];

const INIT_PALLETS: Pallet[] = [
  { id:'p1', production_session_id:'s1', lot_number:'L001', pallet_id:'B0001', bale_qty:36, weight_kg:1260, condition:'OK',           status:'READY_FG',               treatment:null,       remarks:null, weighting_start:'2026-06-19T08:00:00Z', weighting_end:'2026-06-19T10:00:00Z', plastic_condition:'OK', pallet_condition:'OK', released_by:null, released_at:null, reprocess_reason:null, reprocess_date:null, created_at:'2026-06-19T06:00:00Z', updated_at:'2026-06-19T10:05:00Z' },
  { id:'p2', production_session_id:'s1', lot_number:'L001', pallet_id:'B0002', bale_qty:36, weight_kg:1260, condition:'WHITE_SPOT',    status:'REJECT',                 treatment:null,       remarks:'Ditemukan 3 bale WS', weighting_start:null, weighting_end:null, plastic_condition:null, pallet_condition:null, released_by:null, released_at:null, reprocess_reason:null, reprocess_date:null, created_at:'2026-06-19T06:10:00Z', updated_at:'2026-06-19T07:30:00Z' },
  { id:'p3', production_session_id:'s1', lot_number:'L001', pallet_id:'B0003', bale_qty:36, weight_kg:1260, condition:'OK',           status:'WAITING_STONE_WEIGHTING', treatment:null,       remarks:null, weighting_start:null, weighting_end:null, plastic_condition:null, pallet_condition:null, released_by:null, released_at:null, reprocess_reason:null, reprocess_date:null, created_at:'2026-06-19T06:20:00Z', updated_at:'2026-06-19T07:45:00Z' },
  { id:'p4', production_session_id:'s1', lot_number:'L001', pallet_id:'B0004', bale_qty:36, weight_kg:1260, condition:'CONTAMINATION', status:'RE_CHECK',               treatment:'RE_CHECK', remarks:'Suspect contamination oli', weighting_start:null, weighting_end:null, plastic_condition:null, pallet_condition:null, released_by:null, released_at:null, reprocess_reason:null, reprocess_date:null, created_at:'2026-06-19T06:30:00Z', updated_at:'2026-06-19T08:00:00Z' },
  { id:'p5', production_session_id:'s1', lot_number:'L001', pallet_id:'B0005', bale_qty:26, weight_kg:910,  condition:null,           status:'FILLING',                treatment:null,       remarks:'26 bale batch 5, 10 bale batch 6', weighting_start:null, weighting_end:null, plastic_condition:null, pallet_condition:null, released_by:null, released_at:null, reprocess_reason:null, reprocess_date:null, created_at:'2026-06-19T09:00:00Z', updated_at:'2026-06-19T09:00:00Z' },
  { id:'p6', production_session_id:'s1', lot_number:'L001', pallet_id:'B0006', bale_qty:36, weight_kg:1260, condition:'METAL_SUSPECT', status:'WAITING_REPROCESS',      treatment:'RE_CHECK', remarks:'Metal ditemukan', weighting_start:null, weighting_end:null, plastic_condition:null, pallet_condition:null, released_by:null, released_at:'', reprocess_reason:'Metal found after Re-Check', reprocess_date:'2026-06-19T08:30:00Z', created_at:'2026-06-19T06:40:00Z', updated_at:'2026-06-19T08:30:00Z' },
  { id:'p7', production_session_id:'s1', lot_number:'L001', pallet_id:'B0007', bale_qty:36, weight_kg:1260, condition:'OK',           status:'UNDER_WEIGHTING',        treatment:null,       remarks:null, weighting_start:'2026-06-19T09:30:00Z', weighting_end:null, plastic_condition:null, pallet_condition:null, released_by:null, released_at:null, reprocess_reason:null, reprocess_date:null, created_at:'2026-06-19T07:00:00Z', updated_at:'2026-06-19T09:30:00Z' },
  { id:'p8', production_session_id:'s1', lot_number:'L001', pallet_id:'B0008', bale_qty:36, weight_kg:1260, condition:'OK',           status:'WAITING_QC',             treatment:null,       remarks:null, weighting_start:null, weighting_end:null, plastic_condition:null, pallet_condition:null, released_by:null, released_at:null, reprocess_reason:null, reprocess_date:null, created_at:'2026-06-19T09:45:00Z', updated_at:'2026-06-19T09:45:00Z' },
  { id:'p9', production_session_id:'s1', lot_number:'L001', pallet_id:'B0009', bale_qty:36, weight_kg:1260, condition:'OK',           status:'RELEASED_FG',            treatment:null,       remarks:null, weighting_start:'2026-06-19T06:00:00Z', weighting_end:'2026-06-19T08:00:00Z', plastic_condition:'OK', pallet_condition:'OK', released_by:'supervisor@pbs.co.id', released_at:'2026-06-19T10:00:00Z', reprocess_reason:null, reprocess_date:null, created_at:'2026-06-19T05:00:00Z', updated_at:'2026-06-19T10:00:00Z' },
  { id:'p10',production_session_id:'s1', lot_number:'L001', pallet_id:'B0010', bale_qty:36, weight_kg:1260, condition:'OK',           status:'WAITING_FINAL_INSPECTION',treatment:null,       remarks:null, weighting_start:'2026-06-19T08:00:00Z', weighting_end:'2026-06-19T10:00:00Z', plastic_condition:null, pallet_condition:null, released_by:null, released_at:null, reprocess_reason:null, reprocess_date:null, created_at:'2026-06-19T07:10:00Z', updated_at:'2026-06-19T10:05:00Z' },
];

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<PalletStatus, string> = {
  FILLING: 'Filling', CLOSED: 'Closed', WAITING_QC: 'Waiting QC',
  REJECT: 'Reject', WAITING_STONE_WEIGHTING: 'Waiting Weighting',
  UNDER_WEIGHTING: 'Under Weighting', WAITING_FINAL_INSPECTION: 'Waiting Final Insp.',
  READY_FG: 'Ready FG', RELEASED_FG: 'Released FG',
  QUARANTINE: 'Quarantine', RE_WORK: 'Re-Work', RE_CHECK: 'Re-Check',
  WAITING_REPROCESS: 'Waiting Reprocess', REPROCESSED: 'Reprocessed',
};
const STATUS_COLOR: Record<PalletStatus, string> = {
  FILLING: 'bg-blue-100 text-blue-700',
  CLOSED: 'bg-gray-100 text-gray-600',
  WAITING_QC: 'bg-yellow-100 text-yellow-800',
  REJECT: 'bg-red-100 text-red-700',
  WAITING_STONE_WEIGHTING: 'bg-cyan-100 text-cyan-700',
  UNDER_WEIGHTING: 'bg-cyan-200 text-cyan-800',
  WAITING_FINAL_INSPECTION: 'bg-indigo-100 text-indigo-700',
  READY_FG: 'bg-emerald-100 text-emerald-700',
  RELEASED_FG: 'bg-green-200 text-green-800',
  QUARANTINE: 'bg-orange-100 text-orange-700',
  RE_WORK: 'bg-purple-100 text-purple-700',
  RE_CHECK: 'bg-amber-100 text-amber-700',
  WAITING_REPROCESS: 'bg-red-200 text-red-800',
  REPROCESSED: 'bg-gray-200 text-gray-700',
};
const CONDITION_LABEL: Record<PalletCondition, string> = {
  OK: 'OK', CONTAMINATION: 'Contamination', WHITE_SPOT: 'White Spot',
  METAL_SUSPECT: 'Metal Suspect', OUT_SPEC: 'Out Spec',
};
const CONDITION_COLOR: Record<PalletCondition, string> = {
  OK: 'bg-green-100 text-green-700',
  CONTAMINATION: 'bg-orange-100 text-orange-700',
  WHITE_SPOT: 'bg-yellow-100 text-yellow-700',
  METAL_SUSPECT: 'bg-red-100 text-red-700',
  OUT_SPEC: 'bg-purple-100 text-purple-700',
};

// ─── Small reusable components ────────────────────────────────────────────────
function Pill({ label, color }: { label: string; color: string }) {
  return <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{label}</span>;
}

function KPI({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
      <p className={`text-2xl font-bold ${color || 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="p-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-4 pb-4">{footer}</div>}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-3"><label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>{children}</div>;
}

function Inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none disabled:bg-gray-50" />;
}
function Sel(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  const { children, ...rest } = props;
  return <select {...rest} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">{children}</select>;
}
function Txta(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} rows={2} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none resize-none" />;
}
function BtnP({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">{children}</button>;
}
function BtnS({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <button onClick={onClick} className="px-4 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 text-gray-700">{children}</button>;
}

// ─── Pallet Table Row ─────────────────────────────────────────────────────────
function PalletRow({ p, onAction }: { p: Pallet; onAction: (p: Pallet) => void }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-3 py-2.5 font-mono text-xs font-medium text-gray-900">{p.pallet_id}</td>
      <td className="px-3 py-2.5 text-xs text-gray-600">{p.lot_number}</td>
      <td className="px-3 py-2.5 text-xs text-gray-900">{p.bale_qty}</td>
      <td className="px-3 py-2.5 text-xs text-gray-900">{p.weight_kg.toLocaleString('id-ID')} kg</td>
      <td className="px-3 py-2.5">
        {p.condition ? <Pill label={CONDITION_LABEL[p.condition]} color={CONDITION_COLOR[p.condition]} /> : <span className="text-xs text-gray-400">—</span>}
      </td>
      <td className="px-3 py-2.5"><Pill label={STATUS_LABEL[p.status]} color={STATUS_COLOR[p.status]} /></td>
      <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[120px] truncate">{p.remarks || '—'}</td>
      <td className="px-3 py-2.5">
        <button onClick={() => onAction(p)} className="flex items-center gap-1 text-xs text-green-700 font-medium hover:text-green-800">
          <Eye className="w-3.5 h-3.5" /> Aksi
        </button>
      </td>
    </tr>
  );
}

// ─── Audit Trail Drawer ───────────────────────────────────────────────────────
const MOCK_LOG: Record<string, { time: string; user: string; action: string; oldSt: string; newSt: string; remarks: string }[]> = {
  p2: [
    { time: '06:10', user: 'Operator',   action: 'Create Pallet',     oldSt: '—',        newSt: 'Filling',       remarks: '' },
    { time: '07:00', user: 'Operator',   action: 'Close Pallet',      oldSt: 'Filling',  newSt: 'Waiting QC',    remarks: '' },
    { time: '07:30', user: 'QC',         action: 'QC Reject WS',      oldSt: 'Waiting QC',newSt: 'Reject',       remarks: 'Ditemukan 3 bale WS' },
  ],
  p4: [
    { time: '06:30', user: 'Operator',   action: 'Create Pallet',     oldSt: '—',        newSt: 'Filling',       remarks: '' },
    { time: '07:40', user: 'Operator',   action: 'Close Pallet',      oldSt: 'Filling',  newSt: 'Waiting QC',    remarks: '' },
    { time: '07:55', user: 'QC',         action: 'QC Reject CONT',    oldSt: 'Waiting QC',newSt: 'Reject',       remarks: 'Suspect contamination oli' },
    { time: '08:00', user: 'Supervisor', action: 'Apply Treatment: Re-Check', oldSt:'Reject', newSt:'Re-Check', remarks: '' },
  ],
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PackingWorkflow() {
  const [activeTab, setActiveTab] = useState<
    'packing' | 'qc' | 'reject' | 'weighting' | 'final' | 'release' | 'reprocess' | 'history'
  >('packing');
  const [selectedSession, setSelectedSession] = useState<string>('s1');
  const [pallets, setPallets] = useState<Pallet[]>(INIT_PALLETS);
  const [modal, setModal] = useState<null | 'create' | 'detail' | 'qc' | 'treatment' | 'treatment_result' | 'weighting' | 'final' | 'release' | 'reprocess'>(null);
  const [focusPallet, setFocusPallet] = useState<Pallet | null>(null);

  // Form states
  const [form, setForm] = useState<Record<string, string>>({});
  const f = (k: string) => form[k] ?? '';
  const sf = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const session = MOCK_SESSIONS.find(s => s.id === selectedSession);
  const sessionPallets = pallets.filter(p => p.production_session_id === selectedSession);

  // Tab filtering
  const tabPallets: Record<string, Pallet[]> = {
    packing:    sessionPallets.filter(p => p.status === 'FILLING' || p.status === 'CLOSED'),
    qc:         sessionPallets.filter(p => p.status === 'WAITING_QC'),
    reject:     sessionPallets.filter(p => ['REJECT','RE_CHECK','QUARANTINE','RE_WORK'].includes(p.status)),
    weighting:  sessionPallets.filter(p => p.status === 'WAITING_STONE_WEIGHTING' || p.status === 'UNDER_WEIGHTING'),
    final:      sessionPallets.filter(p => p.status === 'WAITING_FINAL_INSPECTION'),
    release:    sessionPallets.filter(p => p.status === 'READY_FG' || p.status === 'RELEASED_FG'),
    reprocess:  sessionPallets.filter(p => p.status === 'WAITING_REPROCESS' || p.status === 'REPROCESSED'),
    history:    sessionPallets,
  };

  // KPI summary
  const kpi = useMemo(() => ({
    total:      sessionPallets.length,
    filling:    sessionPallets.filter(p => p.status === 'FILLING').length,
    waitingQC:  sessionPallets.filter(p => p.status === 'WAITING_QC').length,
    reject:     sessionPallets.filter(p => ['REJECT','RE_CHECK','QUARANTINE','RE_WORK'].includes(p.status)).length,
    weighting:  sessionPallets.filter(p => ['WAITING_STONE_WEIGHTING','UNDER_WEIGHTING'].includes(p.status)).length,
    readyFG:    sessionPallets.filter(p => p.status === 'READY_FG').length,
    releasedFG: sessionPallets.filter(p => p.status === 'RELEASED_FG').length,
    reprocess:  sessionPallets.filter(p => p.status === 'WAITING_REPROCESS').length,
  }), [sessionPallets]);

  // Helpers
  const updatePallet = (id: string, patch: Partial<Pallet>) => {
    setPallets(prev => prev.map(p => p.id === id ? { ...p, ...patch, updated_at: new Date().toISOString() } : p));
  };
  const openAction = (p: Pallet) => { setFocusPallet(p); setForm({}); setModal('detail'); };

  // Determine next action label for each pallet
  const nextActionOf = (p: Pallet) => {
    const map: Partial<Record<PalletStatus, string>> = {
      FILLING: 'Tutup Pallet', WAITING_QC: 'Inspeksi QC', REJECT: 'Pilih Treatment',
      RE_CHECK: 'Input Hasil Re-Check', QUARANTINE: 'Input Hasil Quarantine', RE_WORK: 'Input Hasil Re-Work',
      WAITING_STONE_WEIGHTING: 'Mulai Weighting', UNDER_WEIGHTING: 'Selesai Weighting',
      WAITING_FINAL_INSPECTION: 'Final Inspection', READY_FG: 'Release ke FG',
      WAITING_REPROCESS: 'Konfirmasi Reprocess',
    };
    return map[p.status] || '—';
  };

  // ─── Modal actions ──────────────────────────────────────────────────────────
  const doCreatePallet = () => {
    const bale = parseInt(f('bale') || '36');
    const newP: Pallet = {
      id: 'p' + Date.now(),
      production_session_id: selectedSession,
      lot_number: f('lot') || 'L001',
      pallet_id: `B${String(sessionPallets.length + 1).padStart(4,'0')}`,
      bale_qty: bale,
      weight_kg: bale * 35,
      condition: null,
      status: 'FILLING',
      treatment: null,
      remarks: f('remarks') || null,
      weighting_start: null, weighting_end: null,
      plastic_condition: null, pallet_condition: null,
      released_by: null, released_at: null,
      reprocess_reason: null, reprocess_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setPallets(p => [...p, newP]);
    setModal(null);
  };

  const doClosePallet = (p: Pallet) => { updatePallet(p.id, { status: 'WAITING_QC' }); setModal(null); };
  const doQC = (p: Pallet) => {
    const cond = f('condition') as PalletCondition;
    const newStatus: PalletStatus = cond === 'OK' ? 'WAITING_STONE_WEIGHTING' : 'REJECT';
    updatePallet(p.id, { condition: cond, status: newStatus, remarks: f('remarks') || p.remarks });
    setModal(null);
  };
  const doTreatment = (p: Pallet) => {
    const t = f('treatment') as PalletTreatment;
    const sm: Record<PalletTreatment, PalletStatus> = { RE_CHECK: 'RE_CHECK', QUARANTINE: 'QUARANTINE', RE_WORK: 'RE_WORK' };
    updatePallet(p.id, { treatment: t, status: sm[t], remarks: f('remarks') || p.remarks });
    setModal(null);
  };
  const doTreatmentResult = (p: Pallet, passed: boolean) => {
    updatePallet(p.id, { status: passed ? 'WAITING_STONE_WEIGHTING' : 'WAITING_REPROCESS' });
    setModal(null);
  };
  const doStartWeighting = (p: Pallet) => { updatePallet(p.id, { status: 'UNDER_WEIGHTING', weighting_start: new Date().toISOString() }); setModal(null); };
  const doCompleteWeighting = (p: Pallet) => { updatePallet(p.id, { status: 'WAITING_FINAL_INSPECTION', weighting_end: new Date().toISOString() }); setModal(null); };
  const doFinalInspect = (p: Pallet) => {
    const plasticOk = f('plastic') === 'OK';
    const palletOk  = f('palletc') === 'OK';
    const ok = plasticOk && palletOk;
    updatePallet(p.id, {
      plastic_condition: plasticOk ? 'OK' : 'DAMAGED',
      pallet_condition:  palletOk  ? 'OK' : 'DAMAGED',
      status: ok ? 'READY_FG' : 'REJECT',
    });
    setModal(null);
  };
  const doRelease = (p: Pallet) => { updatePallet(p.id, { status: 'RELEASED_FG', released_by: 'supervisor@pbs.co.id', released_at: new Date().toISOString() }); setModal(null); };
  const doReprocess = (p: Pallet) => { updatePallet(p.id, { status: 'REPROCESSED', reprocess_date: new Date().toISOString() }); setModal(null); };

  const tabs = [
    { key: 'packing',   label: 'Packing',          icon: Package,      count: tabPallets.packing.length },
    { key: 'qc',        label: 'QC Inspection',     icon: ShieldCheck,  count: tabPallets.qc.length },
    { key: 'reject',    label: 'Reject Mgmt',       icon: AlertTriangle,count: tabPallets.reject.length },
    { key: 'weighting', label: 'Stone Weighting',   icon: Weight,       count: tabPallets.weighting.length },
    { key: 'final',     label: 'Final Inspection',  icon: CheckCircle,  count: tabPallets.final.length },
    { key: 'release',   label: 'Release FG',        icon: Truck,        count: tabPallets.release.length },
    { key: 'reprocess', label: 'Reprocess Queue',   icon: RefreshCw,    count: tabPallets.reprocess.length },
    { key: 'history',   label: 'History',           icon: Clock,        count: tabPallets.history.length },
  ] as const;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Packing & Traceability</h1>
          <p className="text-xs text-gray-500">Session-centric workflow: Packing → QC → Reject → Weighting → FG</p>
        </div>
        {activeTab === 'packing' && selectedSession && (
          <button onClick={() => { setForm({}); setModal('create'); }} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium">
            <Plus className="w-4 h-4" /> Create Pallet
          </button>
        )}
      </div>

      {/* Session selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Production Session</label>
            <select
              value={selectedSession}
              onChange={e => setSelectedSession(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 font-mono"
            >
              <option value="">— Pilih Sesi —</option>
              {MOCK_SESSIONS.map(s => <option key={s.id} value={s.id}>{s.session_number}</option>)}
            </select>
          </div>
        </div>
        {session && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
            <div><p className="text-xs text-gray-500">WO Number</p><p className="text-xs font-mono font-medium text-gray-800">{session.wo}</p></div>
            <div><p className="text-xs text-gray-500">Batch</p><p className="text-xs font-medium text-gray-800">{session.batch}</p></div>
            <div><p className="text-xs text-gray-500">Shift / Line</p><p className="text-xs font-medium text-gray-800">{session.shift} / {session.line}</p></div>
            <div><p className="text-xs text-gray-500">Operator</p><p className="text-xs font-medium text-gray-800">{session.operator}</p></div>
          </div>
        )}
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-4">
        <KPI label="Total Pallet" value={kpi.total} />
        <KPI label="Filling" value={kpi.filling} color="text-blue-600" />
        <KPI label="Waiting QC" value={kpi.waitingQC} color="text-yellow-600" />
        <KPI label="Reject" value={kpi.reject} color="text-red-600" />
        <KPI label="Weighting" value={kpi.weighting} color="text-cyan-600" />
        <KPI label="Ready FG" value={kpi.readyFG} color="text-emerald-600" />
        <KPI label="Released FG" value={kpi.releasedFG} color="text-green-700" />
        <KPI label="Reprocess" value={kpi.reprocess} color="text-red-700" />
      </div>

      {/* Workflow flow diagram */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max text-xs text-gray-500 flex-wrap">
          {['Filling','Waiting QC','QC OK? / Reject?','Stone Weighting','Final Inspection','Ready FG','Released FG'].map((s, i, arr) => (
            <div key={s} className="flex items-center gap-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.includes('Reject') ? 'bg-red-100 text-red-700' : 'bg-green-50 text-green-700 border border-green-200'}`}>{s}</span>
              {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-gray-400" />}
            </div>
          ))}
          <span className="text-gray-400 mx-1">|</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">Reject → Treatment → Pass? → Weighting / Reprocess Queue</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto pb-px">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs border-b-2 -mb-px whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'border-green-600 text-green-700 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.key ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab-specific header hints */}
      {activeTab === 'qc' && <div className="mb-3 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">Menampilkan semua pallet <strong>Waiting QC</strong>. QC tentukan condition → OK masuk Stone Weighting · Reject masuk Reject Management.</div>}
      {activeTab === 'reject' && <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">Menampilkan pallet status <strong>Reject · Re-Check · Quarantine · Re-Work</strong>. Pilih treatment lalu tentukan hasil pass/fail.</div>}
      {activeTab === 'weighting' && <div className="mb-3 text-xs text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-lg px-3 py-2"><strong>Semua pallet OK (+ pallet Reject yang lulus treatment)</strong> masuk ke sini. Setelah selesai → Final Inspection.</div>}
      {activeTab === 'release' && <div className="mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"><strong>Semua pallet yang lolos Final Inspection</strong> ada di sini. Supervisor melakukan Release ke Finished Good.</div>}
      {activeTab === 'reprocess' && <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"><strong>Semua pallet yang gagal treatment</strong> masuk ke Reprocess Queue.</div>}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {tabPallets[activeTab].length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Tidak ada pallet di tahap ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'history' ? (
              /* History shows all pallets with full detail */
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['Pallet ID','Lot','Bale','Weight','Condition','Status','Treatment','Remarks','Aksi'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tabPallets.history.map(p => <PalletRow key={p.id} p={p} onAction={openAction} />)}
                </tbody>
              </table>
            ) : activeTab === 'release' ? (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['Pallet ID','Lot','Bale','Weight','Status','Released By','Released At','Aksi'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tabPallets.release.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 font-mono text-xs font-medium">{p.pallet_id}</td>
                      <td className="px-3 py-2.5 text-xs">{p.lot_number}</td>
                      <td className="px-3 py-2.5 text-xs">{p.bale_qty}</td>
                      <td className="px-3 py-2.5 text-xs">{p.weight_kg.toLocaleString('id-ID')} kg</td>
                      <td className="px-3 py-2.5"><Pill label={STATUS_LABEL[p.status]} color={STATUS_COLOR[p.status]} /></td>
                      <td className="px-3 py-2.5 text-xs">{p.released_by ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs">{p.released_at ? new Date(p.released_at).toLocaleString('id-ID') : '—'}</td>
                      <td className="px-3 py-2.5">
                        {p.status === 'READY_FG' && (
                          <button onClick={() => { setFocusPallet(p); setModal('release'); }} className="text-xs text-green-700 font-medium hover:text-green-800">Release →</button>
                        )}
                        {p.status === 'RELEASED_FG' && <span className="text-xs text-gray-400">✓ Released</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : activeTab === 'weighting' ? (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>{['Pallet ID','Lot','Condition','Bale','Weight','Weighting Start','Weighting End','Status','Aksi'].map(h=><th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tabPallets.weighting.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 font-mono text-xs font-medium">{p.pallet_id}</td>
                      <td className="px-3 py-2.5 text-xs">{p.lot_number}</td>
                      <td className="px-3 py-2.5">{p.condition ? <Pill label={CONDITION_LABEL[p.condition]} color={CONDITION_COLOR[p.condition]} /> : '—'}</td>
                      <td className="px-3 py-2.5 text-xs">{p.bale_qty}</td>
                      <td className="px-3 py-2.5 text-xs">{p.weight_kg.toLocaleString('id-ID')} kg</td>
                      <td className="px-3 py-2.5 text-xs">{p.weighting_start ? new Date(p.weighting_start).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                      <td className="px-3 py-2.5 text-xs">{p.weighting_end ? new Date(p.weighting_end).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                      <td className="px-3 py-2.5"><Pill label={STATUS_LABEL[p.status]} color={STATUS_COLOR[p.status]} /></td>
                      <td className="px-3 py-2.5">
                        {p.status === 'WAITING_STONE_WEIGHTING' && <button onClick={() => doStartWeighting(p)} className="text-xs text-cyan-700 font-medium">Mulai ▶</button>}
                        {p.status === 'UNDER_WEIGHTING' && <button onClick={() => doCompleteWeighting(p)} className="text-xs text-green-700 font-medium">Selesai ✓</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : activeTab === 'reprocess' ? (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>{['Pallet ID','Lot','Condition','Treatment','Reason','Reprocess Date','Status','Aksi'].map(h=><th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tabPallets.reprocess.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 font-mono text-xs font-medium">{p.pallet_id}</td>
                      <td className="px-3 py-2.5 text-xs">{p.lot_number}</td>
                      <td className="px-3 py-2.5">{p.condition ? <Pill label={CONDITION_LABEL[p.condition]} color={CONDITION_COLOR[p.condition]} /> : '—'}</td>
                      <td className="px-3 py-2.5 text-xs">{p.treatment ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{p.reprocess_reason ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs">{p.reprocess_date ? new Date(p.reprocess_date).toLocaleDateString('id-ID') : '—'}</td>
                      <td className="px-3 py-2.5"><Pill label={STATUS_LABEL[p.status]} color={STATUS_COLOR[p.status]} /></td>
                      <td className="px-3 py-2.5">
                        {p.status === 'WAITING_REPROCESS' && <button onClick={() => { setFocusPallet(p); setModal('reprocess'); }} className="text-xs text-red-700 font-medium">Konfirmasi</button>}
                        {p.status === 'REPROCESSED' && <span className="text-xs text-gray-400">✓ Done</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              /* Default table for packing, qc, reject, final */
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['Pallet ID','Lot','Bale','Weight','Condition','Status','Next Action','Remarks','Aksi'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tabPallets[activeTab].map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 font-mono text-xs font-medium text-gray-900">{p.pallet_id}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{p.lot_number}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-900">{p.bale_qty}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-900">{p.weight_kg.toLocaleString('id-ID')} kg</td>
                      <td className="px-3 py-2.5">{p.condition ? <Pill label={CONDITION_LABEL[p.condition]} color={CONDITION_COLOR[p.condition]} /> : <span className="text-xs text-gray-400">—</span>}</td>
                      <td className="px-3 py-2.5"><Pill label={STATUS_LABEL[p.status]} color={STATUS_COLOR[p.status]} /></td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{nextActionOf(p)}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[100px] truncate">{p.remarks || '—'}</td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => openAction(p)} className="flex items-center gap-1 text-xs text-green-700 font-medium hover:text-green-800">
                          <ChevronRight className="w-3.5 h-3.5" /> Aksi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ─── MODALS ─────────────────────────────────────────────────────────── */}

      {/* Create Pallet */}
      {modal === 'create' && (
        <Modal title="Create Pallet Baru" onClose={() => setModal(null)}
          footer={<><BtnS onClick={() => setModal(null)}>Batal</BtnS><BtnP onClick={doCreatePallet}>Buat Pallet</BtnP></>}>
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 mb-3">Session: <span className="font-mono font-medium text-gray-700">{session?.session_number}</span></div>
          <FormField label="Lot Number"><Inp value={f('lot')} onChange={e => sf('lot', e.target.value)} placeholder="cth: L001" /></FormField>
          <FormField label="Bale Qty (maks 36)">
            <Inp type="number" min="1" max="36" value={f('bale') || '36'} onChange={e => sf('bale', e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Weight = {(parseInt(f('bale') || '36') * 35).toLocaleString('id-ID')} kg (bale × 35 kg)</p>
          </FormField>
          <FormField label="Remarks (opsional)"><Txta value={f('remarks')} onChange={e => sf('remarks', e.target.value)} placeholder="cth: 26 bale batch 5, 10 bale batch 6" /></FormField>
        </Modal>
      )}

      {/* Detail / Action modal */}
      {modal === 'detail' && focusPallet && (
        <Modal title={`Pallet ${focusPallet.pallet_id} — Pilih Aksi`} onClose={() => setModal(null)}>
          <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">Status saat ini:</span><Pill label={STATUS_LABEL[focusPallet.status]} color={STATUS_COLOR[focusPallet.status]} /></div>
            <div className="flex justify-between"><span className="text-gray-500">Bale qty:</span><span className="font-medium">{focusPallet.bale_qty} bale = {focusPallet.weight_kg.toLocaleString('id-ID')} kg</span></div>
            {focusPallet.condition && <div className="flex justify-between"><span className="text-gray-500">Condition:</span><Pill label={CONDITION_LABEL[focusPallet.condition]} color={CONDITION_COLOR[focusPallet.condition]} /></div>}
            {focusPallet.remarks && <div className="flex justify-between"><span className="text-gray-500">Remarks:</span><span className="font-medium text-right max-w-[200px]">{focusPallet.remarks}</span></div>}
          </div>

          {/* Audit trail */}
          {MOCK_LOG[focusPallet.id] && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-600 mb-2">Riwayat Status</p>
              <div className="space-y-1.5">
                {MOCK_LOG[focusPallet.id].map((l, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-gray-400 w-10 flex-shrink-0">{l.time}</span>
                    <span className="text-gray-500 w-16 flex-shrink-0">{l.user}</span>
                    <span className="font-medium text-gray-700">{l.action}</span>
                    {l.remarks && <span className="text-gray-400">· {l.remarks}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {focusPallet.status === 'FILLING' && <BtnP onClick={() => doClosePallet(focusPallet)}>Tutup Pallet → Waiting QC</BtnP>}
            {focusPallet.status === 'WAITING_QC' && <BtnP onClick={() => setModal('qc')}>Input Hasil QC Inspection</BtnP>}
            {(focusPallet.status === 'REJECT') && <BtnP onClick={() => setModal('treatment')}>Pilih Treatment</BtnP>}
            {(['RE_CHECK','QUARANTINE','RE_WORK'] as PalletStatus[]).includes(focusPallet.status) && (
              <div className="space-y-2">
                <BtnP onClick={() => doTreatmentResult(focusPallet, true)}>✓ Treatment Pass → Stone Weighting</BtnP>
                <button onClick={() => doTreatmentResult(focusPallet, false)} className="w-full px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-medium">✗ Treatment Fail → Reprocess</button>
              </div>
            )}
            {focusPallet.status === 'WAITING_STONE_WEIGHTING' && <BtnP onClick={() => doStartWeighting(focusPallet)}>Mulai Stone Weighting</BtnP>}
            {focusPallet.status === 'UNDER_WEIGHTING' && <BtnP onClick={() => doCompleteWeighting(focusPallet)}>Selesai Stone Weighting → Final Inspection</BtnP>}
            {focusPallet.status === 'WAITING_FINAL_INSPECTION' && <BtnP onClick={() => setModal('final')}>Input Final Inspection</BtnP>}
            {focusPallet.status === 'READY_FG' && <BtnP onClick={() => doRelease(focusPallet)}>Release to Finished Good</BtnP>}
          </div>
        </Modal>
      )}

      {/* QC Inspection */}
      {modal === 'qc' && focusPallet && (
        <Modal title={`QC Inspection — ${focusPallet.pallet_id}`} onClose={() => setModal(null)}
          footer={<><BtnS onClick={() => setModal('detail')}>Kembali</BtnS><BtnP onClick={() => doQC(focusPallet)}>Simpan Hasil QC</BtnP></>}>
          <div className="text-xs text-gray-500 mb-3">Bale: {focusPallet.bale_qty} · Weight: {focusPallet.weight_kg.toLocaleString('id-ID')} kg</div>
          <FormField label="Condition *">
            <Sel value={f('condition')} onChange={e => sf('condition', e.target.value)}>
              <option value="">— Pilih condition —</option>
              <option value="OK">OK</option>
              <option value="CONTAMINATION">Contamination</option>
              <option value="WHITE_SPOT">White Spot</option>
              <option value="METAL_SUSPECT">Metal Suspect</option>
              <option value="OUT_SPEC">Out Spec</option>
            </Sel>
          </FormField>
          <FormField label="Remarks"><Txta value={f('remarks')} onChange={e => sf('remarks', e.target.value)} placeholder="Catatan hasil inspeksi..." /></FormField>
          {f('condition') && f('condition') !== 'OK' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
              <strong>Reject {f('condition').replace('_',' ')}</strong> — Pallet akan masuk Reject Management untuk penentuan treatment.
            </div>
          )}
          {f('condition') === 'OK' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-700">
              <strong>OK</strong> — Pallet otomatis masuk Stone Weighting.
            </div>
          )}
        </Modal>
      )}

      {/* Treatment */}
      {modal === 'treatment' && focusPallet && (
        <Modal title={`Reject Treatment — ${focusPallet.pallet_id}`} onClose={() => setModal(null)}
          footer={<><BtnS onClick={() => setModal('detail')}>Kembali</BtnS><BtnP onClick={() => doTreatment(focusPallet)}>Terapkan Treatment</BtnP></>}>
          <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700 mb-3">
            Condition: <strong>{focusPallet.condition ? CONDITION_LABEL[focusPallet.condition] : '—'}</strong>
          </div>
          <FormField label="Treatment *">
            <Sel value={f('treatment')} onChange={e => sf('treatment', e.target.value)}>
              <option value="">— Pilih treatment —</option>
              <option value="RE_CHECK">Re-Check</option>
              <option value="QUARANTINE">Quarantine</option>
              <option value="RE_WORK">Re-Work</option>
            </Sel>
          </FormField>
          <FormField label="Remarks"><Txta value={f('remarks')} onChange={e => sf('remarks', e.target.value)} /></FormField>
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 mt-2">
            <p className="font-medium mb-1">Alur setelah treatment:</p>
            <p>Pass → Waiting Stone Weighting</p>
            <p>Fail → Waiting Reprocess</p>
          </div>
        </Modal>
      )}

      {/* Final Inspection */}
      {modal === 'final' && focusPallet && (
        <Modal title={`Final Inspection — ${focusPallet.pallet_id}`} onClose={() => setModal(null)}
          footer={<><BtnS onClick={() => setModal('detail')}>Kembali</BtnS><BtnP onClick={() => doFinalInspect(focusPallet)}>Submit Final Inspection</BtnP></>}>
          <div className="text-xs text-gray-500 mb-3">Cek kondisi pallet setelah Stone Weighting</div>
          <FormField label="Plastic Condition *">
            <Sel value={f('plastic')} onChange={e => sf('plastic', e.target.value)}>
              <option value="">— Pilih —</option>
              <option value="OK">OK</option>
              <option value="DAMAGED">Damaged</option>
            </Sel>
          </FormField>
          <FormField label="Pallet Condition *">
            <Sel value={f('palletc')} onChange={e => sf('palletc', e.target.value)}>
              <option value="">— Pilih —</option>
              <option value="OK">OK</option>
              <option value="DAMAGED">Damaged</option>
            </Sel>
          </FormField>
          {f('plastic') && f('palletc') && (
            <div className={`rounded-lg p-2 text-xs font-medium ${f('plastic') === 'OK' && f('palletc') === 'OK' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {f('plastic') === 'OK' && f('palletc') === 'OK'
                ? '✓ Keduanya OK → Ready FG'
                : '✗ Ada kerusakan → Hold, kembali ke Reject Management'}
            </div>
          )}
        </Modal>
      )}

      {/* Release */}
      {modal === 'release' && focusPallet && (
        <Modal title={`Release to Finished Good — ${focusPallet.pallet_id}`} onClose={() => setModal(null)}
          footer={<><BtnS onClick={() => setModal(null)}>Batal</BtnS><BtnP onClick={() => doRelease(focusPallet)}>Konfirmasi Release</BtnP></>}>
          <div className="text-xs text-gray-500">Pallet <strong>{focusPallet.pallet_id}</strong> siap dirilis ke Finished Good.</div>
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">Bale:</span><span className="font-medium">{focusPallet.bale_qty}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Weight:</span><span className="font-medium">{focusPallet.weight_kg.toLocaleString('id-ID')} kg</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Lot:</span><span className="font-medium">{focusPallet.lot_number}</span></div>
          </div>
        </Modal>
      )}

      {/* Reprocess */}
      {modal === 'reprocess' && focusPallet && (
        <Modal title={`Konfirmasi Reprocess — ${focusPallet.pallet_id}`} onClose={() => setModal(null)}
          footer={<><BtnS onClick={() => setModal(null)}>Batal</BtnS><button onClick={() => doReprocess(focusPallet)} className="px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-medium">Konfirmasi Reprocess</button></>}>
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 mb-3">Pallet ini akan dikembalikan ke lini produksi untuk diproses ulang.</div>
          <div className="text-xs space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">Condition:</span><Pill label={focusPallet.condition ? CONDITION_LABEL[focusPallet.condition] : '—'} color={focusPallet.condition ? CONDITION_COLOR[focusPallet.condition] : 'bg-gray-100 text-gray-600'} /></div>
            <div className="flex justify-between"><span className="text-gray-500">Reason:</span><span className="font-medium">{focusPallet.reprocess_reason}</span></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
