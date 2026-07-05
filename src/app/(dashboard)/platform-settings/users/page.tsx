'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';
import type { User } from '@/types';
import { UserRole, BusinessScope } from '@/types';
import useAuthStore from '@/store/auth.store';
import useUIStore from '@/store/ui.store';

const ALL_SCOPES = Object.values(BusinessScope);

const ROLE_COLORS: Record<string, string> = {
  super_admin:   'bg-purple-100 text-purple-800',
  admin:         'bg-blue-100 text-blue-800',
  manager:       'bg-indigo-100 text-indigo-700',
  customer:      'bg-gray-100 text-gray-600',
  waiter:        'bg-yellow-100 text-yellow-700',
  kitchen_staff: 'bg-orange-100 text-orange-700',
  bar_staff:     'bg-pink-100 text-pink-700',
  door_staff:    'bg-teal-100 text-teal-700',
};

function ScopeToggle({ scope, active, onChange }: {
  scope: BusinessScope;
  active: boolean;
  onChange: () => void;
}) {
  return (
    <button onClick={onChange}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
        active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'text-gray-600 border-gray-300 hover:border-blue-400'
      }`}>
      {scope}
    </button>
  );
}

export default function UsersManagementPage() {
  const { user: currentUser }             = useAuthStore();
  const addToast                           = useUIStore(s => s.addToast);
  const [users, setUsers]                 = useState<User[]>([]);
  const [total, setTotal]                 = useState(0);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [roleFilter, setRoleFilter]       = useState('');
  const [editUser, setEditUser]           = useState<User | null>(null);
  const [editScopes, setEditScopes]       = useState<BusinessScope[]>([]);
  const [saving, setSaving]               = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized]   = useState(false);

  // ── ALL hooks must be before any early return ──────────────────────────────
  useEffect(() => {
    if (currentUser?.role === UserRole.SUPER_ADMIN) {
      setIsAuthorized(true);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!isAuthorized) return;
    fetchUsers();
  }, [search, roleFilter, isAuthorized]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.superAdmin.listUsers({
        limit: 50,
        search: search || undefined,
        role:   roleFilter as UserRole || undefined,
      }) as any;
      setUsers(res.data?.data ?? res.data ?? []);
      setTotal(res.data?.total ?? res.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditScopes(u.businessScopes ?? []);
  };

  const handleSaveScopes = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await apiClient.superAdmin.updateScopes(editUser.id, editScopes);
      setEditUser(null);
      fetchUsers();
      addToast('Business scopes updated', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to update scopes', 'error');
    } finally { setSaving(false); }
  };

  const handlePromote = async (userId: string) => {
    if (!confirm('Promote this user to ADMIN?')) return;
    setActionLoading(userId);
    try { await apiClient.superAdmin.promote(userId); fetchUsers(); addToast('User promoted to ADMIN', 'success'); }
    catch (e: any) { addToast(e?.response?.data?.message ?? 'Failed to promote', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleDemote = async (userId: string) => {
    if (!confirm('Demote this admin to CUSTOMER?')) return;
    setActionLoading(userId);
    try { await apiClient.superAdmin.demote(userId); fetchUsers(); addToast('Admin demoted to CUSTOMER', 'success'); }
    catch (e: any) { addToast(e?.response?.data?.message ?? 'Failed to demote', 'error'); }
    finally { setActionLoading(null); }
  };

  const toggleScope = (scope: BusinessScope) => {
    setEditScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  // ── Early return AFTER all hooks ───────────────────────────────────────────
  if (!isAuthorized) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🔒</div>
        <p className="text-gray-500">Only Super Admins can manage users.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Users</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total users</p>
        </div>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <input type="text" placeholder="Search by name or email..."
          className="px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="px-3 py-2 border rounded-lg text-sm"
          value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading users...</div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['User','Role','Scopes','Status','Created',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No users found</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-800">{u.firstName} {u.lastName}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.businessScopes?.length
                        ? u.businessScopes.map(s => (
                            <span key={s} className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">{s}</span>
                          ))
                        : <span className="text-xs text-gray-400">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${u.isActive ? 'text-green-600' : 'text-red-500'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(u)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                        Edit Scopes
                      </button>
                      {u.role === UserRole.CUSTOMER && (
                        <button onClick={() => handlePromote(u.id)} disabled={actionLoading === u.id}
                          className="text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-40">
                          Promote
                        </button>
                      )}
                      {u.role === UserRole.ADMIN && u.id !== currentUser?.id && (
                        <button onClick={() => handleDemote(u.id)} disabled={actionLoading === u.id}
                          className="text-xs text-orange-600 hover:text-orange-800 font-medium disabled:opacity-40">
                          Demote
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Edit Business Scopes</h3>
              <p className="text-sm text-gray-500 mt-1">
                {editUser.firstName} {editUser.lastName} · {editUser.email}
              </p>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Select which business verticals this user can access:
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {ALL_SCOPES.map(scope => (
                  <ScopeToggle
                    key={scope}
                    scope={scope}
                    active={editScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                  />
                ))}
              </div>
              {editScopes.length === 0 && (
                <p className="text-xs text-orange-600 mb-4">
                  ⚠️ No scopes selected — user will only see shared sections
                </p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setEditUser(null)}
                  className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600">Cancel</button>
                <button onClick={handleSaveScopes} disabled={saving}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Scopes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}