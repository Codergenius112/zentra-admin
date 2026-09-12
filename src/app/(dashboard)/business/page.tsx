'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/api';
import useUIStore from '@/store/ui.store';
import type { Business } from '@/types';
import { BusinessStatus, BusinessScope } from '@/types';

const STATUS_TABS: { label: string; value: BusinessStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: BusinessStatus.PENDING },
  { label: 'Approved', value: BusinessStatus.APPROVED },
  { label: 'Suspended', value: BusinessStatus.SUSPENDED },
  { label: 'Rejected', value: BusinessStatus.REJECTED },
];

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  REJECTED: 'bg-gray-200 text-gray-600',
};

const ALL_SCOPES = [
  BusinessScope.TABLE_CLUB,
  BusinessScope.EVENT_TICKETING,
  BusinessScope.APARTMENT,
  BusinessScope.CAR_RENTAL,
];

const SCOPE_LABELS: Record<string, string> = {
  TABLE_CLUB: 'Table / Club',
  EVENT_TICKETING: 'Event Ticketing',
  APARTMENT: 'Apartments',
  CAR_RENTAL: 'Car Rental',
};

// A single confirm action, reused for approve/reject/suspend/reinstate —
// they're all the same underlying operation (a status change) with
// different copy and a different target status.
interface PendingAction {
  business: Business;
  targetStatus: BusinessStatus;
  title: string;
  body: string;
  confirmLabel: string;
  confirmColor: string;
}

export default function BusinessesPage() {
  const addToast = useUIStore((s) => s.addToast);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<BusinessStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [acting, setActing] = useState(false);
  const [editingScopes, setEditingScopes] = useState<Business | null>(null);
  const [scopesDraft, setScopesDraft] = useState<string[]>([]);
  const [savingScopes, setSavingScopes] = useState(false);

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.superAdmin.listBusinesses({
        status: tab === 'ALL' ? undefined : tab,
        search: search || undefined,
        limit: 100,
      }) as any;
      const body = res.data ?? res;
      setBusinesses(body.data ?? []);
      setTotal(body.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [tab, search]);

  useEffect(() => { fetchBusinesses(); }, [fetchBusinesses]);

  const confirmChangeStatus = async () => {
    if (!pendingAction) return;
    setActing(true);
    try {
      await apiClient.superAdmin.updateBusinessStatus(pendingAction.business.id, pendingAction.targetStatus);
      setPendingAction(null);
      fetchBusinesses();
      addToast(`Business ${pendingAction.targetStatus.toLowerCase()}`, 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to update business status', 'error');
    } finally { setActing(false); }
  };

  const openEditScopes = (b: Business) => {
    setEditingScopes(b);
    setScopesDraft(b.businessScopes ?? []);
  };

  const toggleScope = (scope: string) => {
    setScopesDraft((s) => s.includes(scope) ? s.filter(x => x !== scope) : [...s, scope]);
  };

  const saveScopes = async () => {
    if (!editingScopes) return;
    setSavingScopes(true);
    try {
      await apiClient.superAdmin.updateBusinessScopes(editingScopes.id, scopesDraft as BusinessScope[]);
      setEditingScopes(null);
      fetchBusinesses();
      addToast('Business scopes updated', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to update scopes', 'error');
    } finally { setSavingScopes(false); }
  };

  const actionsFor = (b: Business): { label: string; targetStatus: BusinessStatus; color: string }[] => {
    switch (b.status) {
      case BusinessStatus.PENDING:
        return [
          { label: 'Approve', targetStatus: BusinessStatus.APPROVED, color: 'text-green-600 hover:text-green-800' },
          { label: 'Reject', targetStatus: BusinessStatus.REJECTED, color: 'text-red-500 hover:text-red-700' },
        ];
      case BusinessStatus.APPROVED:
        return [{ label: 'Suspend', targetStatus: BusinessStatus.SUSPENDED, color: 'text-red-500 hover:text-red-700' }];
      case BusinessStatus.SUSPENDED:
        return [{ label: 'Reinstate', targetStatus: BusinessStatus.APPROVED, color: 'text-green-600 hover:text-green-800' }];
      case BusinessStatus.REJECTED:
        return [{ label: 'Approve', targetStatus: BusinessStatus.APPROVED, color: 'text-green-600 hover:text-green-800' }];
      default:
        return [];
    }
  };

  const actionCopy = (b: Business, targetStatus: BusinessStatus): Omit<PendingAction, 'business' | 'targetStatus'> => {
    if (targetStatus === BusinessStatus.SUSPENDED) {
      return {
        title: 'Suspend Business',
        body: `Suspending "${b.name}" immediately freezes all of its bookings, orders, and management actions. Its listings drop out of the public catalog. Existing customers can still view their own past bookings.`,
        confirmLabel: 'Suspend',
        confirmColor: 'bg-red-600',
      };
    }
    if (targetStatus === BusinessStatus.REJECTED) {
      return {
        title: 'Reject Business',
        body: `Reject "${b.name}"? This has the same effect as suspending it — nothing is deleted, and it can be approved later if needed.`,
        confirmLabel: 'Reject',
        confirmColor: 'bg-red-600',
      };
    }
    if (b.status === BusinessStatus.SUSPENDED) {
      return {
        title: 'Reinstate Business',
        body: `Reinstating "${b.name}" immediately unfreezes its bookings and management actions, exactly as they were.`,
        confirmLabel: 'Reinstate',
        confirmColor: 'bg-green-600',
      };
    }
    return {
      title: 'Approve Business',
      body: `Approve "${b.name}"? It will be able to accept bookings and appear in the public catalog.`,
      confirmLabel: 'Approve',
      confirmColor: 'bg-green-600',
    };
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
        <p className="text-gray-500 text-sm mt-1">
          Approve, suspend, or reinstate businesses on the platform, and manage what each one is allowed to do.
        </p>
      </div>

      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition ${
                tab === t.value ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm w-56"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading businesses...</div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Status', 'Scopes', 'Created', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {businesses.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">No businesses found</td></tr>
              ) : businesses.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{b.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 items-center">
                      {(b.businessScopes ?? []).map((s) => (
                        <span key={s} className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                          {SCOPE_LABELS[s] ?? s}
                        </span>
                      ))}
                      <button onClick={() => openEditScopes(b)} className="text-xs text-gray-400 hover:text-blue-600 ml-1">
                        Edit
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {actionsFor(b).map((a) => (
                        <button
                          key={a.label}
                          onClick={() => setPendingAction({ business: b, targetStatus: a.targetStatus, ...actionCopy(b, a.targetStatus) })}
                          className={`text-xs font-medium ${a.color}`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm status-change modal */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">{pendingAction.title}</h3>
            <p className="text-sm text-gray-600 mb-5">{pendingAction.body}</p>
            <div className="flex gap-3">
              <button onClick={() => setPendingAction(null)}
                className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600">Cancel</button>
              <button
                onClick={confirmChangeStatus}
                disabled={acting}
                className={`flex-1 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 ${pendingAction.confirmColor}`}
              >
                {acting ? 'Working...' : pendingAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit scopes modal */}
      {editingScopes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Edit Scopes</h3>
              <button onClick={() => setEditingScopes(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500">
                {editingScopes.name} — a business can hold more than one scope at once (e.g. a venue that also runs
                ticketed events uses the same staff and data automatically, with no extra setup).
              </p>
              <div className="space-y-2">
                {ALL_SCOPES.map((scope) => (
                  <label key={scope} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scopesDraft.includes(scope)}
                      onChange={() => toggleScope(scope)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {SCOPE_LABELS[scope]}
                  </label>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditingScopes(null)}
                  className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600">Cancel</button>
                <button onClick={saveScopes} disabled={savingScopes}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {savingScopes ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
