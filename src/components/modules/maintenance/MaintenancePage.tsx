import { useState } from 'react';
import {
  useMaintenanceSchedules, useOverdueMaintenance, useMaintenanceRecords,
  useCreateMaintenanceSchedule
} from '../../../hooks';
import { useForm } from 'react-hook-form';
import { Wrench, Clock, AlertTriangle, CheckCircle, Plus, X } from 'lucide-react';
import { formatDate, getStatusColor } from '../../../lib/utils';
import type { MaintenanceSchedule } from '../../../types/database';

type ScheduleForm = Omit<MaintenanceSchedule, 'id' | 'created_at' | 'updated_at'>;

export default function MaintenancePage() {
  const { data: schedules, isLoading } = useMaintenanceSchedules();
  const { data: overdue } = useOverdueMaintenance();
  const { data: records } = useMaintenanceRecords();
  const createSchedule = useCreateMaintenanceSchedule();

  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedules' | 'records'>('schedules');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ScheduleForm>();

  const activeCount = schedules?.filter(s => s.status === 'ACTIVE').length || 0;
  const overdueCount = overdue?.length || 0;
  const completedCount = records?.filter(r => r.status === 'COMPLETED' || r.status === 'VERIFIED').length || 0;

  const filteredSchedules = schedules?.filter(s => {
    if (priorityFilter && s.priority !== priorityFilter) return false;
    if (typeFilter && s.maintenance_type !== typeFilter) return false;
    return true;
  });

  const onSubmit = async (data: ScheduleForm) => {
    await createSchedule.mutateAsync(data);
    reset();
    setShowModal(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Management</h1>
          <p className="text-gray-500 text-sm">Perawatan preventif dan korektif mesin</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 gap-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Tambah Jadwal
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
            <p className="text-sm text-gray-500">Jadwal Aktif</p>
          </div>
        </div>
        <div className={`rounded-xl border p-5 flex items-center gap-4 ${overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${overdueCount > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
            <AlertTriangle className={`w-6 h-6 ${overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{overdueCount}</p>
            <p className="text-sm text-gray-500">Terlambat</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
            <p className="text-sm text-gray-500">Selesai</p>
          </div>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdue && overdue.length > 0 && (
        <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="font-semibold text-red-800">Maintenance Terlambat!</span>
          </div>
          <div className="space-y-1">
            {overdue.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-red-700">{item.equipment_name} — {item.maintenance_type}</span>
                <span className="text-red-500 font-medium">Due: {formatDate(item.next_maintenance_date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {(['schedules', 'records'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'schedules' ? 'Jadwal Maintenance' : 'Riwayat Pekerjaan'}
          </button>
        ))}
      </div>

      {activeTab === 'schedules' && (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
            >
              <option value="">Semua Prioritas</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
            >
              <option value="">Semua Tipe</option>
              <option value="PREVENTIVE">Preventive</option>
              <option value="PREDICTIVE">Predictive</option>
              <option value="ROUTINE">Routine</option>
            </select>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" />
                <p className="mt-2 text-gray-500 text-sm">Memuat data...</p>
              </div>
            ) : (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Peralatan</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipe</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Frekuensi</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Jadwal Berikutnya</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Prioritas</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSchedules && filteredSchedules.length > 0 ? (
                    filteredSchedules.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium text-gray-900">{s.equipment_name}</p>
                          {s.equipment_code && <p className="text-xs text-gray-400">{s.equipment_code}</p>}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{s.maintenance_type}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{s.frequency}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">
                          <span className={new Date(s.next_maintenance_date) < new Date() ? 'text-red-600 font-medium' : ''}>
                            {formatDate(s.next_maintenance_date)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(s.priority)}`}>
                            {s.priority}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(s.status)}`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                        <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Belum ada jadwal maintenance</p>
                        <button onClick={() => setShowModal(true)} className="text-xs text-green-600 hover:underline mt-1">
                          Tambah jadwal pertama →
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === 'records' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Peralatan</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tipe</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mulai</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Selesai</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records && records.length > 0 ? (
                records.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{r.equipment_name}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{r.maintenance_type}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{r.actual_start_date ? formatDate(r.actual_start_date) : '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{r.actual_end_date ? formatDate(r.actual_end_date) : '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-sm">
                    Belum ada riwayat pekerjaan maintenance
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah Jadwal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Tambah Jadwal Maintenance</h3>
              <button onClick={() => { setShowModal(false); reset(); }} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nama Peralatan *</label>
                  <input
                    {...register('equipment_name', { required: 'Wajib diisi' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    placeholder="cth: Hammermill 1"
                  />
                  {errors.equipment_name && <p className="text-xs text-red-500 mt-1">{errors.equipment_name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Kode Peralatan</label>
                  <input
                    {...register('equipment_code')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    placeholder="HM-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipe Peralatan *</label>
                  <input
                    {...register('equipment_type', { required: 'Wajib diisi' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    placeholder="cth: Mesin Giling"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipe Maintenance *</label>
                  <select
                    {...register('maintenance_type', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  >
                    <option value="PREVENTIVE">Preventive</option>
                    <option value="PREDICTIVE">Predictive</option>
                    <option value="ROUTINE">Routine</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Frekuensi *</label>
                  <select
                    {...register('frequency', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  >
                    <option value="DAILY">Harian</option>
                    <option value="WEEKLY">Mingguan</option>
                    <option value="MONTHLY">Bulanan</option>
                    <option value="QUARTERLY">3 Bulanan</option>
                    <option value="YEARLY">Tahunan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Jadwal Berikutnya *</label>
                  <input
                    type="date"
                    {...register('next_maintenance_date', { required: 'Wajib diisi' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Prioritas *</label>
                  <select
                    {...register('priority', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    {...register('status')}
                    defaultValue="ACTIVE"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="IN_PROGRESS">In Progress</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Prosedur / Catatan</label>
                  <textarea
                    {...register('maintenance_procedure')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 resize-none"
                    placeholder="Langkah-langkah maintenance..."
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Jadwal'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); reset(); }}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
