'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';
import useUIStore from '@/store/ui.store';
import useBusinessStore from '@/store/business.store';

// Only the fields an owner is actually allowed to edit — name, payout
// details, and an active/inactive toggle. Scopes (what the business can
// create/manage) and status (approved/suspended) are deliberately not
// here — those stay super-admin-only, see the "Businesses" page.
export default function BusinessSettingsPage() {
  const addToast = useUIStore((s) => s.addToast);
  const { businesses, activeBusinessId, fetchBusinesses } = useBusinessStore();

  const ownedBusinesses = businesses.filter((b) => b.isOwner);
  const [selectedId, setSelectedId] = useState<string>('');
  const [form, setForm] = useState({ name: '', bankName: '', accountNumber: '', accountName: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedId && ownedBusinesses.length) {
      const initial = ownedBusinesses.find((b) => b.id === activeBusinessId) ?? ownedBusinesses[0];
      setSelectedId(initial.id);
    }
  }, [ownedBusinesses, activeBusinessId, selectedId]);

  const selected = ownedBusinesses.find((b) => b.id === selectedId);

  useEffect(() => {
    if (selected) {
      const payout = (selected as any).payoutDetails ?? {};
      setForm({
        name: selected.name ?? '',
        bankName: payout.bankName ?? '',
        accountNumber: payout.accountNumber ?? '',
        accountName: payout.accountName ?? '',
      });
    }
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await apiClient.businesses.update(selected.id, {
        name: form.name,
        payoutDetails: {
          bankName: form.bankName,
          accountNumber: form.accountNumber,
          accountName: form.accountName,
        },
      });
      await fetchBusinesses();
      addToast('Business settings saved', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to save business settings', 'error');
    } finally { setSaving(false); }
  };

  if (ownedBusinesses.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Business Settings</h1>
        <p className="text-gray-500 text-sm">You don&apos;t own a business — these settings are only available to a business owner.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Business Settings</h1>
        <p className="text-gray-500 text-sm mt-1">
          Update your business name and payout details. Need to change what your business is allowed to
          do, or its approval status? Contact a super admin.
        </p>
      </div>

      {ownedBusinesses.length > 1 && (
        <div className="mb-6">
          <label className="block text-xs font-medium text-gray-600 mb-1">Business</label>
          <select
            className="w-full px-3 py-2 border rounded-lg text-sm"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {ownedBusinesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {selected && (
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              selected.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
              selected.status === 'SUSPENDED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {selected.status}
            </span>
            <div className="flex flex-wrap gap-1">
              {(selected.businessScopes ?? []).map((s) => (
                <span key={s} className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">{s}</span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Business Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-gray-600 mb-3">Payout Details</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="e.g. GTBank"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Account Number</label>
                <input
                  type="text"
                  value={form.accountNumber}
                  onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Account Name</label>
                <input
                  type="text"
                  value={form.accountName}
                  onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
