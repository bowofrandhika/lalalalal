import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, CreditCard as Edit2, X, Save, Eye, EyeOff, Upload, User } from 'lucide-react';
import { userService } from '../../../services';
import { useAuth } from '../../../hooks';
import type { AppUser, UserRole } from '../../../types/database';

const ROLES: { value: UserRole; label: string; color: string }[] = [
  { value: 'SUPER_USER', label: 'Super User', color: 'bg-red-100 text-red-800' },
  { value: 'ADMIN', label: 'Administrator', color: 'bg-purple-100 text-purple-800' },
  { value: 'SPV', label: 'Supervisor', color: 'bg-blue-100 text-blue-800' },
  { value: 'MANDOR', label: 'Foreman', color: 'bg-green-100 text-green-800' },
  { value: 'DRYER_OPERATOR', label: 'Dryer Operator', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'PACKING_OPERATOR', label: 'Packing Operator', color: 'bg-orange-100 text-orange-800' },
];

const ACCESS_DESCRIPTIONS: Record<UserRole, string> = {
  SUPER_USER: 'Full access to all features',
  ADMIN: 'Production, Issues & Reports',
  SPV: 'Production & Issues',
  MANDOR: 'Production & Issues (Foreman)',
  DRYER_OPERATOR: 'Dryer Monitoring',
  PACKING_OPERATOR: 'Packing Workflow',
};

interface UserFormData {
  email: string;
  password: string;
  full_name: string;
  username: string;
  role: UserRole;
  phone: string;
  department: string;
}

const emptyForm: UserFormData = {
  email: '',
  password: '',
  full_name: '',
  username: '',
  role: 'MANDOR',
  phone: '',
  department: '',
};

export default function UserListPage() {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPasswordFor, setChangingPasswordFor] = useState<AppUser | null>(null);
  const [photoUploading, setPhotoUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoTarget, setPhotoTarget] = useState<AppUser | null>(null);

  const isSuperUser = appUser?.role === 'SUPER_USER';

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: UserFormData) =>
      userService.createWithAuth(data.email, data.password, {
        username: data.username,
        full_name: data.full_name,
        role: data.role,
        phone: data.phone || undefined,
        department: data.department || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setForm(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AppUser> }) =>
      userService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const filteredUsers = users.filter(u =>
    [u.username, u.full_name, u.email].some(f =>
      (f || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  function openCreate() {
    setEditingUser(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(user: AppUser) {
    setEditingUser(user);
    setForm({
      email: user.email,
      password: '',
      full_name: user.full_name,
      username: user.username,
      role: user.role,
      phone: user.phone || '',
      department: user.department || '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingUser) {
      await updateMutation.mutateAsync({
        id: editingUser.id,
        data: {
          full_name: form.full_name,
          username: form.username,
          role: form.role,
          phone: form.phone || undefined,
          department: form.department || undefined,
        },
      });
    } else {
      await createMutation.mutateAsync(form);
    }
  }

  async function handleDelete(user: AppUser) {
    if (!window.confirm(`Delete user ${user.full_name}?`)) return;
    await deleteMutation.mutateAsync(user.id);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!changingPasswordFor || !newPassword) return;
    try {
      await userService.changePassword(changingPasswordFor.user_id, newPassword);
      setChangingPasswordFor(null);
      setNewPassword('');
      alert('Password updated successfully');
    } catch {
      alert('Failed to update password');
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!photoTarget || !e.target.files?.[0]) return;
    setPhotoUploading(photoTarget.id);
    try {
      const url = await userService.uploadPhoto(photoTarget.user_id, e.target.files[0]);
      await userService.update(photoTarget.id, { photo_url: url });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch {
      alert('Failed to upload photo');
    } finally {
      setPhotoUploading(null);
      setPhotoTarget(null);
    }
  }

  const getRoleMeta = (role: UserRole) => ROLES.find(r => r.value === role) || ROLES[5];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage users, roles, and access levels</p>
        </div>
        {isSuperUser && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">User</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Role</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Access Level</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                  {isSuperUser && <th className="text-left px-4 py-3 text-gray-600 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map(user => {
                  const roleMeta = getRoleMeta(user.role);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {user.photo_url ? (
                              <img
                                src={user.photo_url}
                                alt={user.full_name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm">
                                {user.full_name?.charAt(0).toUpperCase() || 'U'}
                              </div>
                            )}
                            {isSuperUser && (
                              <button
                                onClick={() => {
                                  setPhotoTarget(user);
                                  fileInputRef.current?.click();
                                }}
                                className="absolute -bottom-1 -right-1 w-5 h-5 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50"
                                title="Upload photo"
                              >
                                {photoUploading === user.id
                                  ? <span className="w-2 h-2 border border-gray-400 rounded-full animate-spin" />
                                  : <Upload className="w-2.5 h-2.5 text-gray-500" />}
                              </button>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.full_name}</p>
                            <p className="text-gray-400 text-xs">@{user.username} · {user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleMeta.color}`}>
                          {roleMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {ACCESS_DESCRIPTIONS[user.role]}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {isSuperUser && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(user)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setChangingPasswordFor(user); setNewPassword(''); }}
                              className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                              title="Change password"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {user.id !== appUser?.id && (
                              <button
                                onClick={() => handleDelete(user)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hidden file input for photo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Add/Edit User Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    required
                    value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Username *</label>
                  <input
                    required
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="username"
                  />
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="user@example.com"
                  />
                </div>
              )}

              {!editingUser && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
                  <div className="relative">
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
                      placeholder="Min. 8 characters"
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role & Access Level *</label>
                <select
                  required
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>
                      {r.label} — {ACCESS_DESCRIPTIONS[r.value]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                  <input
                    value={form.department}
                    onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Department"
                  />
                </div>
              </div>

              {(createMutation.error || updateMutation.error) && (
                <p className="text-red-600 text-sm">
                  {String((createMutation.error || updateMutation.error))}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {changingPasswordFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
              <button onClick={() => setChangingPasswordFor(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Set new password for <span className="font-medium">{changingPasswordFor.full_name}</span>
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">New Password *</label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
                    placeholder="Min. 8 characters"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setChangingPasswordFor(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-600"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
