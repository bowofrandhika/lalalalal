import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useProductionSession, usePalletTrackings,
  useCreatePallet, useClosePallet, useQCInspectPallet,
  useApplyTreatment, useTreatmentResult,
  useStartWeighting, useCompleteWeighting,
  useFinalInspectPallet, useReleasePalletFG, useConfirmReprocess,
  usePalletAuditLog, useSessionPalletSummary
} from '../../../hooks';
import {
  ArrowLeft, Plus, X, Package, ShieldCheck, AlertTriangle,
  Weight, CheckCircle, Truck, RefreshCw, Clock, Eye, ArrowRight
} from 'lucide-react';
import { formatDate, getStatusColor } from '../../../lib/utils';
import type { PalletTracking, PalletWorkflowStatus, PalletQCCondition, PalletTreatmentType } from '../../../types/database';

// ── Config ────────────────────────────────────────────────────────────────────
const SL: Record<PalletWorkflowStatus, string> = {
  FILLING: 'Filling', WAITING_QC: 'Waiting QC', REJECT: 'Reject',
  WAITING_STONE_WEIGHTING: 'Waiting Weighting', UNDER_WEIGHTING: 'Under Weighting',
  WAITING_FINAL_INSPECTION: 'Waiting Final Insp.', READY_FG: 'Ready FG',
  RELEASED_FG: 'Released FG', QUARANTINE: 'Quarantine', RE_WORK: 'Re-Work',
  RE_CHECK: 'Re-Check', WAITING_REPROCESS: 'Waiting Reprocess', REPROCESSED: 'Reprocessed',
};
const SC: Record<PalletWorkflowStatus, string> = {
  FILLING: 'bg-blue-100 text-blue-700',
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
  REPROCESSED: 'bg-gray-200 text-gray-600',
};
const CL: Record<PalletQCCondition, string> = {
  OK: 'OK', CONTAMINATION: 'Contamination', WHITE_SPOT: 'White Spot',
  METAL_SUSPECT: 'Metal Suspect', OUT_SPEC: 'Out Spec',
};
const CC: Record<PalletQCCondition, string> = {
  OK: 'bg-green-100 text-green-700', CONTAMINATION: 'bg-orange-100 text-orange-700',
  WHITE_SPOT: 'bg-yellow-100 text-yellow-700', METAL_SUSPECT: 'bg-red-100 text-red-700',
  OUT_SPEC: 'bg-purple-100 text-purple-700',
};
const NEXT_ACTION: Partial<Record<PalletWorkflowStatus, string>> = {
  FILLING: 'Tutup Pallet', WAITING_QC: 'Input QC', REJECT: 'Pilih Treatment',
  RE_CHECK: 'Hasil Re-Check', QUARANTINE: 'Hasil Quarantine', RE_WORK: 'Hasil Re-Work',
  WAITING_STONE_WEIGHTING: 'Mulai Weighting', UNDER_WEIGHTING: 'Selesai Weighting',
  WAITING_FINAL_INSPECTION: 'Final Inspection', READY_FG: 'Release FG',
  WAITING_REPROCESS: 'Konfirmasi Reprocess',
};

type TabKey = 'packing' | 'qc' | 'reject' | 'weighting' | 'final' | 'release' | 'reprocess' | 'history';
type ModalType = 'create' | 'detail' | 'qc' | 'treatment' | 'weighting_done' | 'final' | 'release' | 'reprocess' | null;

// ── Sub-components ────────────────────────────────────────────────────────────
function Pill({ label, cls }: { label: string; cls: string }) {
  return <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}
function KPI({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
      <p className={`text-2xl font-bold ${color ?? 'text-gray-900'}`}>{value}</p>
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
        {footer && <div className="flex justify-end gap-2 px-4 pb-4 border-t border-gray-100 pt-3">{footer}</div>}
      </div>
    </div>
  );
}
function FG({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-3"><label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>{children}</div>;
}
function Inp(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={`w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none ${p.readOnly ? 'bg-gray-50 text-gray-500' : ''} ${p.className ?? ''}`} />;
}
function Sel(p: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  const { children, ...rest } = p;
  return <select {...rest} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">{children}</select>;
}
function Txta(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} rows={2} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none resize-none" />;
}
function BtnPrimary({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">{children}</button>;
}
function BtnSecondary({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <button onClick={onClick} className="px-4 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 text-gray-700">{children}</button>;
}
function BtnDanger({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} className="px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium">{children}</button>;
}

// ── Audit log sub-component ───────────────────────────────────────────────────
function AuditTrail({ palletId }: { palletId: string }) {
  const { data: logs, isLoading } = usePalletAuditLog(palletId);
  if (isLoading) return <div className="text-xs text-gray-400 py-2">Memuat audit trail...</div>;
  if (!logs?.length) return <div className="text-xs text-gray-400 py-2">Belum ada riwayat</div>;
  return (
    <div className="space-y-1">
      {logs.map((l, i) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          <span className="text-gray-400 w-10 flex-shrink-0">{new Date(l.performed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="text-gray-500 w-16 flex-shrink-0">{l.performed_by?.split('@')[0]}</span>
          <span className="text-gray-700 font-medium">{l.action}</span>
        </div>
      ))}
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────
function PalletRow({ p, onAction }: { p: PalletTracking; onAction: () => void }) {
  const ws = p.workflow_status ?? 'FILLING';
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-3 py-2.5 font-mono text-xs font-medium text-gray-900">{p.pallet_code}</td>
      <td className="px-3 py-2.5 text-xs text-gray-600">{p.lot_number}</td>
      <td className="px-3 py-2.5 text-xs text-gray-900">{p.bale_qty ?? p.number_of_bags ?? 0}</td>
      <td className="px-3 py-2.5 text-xs text-gray-900">{(p.packed_qty ?? 0).toLocaleString('id-ID')} kg</td>
      <td className="px-3 py-2.5">
        {p.qc_condition
          ? <Pill label={CL[p.qc_condition]} cls={CC[p.qc_condition]} />
          : <span className="text-xs text-gray-400">—</span>}
      </td>
      <td className="px-3 py-2.5"><Pill label={SL[ws]} cls={SC[ws]} /></td>
      <td className="px-3 py-2.5 text-xs text-gray-400">{NEXT_ACTION[ws] ?? '—'}</td>
      <td className="px-3 py-2.5 text-xs text-gray-400 max-w-[100px] truncate">{p.remarks ?? p.notes ?? '—'}</td>
      <td className="px-3 py-2.5">
        <button onClick={onAction} className="flex items-center gap-1 text-xs text-green-700 font-medium hover:text-green-800">
          <Eye className="w-3.5 h-3.5" /> Aksi
        </button>
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PackingPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data: session, isLoading: sessionLoading } = useProductionSession(sessionId!);
  const { data: pallets, isLoading: palletsLoading } = usePalletTrackings(sessionId!);
  const { data: summary } = useSessionPalletSummary(sessionId!);

  const createPallet   = useCreatePallet();
  const closePallet    = useClosePallet();
  const qcInspect      = useQCInspectPallet();
  const applyTreatment = useApplyTreatment();
  const treatResult    = useTreatmentResult();
  const startWeight    = useStartWeighting();
  const endWeight      = useCompleteWeighting();
  const finalInspect   = useFinalInspectPallet();
  const releaseFG      = useReleasePalletFG();
  const confirmReproc  = useConfirmReprocess();

  const [activeTab, setActiveTab]     = useState<TabKey>('packing');
  const [modal, setModal]             = useState<ModalType>(null);
  const [focusPallet, setFocusPallet] = useState<PalletTracking | null>(null);
  const [form, setForm]               = useState<Record<string, string>>({});

  const f  = (k: string) => form[k] ?? '';
  const sf = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const closeModal = () => { setModal(null); setFocusPallet(null); setForm({}); };
  const openAction = (p: PalletTracking) => { setFocusPallet(p); setModal('detail'); };

  // Tab definitions
  const TABS: { key: TabKey; label: string; icon: React.ElementType; filter: (p: PalletTracking) => boolean }[] = [
    { key: 'packing',   label: 'Packing',         icon: Package,      filter: p => ['FILLING'].includes(p.workflow_status ?? 'FILLING') },
    { key: 'qc',        label: 'QC Inspection',   icon: ShieldCheck,  filter: p => (p.workflow_status ?? '') === 'WAITING_QC' },
    { key: 'reject',    label: 'Reject Mgmt',     icon: AlertTriangle,filter: p => ['REJECT','RE_CHECK','QUARANTINE','RE_WORK'].includes(p.workflow_status ?? '') },
    { key: 'weighting', label: 'Stone Weighting', icon: Weight,       filter: p => ['WAITING_STONE_WEIGHTING','UNDER_WEIGHTING'].includes(p.workflow_status ?? '') },
    { key: 'final',     label: 'Final Inspection',icon: CheckCircle,  filter: p => (p.workflow_status ?? '') === 'WAITING_FINAL_INSPECTION' },
    { key: 'release',   label: 'Release FG',      icon: Truck,        filter: p => ['READY_FG','RELEASED_FG'].includes(p.workflow_status ?? '') },
    { key: 'reprocess', label: 'Reprocess Queue', icon: RefreshCw,    filter: p => ['WAITING_REPROCESS','REPROCESSED'].includes(p.workflow_status ?? '') },
    { key: 'history',   label: 'History',         icon: Clock,        filter: () => true },
  ];

  const tabRows = useMemo(() => {
    const sp = pallets ?? [];
    return Object.fromEntries(TABS.map(t => [t.key, sp.filter(t.filter)]));
  }, [pallets]);

  const kpi = useMemo(() => {
    const sp = pallets ?? [];
    return {
      total:      sp.length,
      filling:    sp.filter(p => (p.workflow_status ?? 'FILLING') === 'FILLING').length,
      waitingQC:  sp.filter(p => p.workflow_status === 'WAITING_QC').length,
      reject:     sp.filter(p => ['REJECT','RE_CHECK','QUARANTINE','RE_WORK'].includes(p.workflow_status ?? '')).length,
      weighting:  sp.filter(p => ['WAITING_STONE_WEIGHTING','UNDER_WEIGHTING'].includes(p.workflow_status ?? '')).length,
      readyFG:    sp.filter(p => p.workflow_status === 'READY_FG').length,
      releasedFG: sp.filter(p => p.workflow_status === 'RELEASED_FG').length,
      reprocess:  sp.filter(p => p.workflow_status === 'WAITING_REPROCESS').length,
    };
  }, [pallets]);

  // ── Action handlers ─────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!sessionId) return;
    await createPallet.mutateAsync({ sessionId, lotNumber: f('lot') || 'L001', baleQty: parseInt(f('bale') || '36'), remarks: f('rmk') || null });
    closeModal();
  };
  const handleClose = async (p: PalletTracking) => {
    await closePallet.mutateAsync({ id: p.id, remarks: null });
    closeModal();
  };
  const handleQC = async (p: PalletTracking) => {
    if (!f('cond')) return;
    await qcInspect.mutateAsync({ id: p.id, condition: f('cond') as PalletQCCondition, remarks: f('rmk') || null });
    closeModal();
  };
  const handleTreatment = async (p: PalletTracking) => {
    if (!f('treat')) return;
    await applyTreatment.mutateAsync({ id: p.id, treatment: f('treat') as PalletTreatmentType, remarks: f('rmk') || null });
    closeModal();
  };
  const handleTreatResult = async (p: PalletTracking, passed: boolean) => {
    await treatResult.mutateAsync({ id: p.id, passed, remarks: null });
    closeModal();
  };
  const handleStartWeight = async (id: string) => { await startWeight.mutateAsync(id); };
  const handleEndWeight   = async (id: string) => { await endWeight.mutateAsync(id); };
  const handleFinal       = async (p: PalletTracking) => {
    await finalInspect.mutateAsync({ id: p.id, plasticOk: f('plastic') === 'OK', palletOk: f('palletc') === 'OK', remarks: f('rmk') || null });
    closeModal();
  };
  const handleRelease    = async (p: PalletTracking) => {
    await releaseFG.mutateAsync({ id: p.id, remarks: null });
    closeModal();
  };
  const handleReprocess  = async (id: string) => { await confirmReproc.mutateAsync(id); closeModal(); };

  if (sessionLoading) return (
    <div className="p-6 flex items-center justify-center min-h-96">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
    </div>
  );

  return (
    <div className="p-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link to={`/daily-instructions/${sessionId}`} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Packing &amp; Traceability</h1>
            <p className="text-xs text-gray-500">Session-centric: Packing → QC → Reject → Stone Weighting → Final Inspection → Release FG</p>
          </div>
        </div>
        {activeTab === 'packing' && (
          <button onClick={() => { setForm({ bale: '36' }); setModal('create'); }} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium">
            <Plus className="w-4 h-4" /> Create Pallet
          </button>
        )}
      </div>

      {/* Session Info Bar */}
      {session && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><p className="text-xs text-gray-500">Session</p><p className="text-xs font-mono font-medium text-gray-800">{session.session_number}</p></div>
          <div><p className="text-xs text-gray-500">WO</p><p className="text-xs font-mono font-medium text-gray-800">{session.work_order_number ?? '—'}</p></div>
          <div><p className="text-xs text-gray-500">Batch</p><p className="text-xs font-medium text-gray-800">{session.batch ?? '—'}</p></div>
          <div><p className="text-xs text-gray-500">Date / Shift</p><p className="text-xs font-medium text-gray-800">{formatDate(session.session_date)} · {session.shift ?? '—'}</p></div>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-4">
        <KPI label="Total" value={kpi.total} />
        <KPI label="Filling" value={kpi.filling} color="text-blue-600" />
        <KPI label="Waiting QC" value={kpi.waitingQC} color="text-yellow-600" />
        <KPI label="Reject" value={kpi.reject} color="text-red-600" />
        <KPI label="Weighting" value={kpi.weighting} color="text-cyan-600" />
        <KPI label="Ready FG" value={kpi.readyFG} color="text-emerald-600" />
        <KPI label="Released" value={kpi.releasedFG} color="text-green-700" />
        <KPI label="Reprocess" value={kpi.reprocess} color="text-red-700" />
      </div>

      {/* Workflow flow */}
      <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 mb-4 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max text-xs flex-wrap">
          {[
            { l: 'Filling',            cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
            { l: 'Waiting QC',         cls: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
            { l: 'QC OK? / Reject?',   cls: 'bg-green-50 text-green-700 border border-green-200' },
            { l: 'Reject → Treatment', cls: 'bg-red-50 text-red-700 border border-red-200' },
            { l: 'Stone Weighting',    cls: 'bg-cyan-50 text-cyan-700 border border-cyan-200' },
            { l: 'Final Inspection',   cls: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
            { l: 'Release FG',         cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
          ].map((s, i, arr) => (
            <span key={s.l} className="flex items-center gap-1">
              <span className={`px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.l}</span>
              {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-gray-400" />}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto pb-px">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs border-b-2 -mb-px whitespace-nowrap transition-colors ${activeTab === tab.key ? 'border-green-600 text-green-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {(tabRows[tab.key]?.length ?? 0) > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.key ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {tabRows[tab.key]?.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Hints */}
      {activeTab === 'qc' && <div className="mb-3 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">Menampilkan semua pallet <strong>Waiting QC</strong>. QC tentukan condition → OK masuk Stone Weighting · Reject masuk Reject Management.</div>}
      {activeTab === 'reject' && <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">Pallet status <strong>Reject / Re-Check / Quarantine / Re-Work</strong>. Pilih treatment → input hasil pass/fail.</div>}
      {activeTab === 'weighting' && <div className="mb-3 text-xs text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-lg px-3 py-2"><strong>Semua pallet OK + lulus treatment</strong> masuk ke sini. Selesai weighting → Final Inspection otomatis.</div>}
      {activeTab === 'release' && <div className="mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"><strong>Semua pallet lolos Final Inspection</strong>. Supervisor release ke Finished Good.</div>}
      {activeTab === 'reprocess' && <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"><strong>Semua pallet gagal treatment</strong> masuk ke Reprocess Queue.</div>}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {palletsLoading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" /></div>
        ) : (tabRows[activeTab]?.length ?? 0) === 0 ? (
          <div className="text-center py-12">
            <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Tidak ada pallet di tahap ini</p>
          </div>
        ) : activeTab === 'weighting' ? (
          <table className="w-full">
            <thead className="bg-gray-50"><tr>
              {['Pallet ID','Lot','Condition','Bale','Weight','Start','End','Status','Aksi'].map(h => <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {tabRows.weighting.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-mono text-xs font-medium">{p.pallet_code}</td>
                  <td className="px-3 py-2.5 text-xs">{p.lot_number}</td>
                  <td className="px-3 py-2.5">{p.qc_condition ? <Pill label={CL[p.qc_condition]} cls={CC[p.qc_condition]} /> : '—'}</td>
                  <td className="px-3 py-2.5 text-xs">{p.bale_qty}</td>
                  <td className="px-3 py-2.5 text-xs">{(p.packed_qty ?? 0).toLocaleString('id-ID')} kg</td>
                  <td className="px-3 py-2.5 text-xs">{p.weighting_start ? new Date(p.weighting_start).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="px-3 py-2.5 text-xs">{p.weighting_end ? new Date(p.weighting_end).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="px-3 py-2.5"><Pill label={SL[p.workflow_status ?? 'FILLING']} cls={SC[p.workflow_status ?? 'FILLING']} /></td>
                  <td className="px-3 py-2.5">
                    {p.workflow_status === 'WAITING_STONE_WEIGHTING' && <button onClick={() => handleStartWeight(p.id)} disabled={startWeight.isPending} className="text-xs text-cyan-700 font-medium">Mulai ▶</button>}
                    {p.workflow_status === 'UNDER_WEIGHTING' && <button onClick={() => handleEndWeight(p.id)} disabled={endWeight.isPending} className="text-xs text-green-700 font-medium">Selesai ✓</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : activeTab === 'release' ? (
          <table className="w-full">
            <thead className="bg-gray-50"><tr>
              {['Pallet ID','Lot','Bale','Weight','Status','Released By','Released At','Aksi'].map(h => <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {tabRows.release.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-mono text-xs font-medium">{p.pallet_code}</td>
                  <td className="px-3 py-2.5 text-xs">{p.lot_number}</td>
                  <td className="px-3 py-2.5 text-xs">{p.bale_qty}</td>
                  <td className="px-3 py-2.5 text-xs">{(p.packed_qty ?? 0).toLocaleString('id-ID')} kg</td>
                  <td className="px-3 py-2.5"><Pill label={SL[p.workflow_status ?? 'FILLING']} cls={SC[p.workflow_status ?? 'FILLING']} /></td>
                  <td className="px-3 py-2.5 text-xs">{p.released_by ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs">{p.released_at ? new Date(p.released_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : '—'}</td>
                  <td className="px-3 py-2.5">
                    {p.workflow_status === 'READY_FG' ? (
                      <button onClick={() => { setFocusPallet(p); setModal('release'); }} className="text-xs text-green-700 font-medium">Release →</button>
                    ) : <span className="text-xs text-gray-400">✓ Released</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : activeTab === 'reprocess' ? (
          <table className="w-full">
            <thead className="bg-gray-50"><tr>
              {['Pallet ID','Lot','Condition','Treatment','Reason','Status','Aksi'].map(h => <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {tabRows.reprocess.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-mono text-xs font-medium">{p.pallet_code}</td>
                  <td className="px-3 py-2.5 text-xs">{p.lot_number}</td>
                  <td className="px-3 py-2.5">{p.qc_condition ? <Pill label={CL[p.qc_condition]} cls={CC[p.qc_condition]} /> : '—'}</td>
                  <td className="px-3 py-2.5 text-xs">{p.treatment_type ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{p.reprocess_reason ?? '—'}</td>
                  <td className="px-3 py-2.5"><Pill label={SL[p.workflow_status ?? 'FILLING']} cls={SC[p.workflow_status ?? 'FILLING']} /></td>
                  <td className="px-3 py-2.5">
                    {p.workflow_status === 'WAITING_REPROCESS' ? (
                      <button onClick={() => handleReprocess(p.id)} disabled={confirmReproc.isPending} className="text-xs text-red-700 font-medium">Konfirmasi</button>
                    ) : <span className="text-xs text-gray-400">✓ Done</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50"><tr>
              {['Pallet ID','Lot','Bale','Weight','Condition','Status','Next Action','Remarks','Aksi'].map(h => <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {tabRows[activeTab]?.map(p => <PalletRow key={p.id} p={p} onAction={() => openAction(p)} />)}
            </tbody>
          </table>
        )}
      </div>

      {/* ── MODALS ── */}

      {modal === 'create' && (
        <Modal title="Create Pallet Baru" onClose={closeModal}
          footer={<><BtnSecondary onClick={closeModal}>Batal</BtnSecondary><BtnPrimary onClick={handleCreate} disabled={createPallet.isPending}>{createPallet.isPending ? 'Menyimpan...' : 'Buat Pallet'}</BtnPrimary></>}>
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 mb-3">Session: <span className="font-mono font-medium">{session?.session_number}</span></div>
          <FG label="Lot Number"><Inp value={f('lot')} onChange={e => sf('lot', e.target.value)} placeholder="cth: L001" /></FG>
          <FG label="Bale Qty (maks 36)">
            <Inp type="number" min="1" max="36" value={f('bale')} onChange={e => sf('bale', e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Weight = {(parseInt(f('bale') || '0') * 35).toLocaleString('id-ID')} kg</p>
          </FG>
          <FG label="Remarks (opsional)"><Txta value={f('rmk')} onChange={e => sf('rmk', e.target.value)} placeholder="cth: 26 bale batch 5, 10 bale batch 6" /></FG>
        </Modal>
      )}

      {modal === 'detail' && focusPallet && (
        <Modal title={`Pallet ${focusPallet.pallet_code} — Detail & Aksi`} onClose={closeModal}>
          <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs grid grid-cols-2 gap-2">
            <div><span className="text-gray-500">Pallet ID:</span> <strong className="font-mono">{focusPallet.pallet_code}</strong></div>
            <div><span className="text-gray-500">Lot:</span> <strong>{focusPallet.lot_number}</strong></div>
            <div><span className="text-gray-500">Bale:</span> <strong>{focusPallet.bale_qty} ({(focusPallet.packed_qty ?? 0).toLocaleString('id-ID')} kg)</strong></div>
            <div><span className="text-gray-500">Status:</span> <Pill label={SL[focusPallet.workflow_status ?? 'FILLING']} cls={SC[focusPallet.workflow_status ?? 'FILLING']} /></div>
            {focusPallet.qc_condition && <div><span className="text-gray-500">Condition:</span> <Pill label={CL[focusPallet.qc_condition]} cls={CC[focusPallet.qc_condition]} /></div>}
            {focusPallet.remarks && <div className="col-span-2"><span className="text-gray-500">Remarks:</span> {focusPallet.remarks}</div>}
          </div>

          <div className="space-y-2 mb-4">
            {focusPallet.workflow_status === 'FILLING' && <BtnPrimary onClick={() => handleClose(focusPallet)}>Tutup Pallet → Waiting QC</BtnPrimary>}
            {focusPallet.workflow_status === 'WAITING_QC' && <BtnPrimary onClick={() => setModal('qc')}>Input QC Inspection</BtnPrimary>}
            {focusPallet.workflow_status === 'REJECT' && <BtnPrimary onClick={() => setModal('treatment')}>Pilih Treatment</BtnPrimary>}
            {(['RE_CHECK','QUARANTINE','RE_WORK'] as PalletWorkflowStatus[]).includes(focusPallet.workflow_status ?? 'FILLING') && (
              <div className="space-y-2">
                <BtnPrimary onClick={() => handleTreatResult(focusPallet, true)}>✓ Treatment Pass → Stone Weighting</BtnPrimary>
                <BtnDanger onClick={() => handleTreatResult(focusPallet, false)}>✗ Treatment Fail → Reprocess</BtnDanger>
              </div>
            )}
            {focusPallet.workflow_status === 'WAITING_FINAL_INSPECTION' && <BtnPrimary onClick={() => setModal('final')}>Input Final Inspection</BtnPrimary>}
            {focusPallet.workflow_status === 'READY_FG' && <BtnPrimary onClick={() => handleRelease(focusPallet)}>Release to Finished Good</BtnPrimary>}
          </div>

          <p className="text-xs font-medium text-gray-600 mb-2">Audit Trail</p>
          <div className="bg-gray-50 rounded-lg p-3"><AuditTrail palletId={focusPallet.id} /></div>
        </Modal>
      )}

      {modal === 'qc' && focusPallet && (
        <Modal title={`QC Inspection — ${focusPallet.pallet_code}`} onClose={closeModal}
          footer={<><BtnSecondary onClick={() => setModal('detail')}>Kembali</BtnSecondary><BtnPrimary onClick={() => handleQC(focusPallet)} disabled={qcInspect.isPending || !f('cond')}>{qcInspect.isPending ? 'Menyimpan...' : 'Simpan QC'}</BtnPrimary></>}>
          <div className="text-xs text-gray-500 mb-3">{focusPallet.bale_qty} bale · {(focusPallet.packed_qty ?? 0).toLocaleString('id-ID')} kg</div>
          <FG label="Condition *">
            <Sel value={f('cond')} onChange={e => sf('cond', e.target.value)}>
              <option value="">— Pilih condition —</option>
              <option value="OK">OK</option>
              <option value="CONTAMINATION">Contamination</option>
              <option value="WHITE_SPOT">White Spot</option>
              <option value="METAL_SUSPECT">Metal Suspect</option>
              <option value="OUT_SPEC">Out Spec</option>
            </Sel>
          </FG>
          <FG label="Remarks"><Txta value={f('rmk')} onChange={e => sf('rmk', e.target.value)} /></FG>
          {f('cond') === 'OK' && <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">✓ OK — Pallet otomatis masuk Stone Weighting</div>}
          {f('cond') && f('cond') !== 'OK' && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">✗ Reject — Pallet masuk Reject Management untuk penentuan treatment</div>}
        </Modal>
      )}

      {modal === 'treatment' && focusPallet && (
        <Modal title={`Reject Treatment — ${focusPallet.pallet_code}`} onClose={closeModal}
          footer={<><BtnSecondary onClick={() => setModal('detail')}>Kembali</BtnSecondary><BtnPrimary onClick={() => handleTreatment(focusPallet)} disabled={applyTreatment.isPending || !f('treat')}>{applyTreatment.isPending ? 'Menyimpan...' : 'Terapkan Treatment'}</BtnPrimary></>}>
          {focusPallet.qc_condition && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 mb-3">Condition: <strong>{CL[focusPallet.qc_condition]}</strong></div>}
          <FG label="Treatment *">
            <Sel value={f('treat')} onChange={e => sf('treat', e.target.value)}>
              <option value="">— Pilih treatment —</option>
              <option value="RE_CHECK">Re-Check</option>
              <option value="QUARANTINE">Quarantine</option>
              <option value="RE_WORK">Re-Work</option>
            </Sel>
          </FG>
          <FG label="Remarks"><Txta value={f('rmk')} onChange={e => sf('rmk', e.target.value)} /></FG>
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">Setelah treatment: Pass → Stone Weighting · Fail → Reprocess Queue</div>
        </Modal>
      )}

      {modal === 'final' && focusPallet && (
        <Modal title={`Final Inspection — ${focusPallet.pallet_code}`} onClose={closeModal}
          footer={<><BtnSecondary onClick={closeModal}>Batal</BtnSecondary><BtnPrimary onClick={() => handleFinal(focusPallet)} disabled={finalInspect.isPending || !f('plastic') || !f('palletc')}>{finalInspect.isPending ? 'Menyimpan...' : 'Submit Inspection'}</BtnPrimary></>}>
          <div className="text-xs text-gray-500 mb-3">Cek kondisi pallet setelah Stone Weighting</div>
          <FG label="Plastic Condition *">
            <Sel value={f('plastic')} onChange={e => sf('plastic', e.target.value)}>
              <option value="">— Pilih —</option><option value="OK">OK</option><option value="DAMAGED">Damaged</option>
            </Sel>
          </FG>
          <FG label="Pallet Condition *">
            <Sel value={f('palletc')} onChange={e => sf('palletc', e.target.value)}>
              <option value="">— Pilih —</option><option value="OK">OK</option><option value="DAMAGED">Damaged</option>
            </Sel>
          </FG>
          <FG label="Remarks"><Txta value={f('rmk')} onChange={e => sf('rmk', e.target.value)} /></FG>
          {f('plastic') && f('palletc') && (
            <div className={`text-xs rounded-lg p-2 font-medium ${f('plastic') === 'OK' && f('palletc') === 'OK' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {f('plastic') === 'OK' && f('palletc') === 'OK' ? '✓ Keduanya OK → Ready FG' : '✗ Ada kerusakan → Hold, kembali ke Reject Management'}
            </div>
          )}
        </Modal>
      )}

      {modal === 'release' && focusPallet && (
        <Modal title={`Release to Finished Good — ${focusPallet.pallet_code}`} onClose={closeModal}
          footer={<><BtnSecondary onClick={closeModal}>Batal</BtnSecondary><BtnPrimary onClick={() => handleRelease(focusPallet)} disabled={releaseFG.isPending}>{releaseFG.isPending ? 'Merilis...' : 'Konfirmasi Release'}</BtnPrimary></>}>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">Pallet:</span><span className="font-mono font-medium">{focusPallet.pallet_code}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Bale:</span><span className="font-medium">{focusPallet.bale_qty}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Weight:</span><span className="font-medium">{(focusPallet.packed_qty ?? 0).toLocaleString('id-ID')} kg</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Lot:</span><span className="font-medium">{focusPallet.lot_number}</span></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
