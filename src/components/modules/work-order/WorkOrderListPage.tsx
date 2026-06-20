import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Eye, CreditCard as Edit2, CheckCircle, Bell, ClipboardList } from 'lucide-react';
import { workOrderService, woNotificationService } from '../../../services';
import { useAuth } from '../../../hooks';
import type { WorkOrder } from '../../../types/database';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ACTIVE: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const PACKAGING_LABELS: Record<string, string> = { SW: 'SW', MB: 'MB', LB: 'LB' };

function formatDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function WorkOrderListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { appUser } = useAuth();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'active' | 'completed'>('active');

  const isSuperUser = appUser?.role === 'SUPER_USER';
  const canManage = ['SUPER_USER', 'ADMIN', 'SPV'].includes(appUser?.role || '');

  const { data: allWOs = [], isLoading } = useQuery({
    queryKey: ['work_orders'],
    queryFn: () => workOrderService.getAll(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['wo-notifications'],
    queryFn: () => woNotificationService.getPending(),
    refetchInterval: 30000,
    enabled: isSuperUser,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workOrderService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work_orders'] }),
  });

  const confirmMutation = useMutation({
    mutationFn: (wo: WorkOrder) => workOrderService.confirmCompletion(wo.id, appUser?.user_id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work_orders'] });
      queryClient.invalidateQueries({ queryKey: ['wo-notifications'] });
    },
  });

  const activeWOs = allWOs.filter(w => !['COMPLETED', 'CANCELLED'].includes(w.status));
  const completedWOs = allWOs.filter(w => ['COMPLETED', 'CANCELLED'].includes(w.status));
  const displayed = (tab === 'active' ? activeWOs : completedWOs).filter(w =>
    [w.wo_number, w.batch_code, (w as any).buyers?.buyer_name].some(f =>
      (f || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const pendingNotifs = notifications.filter(n => !n.is_read);

  function handleDelete(id: string) {
    if (!window.confirm('Delete this work order?')) return;
    deleteMutation.mutate(id);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
          <p className="text-gray-500 text-sm mt-1">
            {activeWOs.length} active · {completedWOs.length} completed
          </p>
        </div>
        {canManage && (
          <Link
            to="/work-orders/new"
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> New Work Order
          </Link>
        )}
      </div>

      {/* Completion Notifications Banner */}
      {isSuperUser && pendingNotifs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-800 text-sm">Work Orders Reached Target Quantity</p>
              <div className="mt-2 space-y-2">
                {pendingNotifs.map(n => (
                  <div key={n.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {(n as any).work_orders?.wo_number}
                      </p>
                      <p className="text-xs text-gray-500">
                        Produced {n.total_kg?.toLocaleString()} kg / {(n as any).work_orders?.qty_kg?.toLocaleString()} kg target
                      </p>
                    </div>
                    <button
                      onClick={() => confirmMutation.mutate(allWOs.find(w => w.id === n.work_order_id)!)}
                      disabled={confirmMutation.isPending}
                      className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Confirm Complete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs + Search */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex gap-1">
            <button
              onClick={() => setTab('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'active' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Active ({activeWOs.length})
            </button>
            <button
              onClick={() => setTab('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'completed' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Completed ({completedWOs.length})
            </button>
          </div>
          <input
            type="text"
            placeholder="Search WO..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-52"
          />
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : displayed.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No {tab} work orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">WO Number</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Buyer</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Deadline</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Packaging</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Qty (kg)</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Progress</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.map(wo => {
                  const completedKg = wo.completed_qty || 0;
                  const targetKg = wo.qty_kg || 0;
                  const hasNotif = pendingNotifs.some(n => n.work_order_id === wo.id);
                  return (
                    <tr key={wo.id} className={`hover:bg-gray-50 transition-colors ${hasNotif ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link to={`/work-orders/${wo.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                            {wo.wo_number}
                          </Link>
                          {hasNotif && <Bell className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                        <p className="text-xs text-gray-400">{formatDate(wo.wo_date)}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {(wo as any).buyers?.buyer_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{formatDate(wo.deadline)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          {PACKAGING_LABELS[wo.packaging || ''] || wo.packaging || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {targetKg > 0 ? targetKg.toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 w-36">
                        <div className="space-y-1">
                          <ProgressBar current={completedKg} total={targetKg} />
                          <p className="text-xs text-gray-500">
                            {completedKg.toLocaleString()} / {targetKg.toLocaleString()} kg
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[wo.status] || 'bg-gray-100 text-gray-700'}`}>
                          {wo.status}
                        </span>
                        {hasNotif && isSuperUser && (
                          <button
                            onClick={() => confirmMutation.mutate(wo)}
                            className="ml-2 text-xs text-green-600 hover:underline"
                          >
                            Confirm
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/work-orders/${wo.id}`}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {canManage && wo.status !== 'COMPLETED' && (
                            <Link
                              to={`/work-orders/${wo.id}?edit=true`}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>
                          )}
                          {canManage && (
                            <button
                              onClick={() => handleDelete(wo.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
