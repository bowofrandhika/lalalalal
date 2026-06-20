import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, RefreshCw } from 'lucide-react';
import { workOrderService } from '../../../services';
import { useBuyers } from '../../../hooks';
import type { WorkOrder, PackagingType } from '../../../types/database';

const BUYERS = [
  { code: 'BEL', name: 'Belshina' },
  { code: 'KAM', name: 'Kamatyres' },
  { code: 'SNI', name: 'SNI' },
];

const PACKAGING_OPTIONS: { value: PackagingType; label: string }[] = [
  { value: 'SW', label: 'SW' },
  { value: 'MB', label: 'MB' },
  { value: 'LB', label: 'LB' },
];

const STATUS_OPTIONS = ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

interface FormData {
  wo_number: string;
  wo_date: string;
  buyer_id: string;
  batch_code: string;
  deadline: string;
  packaging: PackagingType;
  qty_kg: number;
  status: string;
  notes: string;
}

const today = new Date().toISOString().split('T')[0];
const emptyForm: FormData = {
  wo_number: '',
  wo_date: today,
  buyer_id: '',
  batch_code: '',
  deadline: '',
  packaging: 'SW',
  qty_kg: 0,
  status: 'DRAFT',
  notes: '',
};

export default function WorkOrderFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const isEditing = searchParams.get('edit') === 'true' && !!id;

  const [form, setForm] = useState<FormData>(emptyForm);
  const [generatingWO, setGeneratingWO] = useState(false);

  const { data: wo } = useQuery({
    queryKey: ['work_orders', id],
    queryFn: () => workOrderService.getById(id!),
    enabled: !!id && isEditing,
  });

  const { data: buyers = [] } = useBuyers();

  useEffect(() => {
    if (wo && isEditing) {
      setForm({
        wo_number: wo.wo_number || '',
        wo_date: wo.wo_date || today,
        buyer_id: wo.buyer_id || '',
        batch_code: wo.batch_code || '',
        deadline: wo.deadline || '',
        packaging: wo.packaging || 'SW',
        qty_kg: wo.qty_kg || 0,
        status: wo.status || 'DRAFT',
        notes: wo.notes || '',
      });
    }
  }, [wo, isEditing]);

  const createMutation = useMutation({
    mutationFn: (data: Partial<WorkOrder>) => workOrderService.create(data as any),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['work_orders'] });
      navigate(`/work-orders/${res.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<WorkOrder>) => workOrderService.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work_orders'] });
      navigate(`/work-orders/${id}`);
    },
  });

  async function generateWONumber() {
    if (!form.deadline || !form.buyer_id) {
      alert('Please select a Buyer and Deadline first.');
      return;
    }
    setGeneratingWO(true);
    try {
      const buyerObj = buyers.find(b => b.id === form.buyer_id);
      const buyerCode = buyerObj?.buyer_code || buyerObj?.buyer_code_short || 'XXX';
      const woNum = await workOrderService.generateWONumber(form.deadline, buyerCode);
      setForm(f => ({ ...f, wo_number: woNum }));
    } finally {
      setGeneratingWO(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Partial<WorkOrder> = {
      wo_number: form.wo_number,
      wo_date: form.wo_date,
      buyer_id: form.buyer_id || undefined,
      batch_code: form.batch_code,
      deadline: form.deadline || undefined,
      packaging: form.packaging,
      qty_kg: form.qty_kg,
      status: form.status as any,
      notes: form.notes || undefined,
      target_qty: form.qty_kg,
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
        <Link to="/work-orders" className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Edit Work Order' : 'New Work Order'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isEditing ? `Editing ${wo?.wo_number}` : 'Create a new work order'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Buyer (must be first for auto-number) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Buyer *</label>
          <select
            required
            value={form.buyer_id}
            onChange={e => {
              setForm(f => ({ ...f, buyer_id: e.target.value, wo_number: '' }));
            }}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Select Buyer</option>
            {BUYERS.map(b => {
              const found = buyers.find(bu => bu.buyer_code === b.code);
              return (
                <option key={b.code} value={found?.id || b.code}>
                  {b.name}
                </option>
              );
            })}
          </select>
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deadline *</label>
          <input
            required
            type="date"
            value={form.deadline}
            onChange={e => setForm(f => ({ ...f, deadline: e.target.value, wo_number: '' }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* WO Number (auto-generated) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WO Number *</label>
          <div className="flex gap-2">
            <input
              required
              value={form.wo_number}
              onChange={e => setForm(f => ({ ...f, wo_number: e.target.value }))}
              placeholder="e.g. PBS.WO.010726.BEL.0001"
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
              readOnly
            />
            <button
              type="button"
              onClick={generateWONumber}
              disabled={generatingWO || !form.buyer_id || !form.deadline}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${generatingWO ? 'animate-spin' : ''}`} />
              Generate
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Format: PBS.WO.DDMMYY.BUY.0001</p>
        </div>

        {/* WO Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WO Date</label>
          <input
            type="date"
            value={form.wo_date}
            onChange={e => setForm(f => ({ ...f, wo_date: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Packaging */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Packaging *</label>
          <select
            required
            value={form.packaging}
            onChange={e => setForm(f => ({ ...f, packaging: e.target.value as PackagingType }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {PACKAGING_OPTIONS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Quantity in KG */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (kg) *</label>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={form.qty_kg}
            onChange={e => setForm(f => ({ ...f, qty_kg: parseFloat(e.target.value) || 0 }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="0.00"
          />
        </div>

        {/* Batch Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Batch Code</label>
          <input
            value={form.batch_code}
            onChange={e => setForm(f => ({ ...f, batch_code: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Batch code"
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
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
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
            {isSubmitting ? 'Saving...' : 'Save Work Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
