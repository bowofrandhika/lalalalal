import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Eye, CreditCard as Edit2, Play, CheckCheck, CalendarDays } from 'lucide-react';
import { productionSessionService } from '../../../services';
import { useAuth } from '../../../hooks';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ACTIVE: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const SHIFT_LABELS: Record<string, string> = { '1': 'Morning', '2': 'Afternoon' };

function formatDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DailyInstructionListPage() {
  const queryClient = useQueryClient();
  const { appUser } = useAuth();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'active' | 'completed'>('active');

  const canManage = ['SUPER_USER', 'ADMIN', 'SPV', 'MANDOR'].includes(appUser?.role || '');

  const { data: allSessions = [], isLoading } = useQuery({
    queryKey: ['production_sessions'],
    queryFn: () => productionSessionService.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productionSessionService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['production_sessions'] }),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => productionSessionService.activate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['production_sessions'] }),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => productionSessionService.complete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['production_sessions'] }),
  });

  const activeSessions = allSessions.filter(s => !['COMPLETED', 'CANCELLED'].includes(s.status));
  const completedSessions = allSessions.filter(s => ['COMPLETED', 'CANCELLED'].includes(s.status));
  const displayed = (tab === 'active' ? activeSessions : completedSessions).filter(s =>
    [s.session_number, s.shift_label, s.line_label, (s as any).work_orders?.wo_number].some(f =>
      (f || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Instructions</h1>
          <p className="text-gray-500 text-sm mt-1">
            {activeSessions.length} active · {completedSessions.length} completed
          </p>
        </div>
        {canManage && (
          <Link
            to="/daily-instructions/new"
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> New Session
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex gap-1">
            <button
              onClick={() => setTab('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'active' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Active ({activeSessions.length})
            </button>
            <button
              onClick={() => setTab('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'completed' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Completed ({completedSessions.length})
            </button>
          </div>
          <input
            type="text"
            placeholder="Search session..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-52"
          />
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : displayed.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No {tab} sessions found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {displayed.map(session => {
              const targetKg = session.target_kg || 0;
              const completedKg = session.completed_kg || 0;
              const pct = targetKg > 0 ? Math.min((completedKg / targetKg) * 100, 100) : 0;
              return (
                <div key={session.id} className="border border-gray-200 rounded-xl p-4 space-y-3 hover:border-green-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        to={`/daily-instructions/${session.id}`}
                        className="font-semibold text-blue-600 hover:text-blue-800 text-sm"
                      >
                        {session.session_number}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(session.session_date)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[session.status]}`}>
                      {session.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                    <div>
                      <span className="text-gray-400">Shift:</span> {session.shift_label || '-'}
                    </div>
                    <div>
                      <span className="text-gray-400">Line:</span> {session.line_label || '-'}
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-400">WO:</span> {(session as any).work_orders?.wo_number || '-'}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Production</span>
                      <span className={pct >= 100 ? 'text-green-600 font-medium' : ''}>
                        {completedKg.toLocaleString()} / {targetKg.toLocaleString()} kg
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                    <Link
                      to={`/pre-production/${session.id}`}
                      className="flex-1 text-center px-2 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-xs hover:bg-orange-100 transition-colors"
                    >
                      Pre-Prod
                    </Link>
                    <Link
                      to={`/production/${session.id}`}
                      className="flex-1 text-center px-2 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs hover:bg-blue-100 transition-colors"
                    >
                      Prod Log
                    </Link>
                    {canManage && session.status === 'DRAFT' && (
                      <button
                        onClick={() => window.confirm('Activate session?') && activateMutation.mutate(session.id)}
                        className="px-2 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs hover:bg-green-100 transition-colors"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    )}
                    {canManage && session.status === 'ACTIVE' && (
                      <button
                        onClick={() => window.confirm('Mark session as completed?') && completeMutation.mutate(session.id)}
                        className="px-2 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs hover:bg-emerald-100 transition-colors"
                      >
                        <CheckCheck className="w-3 h-3" />
                      </button>
                    )}
                    <Link to={`/daily-instructions/${session.id}`} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                    {canManage && session.status !== 'COMPLETED' && (
                      <Link to={`/daily-instructions/${session.id}?edit=true`} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    {canManage && (
                      <button
                        onClick={() => window.confirm('Delete session?') && deleteMutation.mutate(session.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
