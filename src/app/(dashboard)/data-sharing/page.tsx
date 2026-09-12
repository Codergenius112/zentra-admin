'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/api';
import useUIStore from '@/store/ui.store';
import useBusinessStore from '@/store/business.store';
import type { BusinessDataShare } from '@/types';
import { BusinessShareDataType } from '@/types';

const DATA_TYPE_LABELS: Record<string, string> = {
  INVENTORY: 'Inventory',
  ANALYTICS: 'Analytics',
  CUSTOMER_DIRECTORY: 'Customer Directory',
};

const ALL_DATA_TYPES = [
  BusinessShareDataType.INVENTORY,
  BusinessShareDataType.ANALYTICS,
  BusinessShareDataType.CUSTOMER_DIRECTORY,
];

export default function DataSharingPage() {
  const addToast = useUIStore((s) => s.addToast);
  const { businesses } = useBusinessStore();

  const [shares, setShares] = useState<BusinessDataShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGrant, setShowGrant] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<BusinessDataShare | null>(null);
  const [form, setForm] = useState({
    fromBusinessId: '',
    toBusinessId: '',
    dataTypes: [] as string[],
  });

  const fetchShares = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.dataShares.list() as any;
      setShares(res.data ?? res ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchShares(); }, [fetchShares]);

  const businessName = (id: string) => businesses.find((b) => b.id === id)?.name ?? id.slice(0, 8);

  // Only businesses the caller actually OWNS can be picked as either side
  // of a new grant — sharing is an ownership-level decision (matches the
  // backend's own enforcement, this just avoids a round-trip failure).
  const ownedBusinesses = businesses.filter((b) => b.isOwner);

  const toggleDataType = (type: string) => {
    setForm((f) => ({
      ...f,
      dataTypes: f.dataTypes.includes(type)
        ? f.dataTypes.filter((t) => t !== type)
        : [...f.dataTypes, type],
    }));
  };

  const handleGrant = async () => {
    if (!form.fromBusinessId || !form.toBusinessId) {
      addToast('Select both businesses', 'warning');
      return;
    }
    if (form.fromBusinessId === form.toBusinessId) {
      addToast('A business cannot share data with itself', 'warning');
      return;
    }
    if (!form.dataTypes.length) {
      addToast('Select at least one data type to share', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.dataShares.grant({
        fromBusinessId: form.fromBusinessId,
        toBusinessId: form.toBusinessId,
        dataTypes: form.dataTypes as BusinessShareDataType[],
      });
      setShowGrant(false);
      setForm({ fromBusinessId: '', toBusinessId: '', dataTypes: [] });
      fetchShares();
      addToast('Data share granted', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to grant data share', 'error');
    } finally { setSubmitting(false); }
  };

  const handleRevoke = async (share: BusinessDataShare) => {
    setRevoking(share.id);
    try {
      await apiClient.dataShares.revoke(share.id);
      setConfirmRevoke(null);
      fetchShares();
      addToast('Data share revoked', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to revoke data share', 'error');
    } finally { setRevoking(null); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Sharing</h1>
          <p className="text-gray-500 text-sm mt-1">
            Share inventory or analytics between your own businesses. Only a manager (or you) can act on
            shared data — everyone else sees it read-only.
          </p>
        </div>
        {ownedBusinesses.length >= 2 && (
          <button
            onClick={() => setShowGrant(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shrink-0"
          >
            + Grant Share
          </button>
        )}
      </div>

      {ownedBusinesses.length < 2 && (
        <div className="mb-6 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          You need at least two businesses of your own before you can share data between them.
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading data shares...</div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['From', 'To', 'Data Types', 'Granted', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shares.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">No active data shares</td></tr>
              ) : shares.map((share) => (
                <tr key={share.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{businessName(share.fromBusinessId)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">→ {businessName(share.toBusinessId)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {share.dataTypes.map((t) => (
                        <span key={t} className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                          {DATA_TYPE_LABELS[t] ?? t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(share.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setConfirmRevoke(share)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grant Share Modal */}
      {showGrant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Grant Data Share</h3>
              <button onClick={() => setShowGrant(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From business (the source of the data)</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  value={form.fromBusinessId}
                  onChange={(e) => setForm((f) => ({ ...f, fromBusinessId: e.target.value }))}
                >
                  <option value="">Select a business...</option>
                  {ownedBusinesses.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To business (who receives access)</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  value={form.toBusinessId}
                  onChange={(e) => setForm((f) => ({ ...f, toBusinessId: e.target.value }))}
                >
                  <option value="">Select a business...</option>
                  {ownedBusinesses.filter((b) => b.id !== form.fromBusinessId).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data types to share</label>
                <div className="space-y-2">
                  {ALL_DATA_TYPES.map((type) => (
                    <label key={type} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.dataTypes.includes(type)}
                        onChange={() => toggleDataType(type)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {DATA_TYPE_LABELS[type]}
                    </label>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                Anyone assigned to the receiving business can view shared data. Only a manager (or you) can
                make changes to it — e.g. deduct shared inventory stock.
              </p>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowGrant(false)}
                  className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600">Cancel</button>
                <button onClick={handleGrant} disabled={submitting}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {submitting ? 'Granting...' : 'Grant Share'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Revoke Data Share</h3>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to revoke sharing from <strong>{businessName(confirmRevoke.fromBusinessId)}</strong> to{' '}
              <strong>{businessName(confirmRevoke.toBusinessId)}</strong>? Access disappears immediately.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRevoke(null)}
                className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600">Cancel</button>
              <button
                onClick={() => handleRevoke(confirmRevoke)}
                disabled={revoking === confirmRevoke.id}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {revoking === confirmRevoke.id ? 'Revoking...' : 'Yes, Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
