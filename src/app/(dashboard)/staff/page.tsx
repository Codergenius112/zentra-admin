'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/api';
import useAuthStore from '@/store/auth.store';
import useUIStore from '@/store/ui.store';
import type { User } from '@/types';
import { UserRole, BusinessScope } from '@/types';

const STAFF_ROLES = [
  UserRole.WAITER, UserRole.KITCHEN_STAFF, UserRole.BAR_STAFF,
  UserRole.DOOR_STAFF, UserRole.MANAGER, UserRole.ADMIN,
];

const ADMIN_ROLES = [UserRole.ADMIN, UserRole.MANAGER];

const ALL_SCOPES = [BusinessScope.CAR_RENTAL, BusinessScope.APARTMENT, BusinessScope.TABLE_CLUB, BusinessScope.EVENT_TICKETING];

const SCOPE_LABELS: Record<string, string> = {
  CAR_RENTAL: 'Car Rental',
  APARTMENT: 'Apartment',
  TABLE_CLUB: 'Table / Club',
  EVENT_TICKETING: 'Event Ticketing',
};

const ROLE_COLORS: Record<string, string> = {
  admin:         'bg-blue-100 text-blue-800',
  manager:       'bg-indigo-100 text-indigo-700',
  waiter:        'bg-yellow-100 text-yellow-800',
  kitchen_staff: 'bg-orange-100 text-orange-700',
  bar_staff:     'bg-pink-100 text-pink-700',
  door_staff:    'bg-teal-100 text-teal-700',
  super_admin:   'bg-purple-100 text-purple-800',
};

function ScopeCheckboxes({ selected, onChange }: { selected: string[]; onChange: (scopes: string[]) => void }) {
  const toggle = (scope: string) => {
    if (selected.includes(scope)) {
      onChange(selected.filter(s => s !== scope));
    } else {
      onChange([...selected, scope]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {ALL_SCOPES.map(scope => (
        <label key={scope} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={selected.includes(scope)}
            onChange={() => toggle(scope)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          {SCOPE_LABELS[scope] || scope}
        </label>
      ))}
    </div>
  );
}

export default function StaffPage() {
  const { user: currentUser } = useAuthStore();
  const addToast = useUIStore(s => s.addToast);
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;

  const [staff, setStaff]                   = useState<User[]>([]);
  const [total, setTotal]                   = useState(0);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState('');
  const [roleFilter, setRoleFilter]         = useState('');
  const [showAdd, setShowAdd]               = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [deactivating, setDeactivating]     = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<User | null>(null);
  const [form, setForm] = useState({
    email: '', firstName: '', lastName: '', phone: '',
    role: UserRole.WAITER, password: '', businessScopes: [] as string[],
  });
  const [adminForm, setAdminForm] = useState({
    email: '', firstName: '', lastName: '', phone: '',
    role: UserRole.ADMIN, password: '', businessScopes: [] as string[],
  });

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.staff.list({
        limit: 100,
        search: search || undefined,
        role:   roleFilter || undefined,
      }) as any;
      setStaff(res.data?.data ?? res.data ?? []);
      setTotal(res.data?.total ?? res.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, roleFilter]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleAdd = async () => {
    setSubmitting(true);
    try {
      await apiClient.staff.add({
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
        phone: form.phone || undefined,
        password: form.password || undefined,
        businessScopes: form.businessScopes.length > 0 ? form.businessScopes : undefined,
      });
      setShowAdd(false);
      setForm({ email: '', firstName: '', lastName: '', phone: '', role: UserRole.WAITER, password: '', businessScopes: [] });
      fetchStaff();
      addToast('Staff member added successfully', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to add staff', 'error');
    } finally { setSubmitting(false); }
  };

  const handleCreateAdmin = async () => {
    setSubmitting(true);
    try {
      await apiClient.adminRegister({
        email: adminForm.email,
        firstName: adminForm.firstName,
        lastName: adminForm.lastName,
        phone: adminForm.phone || undefined,
        role: adminForm.role,
        password: adminForm.password,
        businessScopes: adminForm.businessScopes.length > 0 ? adminForm.businessScopes : undefined,
      });
      setShowCreateAdmin(false);
      setAdminForm({ email: '', firstName: '', lastName: '', phone: '', role: UserRole.ADMIN, password: '', businessScopes: [] });
      fetchStaff();
      addToast('Admin created successfully', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to create admin', 'error');
    } finally { setSubmitting(false); }
  };

  const handleDeactivate = async (member: User) => {
    setDeactivating(member.id);
    try {
      await apiClient.staff.deactivate(member.id);
      setConfirmDeactivate(null);
      fetchStaff();
      addToast(`${member.firstName} ${member.lastName} deactivated`, 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to deactivate', 'error');
    } finally { setDeactivating(null); }
  };

  const activeCount   = staff.filter(s => s.isActive).length;
  const inactiveCount = staff.length - activeCount;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total} total · <span className="text-green-600">{activeCount} active</span>
            {inactiveCount > 0 && <> · <span className="text-red-500">{inactiveCount} inactive</span></>}
          </p>
        </div>
        <div className="flex gap-2">
          {isSuperAdmin && (
            <button onClick={() => setShowCreateAdmin(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm">
              + Create Admin
            </button>
          )}
          <button onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
            + Add Staff
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <input type="text" placeholder="Search name or email..."
          className="px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-60"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="px-3 py-2 border rounded-lg text-sm"
          value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading staff...</div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Email', 'Role', 'Scopes', 'Status', 'Last Login', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No staff found</td></tr>
              ) : staff.map(member => (
                <tr key={member.id} className={`hover:bg-gray-50 ${!member.isActive ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-800">{member.firstName} {member.lastName}</div>
                    <div className="text-xs text-gray-400">ID: {member.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{member.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[member.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {member.businessScopes?.length
                        ? member.businessScopes.map(s => (
                            <span key={s} className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">{s}</span>
                          ))
                        : <span className="text-xs text-gray-400">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${member.isActive ? 'text-green-600' : 'text-red-500'}`}>
                      {member.isActive ? '● Active' : '● Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    {member.isActive && member.role !== UserRole.SUPER_ADMIN && (
                      <button onClick={() => setConfirmDeactivate(member)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium">
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Add Staff Member</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-3">
              {([
                { label: 'First Name',          key: 'firstName', type: 'text'     },
                { label: 'Last Name',           key: 'lastName',  type: 'text'     },
                { label: 'Email',               key: 'email',     type: 'email'    },
                { label: 'Phone',               key: 'phone',     type: 'tel'      },
                { label: 'Temporary Password',  key: 'password',  type: 'password' },
              ] as const).map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type={type}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm"
                  value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}>
                  {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Business Scopes</label>
                <ScopeCheckboxes
                  selected={form.businessScopes}
                  onChange={(scopes) => setForm(f => ({ ...f, businessScopes: scopes }))}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdd(false)}
                  className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600">Cancel</button>
                <button onClick={handleAdd} disabled={submitting}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {submitting ? 'Adding...' : 'Add Staff'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Admin Modal (SUPER_ADMIN only) */}
      {showCreateAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Create Admin / Manager</h3>
              <button onClick={() => setShowCreateAdmin(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-3">
              {([
                { label: 'First Name', key: 'firstName', type: 'text' },
                { label: 'Last Name',  key: 'lastName',  type: 'text' },
                { label: 'Email',      key: 'email',     type: 'email' },
                { label: 'Phone',      key: 'phone',     type: 'tel' },
                { label: 'Password',   key: 'password',  type: 'password' },
              ] as const).map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type={type}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={(adminForm as any)[key]}
                    onChange={e => setAdminForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm"
                  value={adminForm.role} onChange={e => setAdminForm(f => ({ ...f, role: e.target.value as UserRole }))}>
                  {ADMIN_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Business Scopes</label>
                <ScopeCheckboxes
                  selected={adminForm.businessScopes}
                  onChange={(scopes) => setAdminForm(f => ({ ...f, businessScopes: scopes }))}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreateAdmin(false)}
                  className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600">Cancel</button>
                <button onClick={handleCreateAdmin} disabled={submitting}
                  className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {submitting ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Deactivate Staff</h3>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to deactivate <strong>{confirmDeactivate.firstName} {confirmDeactivate.lastName}</strong>?
              They will lose access immediately.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeactivate(null)}
                className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600">Cancel</button>
              <button
                onClick={() => handleDeactivate(confirmDeactivate)}
                disabled={deactivating === confirmDeactivate.id}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {deactivating === confirmDeactivate.id ? 'Deactivating...' : 'Yes, Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
