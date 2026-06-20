import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  productionSessionService,
  checklistV2Service,
} from '../../../services';
import { CheckCircle, XCircle, ChevronRight, ArrowLeft, Save } from 'lucide-react';
import type { PreProductionChecklistItemV2 } from '../../../types/database';

function formatDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Items that require remarks when NG
const NG_REQUIRES_REMARKS = new Set([
  'Shredder Cleanlines', 'Magnet Trap', 'Filling Station', 'Dryer Condition',
  'Bench Scale', 'Press Machine', 'Metal Detector', 'Work Area', 'Work tools', 'Supporting Supplies'
]);

export default function PreProductionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // If no sessionId, show session selection
  const [selectedSession, setSelectedSession] = useState<string>(sessionId || '');
  const [phase, setPhase] = useState<'initial' | 'final'>('initial');

  const { data: sessions = [] } = useQuery({
    queryKey: ['production_sessions'],
    queryFn: () => productionSessionService.getAll({ status: 'ACTIVE' }),
    enabled: !sessionId,
  });

  const { data: session } = useQuery({
    queryKey: ['production_sessions', selectedSession],
    queryFn: () => productionSessionService.getById(selectedSession),
    enabled: !!selectedSession,
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['checklist_v2', selectedSession],
    queryFn: () => checklistV2Service.getBySession(selectedSession),
    enabled: !!selectedSession,
  });

  const initMutation = useMutation({
    mutationFn: () => checklistV2Service.initForSession(selectedSession),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checklist_v2', selectedSession] }),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PreProductionChecklistItemV2> }) =>
      checklistV2Service.update(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checklist_v2', selectedSession] }),
  });

  function handleConditionChange(
    item: PreProductionChecklistItemV2,
    field: 'initial_condition' | 'final_condition',
    value: 'OK' | 'NG'
  ) {
    updateItemMutation.mutate({ id: item.id, updates: { [field]: value } });
  }

  function handleRemarksChange(item: PreProductionChecklistItemV2, remarks: string) {
    updateItemMutation.mutate({ id: item.id, updates: { remarks } });
  }

  const activeSession = selectedSession ? session : null;

  if (!selectedSession) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Pre-Production Checklist</h1>
        <p className="text-gray-500 text-sm">Select an active session to begin checklist</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.length === 0 ? (
            <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
              No active sessions found. Create a Daily Instruction first.
            </div>
          ) : (
            sessions.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSession(s.id)}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-colors text-left"
              >
                <div>
                  <p className="font-medium text-gray-900 text-sm">{s.session_number}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDate(s.session_date)} · {s.shift_label} · Line {s.line_label}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
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
          <h1 className="text-2xl font-bold text-gray-900">Pre-Production Checklist</h1>
          {activeSession && (
            <p className="text-gray-500 text-sm">
              {activeSession.session_number} · {formatDate(activeSession.session_date)} ·
              Shift {activeSession.shift_label} · Line {activeSession.line_label}
            </p>
          )}
        </div>
      </div>

      {/* Phase Toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 flex gap-1 w-fit">
        <button
          onClick={() => setPhase('initial')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            phase === 'initial'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Initial Condition
        </button>
        <button
          onClick={() => setPhase('final')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            phase === 'final'
              ? 'bg-green-500 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Final Condition
        </button>
      </div>

      <p className="text-xs text-gray-500 -mt-3">
        {phase === 'initial'
          ? 'Fill initial conditions before production session begins.'
          : 'Fill final conditions after production session ends.'}
      </p>

      {/* Init Checklist Button */}
      {items.length === 0 && !itemsLoading && (
        <button
          onClick={() => initMutation.mutate()}
          disabled={initMutation.isPending}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {initMutation.isPending ? 'Initializing...' : 'Initialize Checklist'}
        </button>
      )}

      {/* Checklist Table */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium w-8">#</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Item</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-medium w-32">
                    {phase === 'initial' ? 'Initial Condition' : 'Final Condition'}
                  </th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">
                    Remarks {' '}
                    <span className="text-xs text-red-500 font-normal">(required if NG)</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => {
                  const condField = phase === 'initial' ? 'initial_condition' : 'final_condition';
                  const cond = item[condField];
                  const isNG = cond === 'NG';
                  const showRemarksWarning = isNG && !item.remarks;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50 transition-colors ${isNG ? 'bg-red-50/40' : cond === 'OK' ? 'bg-green-50/30' : ''}`}
                    >
                      <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{item.item_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleConditionChange(item, condField, 'OK')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                              cond === 'OK'
                                ? 'bg-green-500 text-white border-green-500 shadow-sm'
                                : 'border-gray-200 text-gray-500 hover:border-green-400 hover:text-green-600'
                            }`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            OK
                          </button>
                          <button
                            onClick={() => handleConditionChange(item, condField, 'NG')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                              cond === 'NG'
                                ? 'bg-red-500 text-white border-red-500 shadow-sm'
                                : 'border-gray-200 text-gray-500 hover:border-red-400 hover:text-red-600'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            NG
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.remarks || ''}
                          onChange={e => handleRemarksChange(item, e.target.value)}
                          placeholder={isNG ? 'Required for NG...' : 'Optional remarks...'}
                          className={`w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 transition-colors ${
                            showRemarksWarning
                              ? 'border-red-300 bg-red-50 focus:ring-red-300'
                              : 'border-gray-200 focus:ring-green-400'
                          }`}
                        />
                        {showRemarksWarning && (
                          <p className="text-xs text-red-500 mt-0.5">Remarks required for NG</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {(['initial', 'final'] as const).map(ph => {
            const condField = ph === 'initial' ? 'initial_condition' : 'final_condition';
            const okCount = items.filter(i => i[condField] === 'OK').length;
            const ngCount = items.filter(i => i[condField] === 'NG').length;
            const pending = items.filter(i => !i[condField]).length;
            return (
              <div key={ph} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-xs text-gray-500 mb-2 capitalize">{ph} Condition</p>
                <div className="flex justify-center gap-3 text-sm">
                  <span className="text-green-600 font-semibold">{okCount} OK</span>
                  <span className="text-red-500 font-semibold">{ngCount} NG</span>
                  <span className="text-gray-400">{pending} pending</span>
                </div>
              </div>
            );
          })}
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-2">Total Items</p>
            <p className="text-2xl font-bold text-gray-900">{items.length}</p>
          </div>
        </div>
      )}
    </div>
  );
}
