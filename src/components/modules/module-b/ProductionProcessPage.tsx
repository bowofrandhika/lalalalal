import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  productionSessionService,
  productionLogSessionService,
  productionMaterialService,
  productionProcessFlowService,
  productionFuelService,
} from '../../../services';
import { userService } from '../../../services';
import { Save, ChevronRight, ArrowLeft } from 'lucide-react';
import { calcTotalWeight } from '../../../services/production.service';
import type {
  ProductionLogSession, ProductionMaterialId,
  ProductionProcessFlow, ProductionFuel
} from '../../../types/database';

const BALE_WEIGHT = 35;
const BALE_PER_PALLET = 36;

const TABS = [
  { id: 'session', label: 'Session' },
  { id: 'material', label: 'Material' },
  { id: 'process', label: 'Process Flow' },
  { id: 'fuel', label: 'Fuel' },
] as const;

type TabId = typeof TABS[number]['id'];

function formatDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toDatetimeLocal(iso?: string) {
  if (!iso) return '';
  return iso.slice(0, 16);
}

// ── Session Selection ─────────────────────────────────────────────────────────
function SessionSelector({ onSelect }: { onSelect: (id: string) => void }) {
  const { data: sessions = [] } = useQuery({
    queryKey: ['production_sessions', { status: 'ACTIVE' }],
    queryFn: () => productionSessionService.getAll({ status: 'ACTIVE' }),
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Production Log</h1>
      <p className="text-gray-500 text-sm">Select an active session to log production data</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
            No active sessions. Create a Daily Instruction first.
          </div>
        ) : (
          sessions.map(s => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
            >
              <div>
                <p className="font-medium text-gray-900 text-sm">{s.session_number}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDate(s.session_date)} · {s.shift_label} · Line {s.line_label}
                </p>
                <p className="text-xs text-gray-400">{(s as any).work_orders?.wo_number || '-'}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── Tab 1: Session ────────────────────────────────────────────────────────────
function SessionTab({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient();
  const { data: session } = useQuery({
    queryKey: ['production_sessions', sessionId],
    queryFn: () => productionSessionService.getById(sessionId),
    enabled: !!sessionId,
  });
  const { data: logSession } = useQuery({
    queryKey: ['production_log_sessions', sessionId],
    queryFn: () => productionLogSessionService.getBySession(sessionId),
    enabled: !!sessionId,
  });
  const { data: foremen = [] } = useQuery({
    queryKey: ['users', 'foremen'],
    queryFn: () => userService.getAll().then(u => u.filter(x => x.role === 'MANDOR')),
  });

  const [form, setForm] = useState<Partial<ProductionLogSession>>({});

  useEffect(() => {
    if (logSession) {
      setForm({
        foreman_id: logSession.foreman_id,
        start_time: logSession.start_time,
        end_time: logSession.end_time,
      });
    }
  }, [logSession]);

  const saveMutation = useMutation({
    mutationFn: () => productionLogSessionService.upsert(sessionId, form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['production_log_sessions', sessionId] }),
  });

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Production Session</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Session</p>
          <p className="font-medium text-sm text-gray-900 mt-0.5">{session?.session_number || '-'}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Batch</p>
          <p className="font-medium text-sm text-gray-900 mt-0.5">{session?.batch || '-'}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg col-span-2">
          <p className="text-xs text-gray-500">Buyer</p>
          <p className="font-medium text-sm text-gray-900 mt-0.5">
            {(session as any)?.work_orders?.buyers?.buyer_name || (session as any)?.buyers?.buyer_name || '-'}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Foreman</label>
        <select
          value={form.foreman_id || ''}
          onChange={e => setForm(f => ({ ...f, foreman_id: e.target.value || undefined }))}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Select Foreman --</option>
          {foremen.map(u => (
            <option key={u.id} value={u.id}>{u.full_name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Production</label>
          <input
            type="datetime-local"
            value={toDatetimeLocal(form.start_time)}
            onChange={e => setForm(f => ({ ...f, start_time: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Production</label>
          <input
            type="datetime-local"
            value={toDatetimeLocal(form.end_time)}
            onChange={e => setForm(f => ({ ...f, end_time: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
      {saveMutation.isSuccess && <p className="text-green-600 text-sm text-right">Saved successfully!</p>}
    </div>
  );
}

// ── Tab 2: Material ───────────────────────────────────────────────────────────
function MaterialTab({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient();
  const { data: material } = useQuery({
    queryKey: ['production_material', sessionId],
    queryFn: () => productionMaterialService.getBySession(sessionId),
    enabled: !!sessionId,
  });
  const { data: session } = useQuery({
    queryKey: ['production_sessions', sessionId],
    queryFn: () => productionSessionService.getById(sessionId),
    enabled: !!sessionId,
  });

  const [form, setForm] = useState<Partial<ProductionMaterialId>>({});

  useEffect(() => {
    if (material) setForm({ ...material });
  }, [material]);

  const dryingDays = form.update_date
    ? Math.max(0, Math.floor((Date.now() - new Date(form.update_date).getTime()) / 86400000))
    : null;

  const saveMutation = useMutation({
    mutationFn: () => productionMaterialService.upsert(sessionId, form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['production_material', sessionId] }),
  });

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Material Identification</h2>

      <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg text-sm">
        <div>
          <span className="text-gray-500">Batch:</span>{' '}
          <span className="font-medium">{session?.batch || '-'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
          <input
            value={form.room || ''}
            onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Room"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deck</label>
          <input
            value={form.deck || ''}
            onChange={e => setForm(f => ({ ...f, deck: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Deck"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Update Date</label>
          <input
            type="date"
            value={form.update_date || ''}
            onChange={e => setForm(f => ({ ...f, update_date: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Drying Time (days)</label>
          <div className="px-3 py-2.5 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-700">
            {dryingDays !== null ? `${dryingDays} days` : '-'}
            <span className="text-xs text-gray-400 ml-2">(auto-calculated)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Visual Condition</label>
          <select
            value={form.visual_condition || ''}
            onChange={e => setForm(f => ({ ...f, visual_condition: e.target.value as any }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            {['Clean', 'Moderate', 'Dirty'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Line Cleaning</label>
          <select
            value={form.line_cleaning || ''}
            onChange={e => setForm(f => ({ ...f, line_cleaning: e.target.value as any }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            {['Clean', 'Moderate', 'Dirty'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
        <textarea
          value={form.remarks || ''}
          onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Optional remarks..."
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
      {saveMutation.isSuccess && <p className="text-green-600 text-sm text-right">Saved!</p>}
    </div>
  );
}

// ── Tab 3: Process Flow ───────────────────────────────────────────────────────
function ProcessFlowTab({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient();
  const { data: process } = useQuery({
    queryKey: ['production_process_flow', sessionId],
    queryFn: () => productionProcessFlowService.getBySession(sessionId),
    enabled: !!sessionId,
  });

  const [form, setForm] = useState<Partial<ProductionProcessFlow>>({ bale_qty: 0, pallet_qty: 0 });

  useEffect(() => {
    if (process) setForm({ ...process });
  }, [process]);

  const totalBales = (form.bale_qty || 0) + (form.pallet_qty || 0) * BALE_PER_PALLET;
  const totalKg = calcTotalWeight(form.bale_qty || 0, form.pallet_qty || 0);

  const saveMutation = useMutation({
    mutationFn: () => productionProcessFlowService.upsert(sessionId, form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['production_process_flow', sessionId] }),
  });

  return (
    <div className="space-y-6">
      {/* Press & Weighing */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Press &amp; Weighing</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Avg. Cake Weight (kg)</label>
            <input
              type="number"
              step="0.001"
              value={form.avg_cake_weight || ''}
              onChange={e => setForm(f => ({ ...f, avg_cake_weight: parseFloat(e.target.value) || undefined }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Variation</label>
            <input
              value={form.variation || ''}
              onChange={e => setForm(f => ({ ...f, variation: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. ±0.5"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
          <input
            value={form.press_remarks || ''}
            onChange={e => setForm(f => ({ ...f, press_remarks: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Remarks..."
          />
        </div>
      </div>

      {/* Total Product */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Total Product</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bale</label>
            <input
              type="number"
              min="0"
              value={form.bale_qty || 0}
              onChange={e => setForm(f => ({ ...f, bale_qty: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pallet</label>
            <input
              type="number"
              min="0"
              value={form.pallet_qty || 0}
              onChange={e => setForm(f => ({ ...f, pallet_qty: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Auto-calculated weight */}
        <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Total Weight (auto-calculated)</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{totalKg.toLocaleString()} KG</p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>{totalBales} bales total</p>
              <p className="text-xs text-gray-400 mt-0.5">
                ({form.bale_qty || 0} bales + {form.pallet_qty || 0} pallets × {BALE_PER_PALLET} bales)
                × {BALE_WEIGHT} kg
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
      {saveMutation.isSuccess && <p className="text-green-600 text-sm text-right">Saved & production updated!</p>}
    </div>
  );
}

// ── Tab 4: Fuel ───────────────────────────────────────────────────────────────
function FuelTab({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient();
  const { data: fuel } = useQuery({
    queryKey: ['production_fuel', sessionId],
    queryFn: () => productionFuelService.getBySession(sessionId),
    enabled: !!sessionId,
  });

  const [form, setForm] = useState<Partial<ProductionFuel>>({ diesel_start: 0, diesel_end: 0, pks_consumption: 0 });

  useEffect(() => {
    if (fuel) setForm({ ...fuel });
  }, [fuel]);

  const dieselConsumption = Math.max(0, (form.diesel_end || 0) - (form.diesel_start || 0));

  const saveMutation = useMutation({
    mutationFn: () => productionFuelService.upsert(sessionId, form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['production_fuel', sessionId] }),
  });

  return (
    <div className="space-y-6">
      {/* Diesel */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Diesel</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diesel Start (L)</label>
            <input
              type="number"
              step="0.01"
              value={form.diesel_start || 0}
              onChange={e => setForm(f => ({ ...f, diesel_start: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diesel End (L)</label>
            <input
              type="number"
              step="0.01"
              value={form.diesel_end || 0}
              onChange={e => setForm(f => ({ ...f, diesel_end: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Consumption (L)</label>
            <div className="px-3 py-2.5 border border-gray-100 bg-gray-50 rounded-lg text-sm font-medium text-blue-700">
              {dieselConsumption.toFixed(2)} L
              <span className="text-xs text-gray-400 ml-1 font-normal">(auto)</span>
            </div>
          </div>
        </div>
      </div>

      {/* PKS */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Palm Kernel Shell (PKS)</h2>
        <div className="w-1/3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Consumption (kg)</label>
          <input
            type="number"
            step="0.01"
            value={form.pks_consumption || 0}
            onChange={e => setForm(f => ({ ...f, pks_consumption: parseFloat(e.target.value) || 0 }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
      {saveMutation.isSuccess && <p className="text-green-600 text-sm text-right">Saved!</p>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProductionProcessPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [selectedSession, setSelectedSession] = useState<string>(sessionId || '');
  const [activeTab, setActiveTab] = useState<TabId>('session');

  const { data: session } = useQuery({
    queryKey: ['production_sessions', selectedSession],
    queryFn: () => productionSessionService.getById(selectedSession),
    enabled: !!selectedSession,
  });

  if (!selectedSession) {
    return <SessionSelector onSelect={setSelectedSession} />;
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        {!sessionId && (
          <button
            onClick={() => setSelectedSession('')}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production Log</h1>
          {session && (
            <p className="text-gray-500 text-sm">
              {session.session_number} · Shift {session.shift_label} · Line {session.line_label}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0 -mb-px">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {activeTab === 'session' && <SessionTab sessionId={selectedSession} />}
        {activeTab === 'material' && <MaterialTab sessionId={selectedSession} />}
        {activeTab === 'process' && <ProcessFlowTab sessionId={selectedSession} />}
        {activeTab === 'fuel' && <FuelTab sessionId={selectedSession} />}
      </div>
    </div>
  );
}
