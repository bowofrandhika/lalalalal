import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, RefreshCw } from 'lucide-react';
import { productionSessionService, workOrderService } from '../../../services';
import type { ProductionSession } from '../../../types/database';

const SHIFTS = [
  { value: 'Morning', label: '1 - Morning' },
  { value: 'Afternoon', label: '2 - Afternoon' },
];

const LINES = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'AB', label: 'AB' },
];

const today = new Date().toISOString().split('T')[0];

interface FormData {
  session_number: string;
  session_date: string;
  shift_label: string;
  line_label: string;
  work_order_id: string;
  batch: string;
  target_kg: number;
  status: string;
  notes: string;
}

const emptyForm: FormData = {
  session_number: '',
  session_date: today,
  shift_label: 'Morning',
  line_label: 'A',
  work_order_id: '',
  batch: '',
  target_kg: 0,
  status: 'DRAFT',
  notes: '',
};

export default function DailyInstructionFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const isEditing = searchParams.get('edit') === 'true' && !!id;

  const [form, setForm] = useState<FormData>(emptyForm);
  const [generating, setGenerating] = useState(false);

  const { data: session } = useQuery({
    queryKey: ['production_sessions', id],
    queryFn: () => productionSessionService.getById(id!),
    enabled: !!id && isEditing,
  });

  const { data: activeWOs = [] } = useQuery({
    queryKey: ['work_orders', { status: 'ACTIVE' }],
    queryFn: () => workOrderService.getAll({ status: 'ACTIVE' }),
  });

  useEffect(() => {
    if (session && isEditing) {
      setForm({
        session_number: session.session_number || '',
        session_date: session.session_date || today,
        shift_label: session.shift_label || 'Morning',
        line_label: session.line_label || 'A',
        work_order_id: session.work_order_id || '',
        batch: session.batch || '',
        target_kg: session.target_kg || 0,
        status: session.status || 'DRAFT',
        notes: session.notes || '',
      });
    }
  }, [session, isEditing]);

  const createMutation = useMutation({
    mutationFn: (data: Partial<ProductionSession>) => productionSessionService.create(data as any),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['production_sessions'] });
      navigate(`/daily-instructions/${res.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ProductionSession>) => productionSessionService.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_sessions'] });
      navigate(`/daily-instructions/${id}`);
    },
  });

  async function generateSessionNumber() {
    setGenerating(true);
    try {
      const num = await productionSessionService.generateSessionNumber(
        form.session_date,
        form.shift_label,
        form.line_label
      );
      setForm(f => ({ ...f, session_number: num }));
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const selectedWO = activeWOs.find(wo => wo.id === form.work_order_id);
    const payload: Partial<ProductionSession> = {
      session_number: form.session_number,
      session_date: form.session_date,
      shift_label: form.shift_label,
      line_label: form.line_label,
      work_order_id: form.work_order_id || undefined,
      batch: form.batch || selectedWO?.batch_code || undefined,
      target_kg: form.target_kg,
      target_production: form.target_kg,
      status: form.status as any,
      notes: form.notes || undefined,
    };
    if (isEditing) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/daily-instructions" className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Edit Session' : 'New Daily Instruction'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isEditing ? `Editing ${session?.session_number}` : 'Create a new production session'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Session Date *</label>
          <input
            required
            type="date"
            value={form.session_date}
            onChange={e => setForm(f => ({ ...f, session_date: e.target.value, session_number: '' }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Shift */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shift *</label>
          <select
            required
            value={form.shift_label}
            onChange={e => setForm(f => ({ ...f, shift_label: e.target.value, session_number: '' }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {SHIFTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Line */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Line *</label>
          <select
            required
            value={form.line_label}
            onChange={e => setForm(f => ({ ...f, line_label: e.target.value, session_number: '' }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {LINES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>

        {/* Session Number (auto-generated) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Session Number *</label>
          <div className="flex gap-2">
            <input
              required
              value={form.session_number}
              readOnly
              placeholder="e.g. PBS.DP.180626.1.AB.0001"
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-mono bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              type="button"
              onClick={generateSessionNumber}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              Generate
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Format: PBS.DP.DDMMYY.Shift.Line.0001</p>
        </div>

        {/* Work Order */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Work Order (Active)</label>
          <select
            value={form.work_order_id}
            onChange={e => {
              const wo = activeWOs.find(w => w.id === e.target.value);
              setForm(f => ({
                ...f,
                work_order_id: e.target.value,
                batch: wo?.batch_code || f.batch
              }));
            }}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">-- Select Work Order --</option>
            {activeWOs.map(wo => (
              <option key={wo.id} value={wo.id}>
                {wo.wo_number} {wo.batch_code ? `(${wo.batch_code})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Batch */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
          <input
            value={form.batch}
            onChange={e => setForm(f => ({ ...f, batch: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Batch code"
          />
        </div>

        {/* Production Target in KG */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Production Target (kg) *</label>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={form.target_kg}
            onChange={e => setForm(f => ({ ...f, target_kg: parseFloat(e.target.value) || 0 }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="0.00"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            placeholder="Optional notes..."
          />
        </div>

        {(createMutation.error || updateMutation.error) && (
          <p className="text-red-600 text-sm">
            {String(createMutation.error || updateMutation.error)}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : 'Save Session'}
          </button>
        </div>
      </form>
    </div>
  );
}
