'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/services/api';
import useUIStore from '@/store/ui.store';
import useBusinessStore from '@/store/business.store';
import { BusinessScope, BusinessShareDataType } from '@/types';
import type { BusinessDataShare } from '@/types';

const SCOPES_CONFIG: { scope: BusinessScope; label: string; icon: string }[] = [
  { scope: BusinessScope.TABLE_CLUB, label: 'Table / Club / Nightclub', icon: '🪑' },
  { scope: BusinessScope.EVENT_TICKETING, label: 'Event Ticketing', icon: '🎪' },
  { scope: BusinessScope.APARTMENT, label: 'Apartments / Shortlets', icon: '🏠' },
  { scope: BusinessScope.CAR_RENTAL, label: 'Luxury Car Rental', icon: '🚗' },
  { scope: BusinessScope.JET_CHARTER, label: 'Private Jet / Helicopter Charter', icon: '✈️' },
];

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

export default function BusinessSettingsPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'data-sharing' ? 'data-sharing' : 'general';

  const [activeTab, setActiveTab] = useState<'general' | 'data-sharing'>(initialTab);
  const addToast = useUIStore((s) => s.addToast);
  const { businesses, activeBusinessId, setActiveBusiness, fetchBusinesses } = useBusinessStore();

  const ownedBusinesses = businesses.filter((b) => b.isOwner);
  const [selectedId, setSelectedId] = useState<string>('');
  const [form, setForm] = useState({ name: '', bankName: '', accountNumber: '', accountName: '' });
  const [saving, setSaving] = useState(false);

  // Create Business Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createScopes, setCreateScopes] = useState<BusinessScope[]>([BusinessScope.TABLE_CLUB]);
  const [creating, setCreating] = useState(false);

  // Data Sharing States
  const [shares, setShares] = useState<BusinessDataShare[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [showGrant, setShowGrant] = useState(false);
  const [submittingGrant, setSubmittingGrant] = useState(false);
  const [revokingShareId, setRevokingShareId] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<BusinessDataShare | null>(null);
  const [shareForm, setShareForm] = useState({
    fromBusinessId: '',
    toBusinessId: '',
    dataTypes: [] as string[],
  });

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

  const fetchShares = useCallback(async () => {
    setLoadingShares(true);
    try {
      const res = (await apiClient.dataShares.list()) as any;
      setShares(res.data ?? res ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingShares(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'data-sharing') {
      fetchShares();
    }
  }, [activeTab, fetchShares]);

  const businessName = (id: string) => businesses.find((b) => b.id === id)?.name ?? id.slice(0, 8);

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
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBusiness = async () => {
    if (!createName.trim()) {
      addToast('Please enter a business name', 'warning');
      return;
    }
    if (createScopes.length === 0) {
      addToast('Please select at least one business scope', 'warning');
      return;
    }

    setCreating(true);
    try {
      const newBiz = await apiClient.businesses.create({
        name: createName.trim(),
        businessScopes: createScopes,
      });
      await fetchBusinesses();
      setShowCreateModal(false);
      setCreateName('');
      setCreateScopes([BusinessScope.TABLE_CLUB]);
      if (newBiz?.id) {
        setSelectedId(newBiz.id);
        setActiveBusiness(newBiz.id);
      }
      addToast('New business created successfully', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to create business', 'error');
    } finally {
      setCreating(false);
    }
  };

  const toggleScope = (scope: BusinessScope) => {
    if (createScopes.includes(scope)) {
      if (createScopes.length === 1) {
        addToast('A business must have at least one scope', 'warning');
        return;
      }
      setCreateScopes(createScopes.filter((s) => s !== scope));
    } else {
      setCreateScopes([...createScopes, scope]);
    }
  };

  const toggleDataType = (type: string) => {
    setShareForm((f) => ({
      ...f,
      dataTypes: f.dataTypes.includes(type)
        ? f.dataTypes.filter((t) => t !== type)
        : [...f.dataTypes, type],
    }));
  };

  const handleGrant = async () => {
    if (!shareForm.fromBusinessId || !shareForm.toBusinessId) {
      addToast('Select both businesses', 'warning');
      return;
    }
    if (shareForm.fromBusinessId === shareForm.toBusinessId) {
      addToast('A business cannot share data with itself', 'warning');
      return;
    }
    if (!shareForm.dataTypes.length) {
      addToast('Select at least one data type to share', 'warning');
      return;
    }
    setSubmittingGrant(true);
    try {
      await apiClient.dataShares.grant({
        fromBusinessId: shareForm.fromBusinessId,
        toBusinessId: shareForm.toBusinessId,
        dataTypes: shareForm.dataTypes as BusinessShareDataType[],
      });
      setShowGrant(false);
      setShareForm({ fromBusinessId: '', toBusinessId: '', dataTypes: [] });
      fetchShares();
      addToast('Data share granted successfully', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to grant data share', 'error');
    } finally {
      setSubmittingGrant(false);
    }
  };

  const handleRevoke = async (share: BusinessDataShare) => {
    setRevokingShareId(share.id);
    try {
      await apiClient.dataShares.revoke(share.id);
      setConfirmRevoke(null);
      fetchShares();
      addToast('Data share revoked', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to revoke data share', 'error');
    } finally {
      setRevokingShareId(null);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Settings</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your business details, payout settlement accounts, and cross-business data sharing.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-1.5 shrink-0"
        >
          <span>+</span> Add New Business
        </button>
      </div>

      {/* TABS */}
      <div className="flex border-b border-gray-200 mb-6 gap-6">
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-3 text-sm font-semibold transition border-b-2 -mb-px ${
            activeTab === 'general'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          General & Payout
        </button>
        <button
          onClick={() => setActiveTab('data-sharing')}
          className={`pb-3 text-sm font-semibold transition border-b-2 -mb-px ${
            activeTab === 'data-sharing'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Cross-Business Data Sharing
        </button>
      </div>

      {activeTab === 'general' ? (
        <div className="max-w-2xl space-y-6">
          {ownedBusinesses.length > 1 && (
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Switch Business to Edit</label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 font-medium"
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  setActiveBusiness(e.target.value);
                }}
              >
                {ownedBusinesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.businessScopes?.join(', ') || 'General'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selected ? (
            <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Status</div>
                  <span
                    className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-semibold mt-1 ${
                      selected.status === 'APPROVED'
                        ? 'bg-green-100 text-green-700'
                        : selected.status === 'SUSPENDED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {selected.status}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Business ID</div>
                  <div className="font-mono text-xs text-gray-600 mt-1">{selected.id}</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Business Scopes (Assigned Capabilities)</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(selected.businessScopes || []).map((scope: any) => (
                    <span
                      key={scope}
                      className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-medium"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Business Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-medium"
                />
              </div>

              <div className="pt-3 border-t">
                <p className="text-xs font-semibold text-gray-700 mb-3">Settlement & Payout Details</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={form.bankName}
                      onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="e.g. Zenith Bank, GTBank, Access Bank"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={form.accountNumber}
                      onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                      placeholder="0123456789"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Account Name</label>
                    <input
                      type="text"
                      value={form.accountName}
                      onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="e.g. Zentra Luxury Services Ltd"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
              No business found. Click &quot;Add New Business&quot; above to create your first business.
            </div>
          )}
        </div>
      ) : (
        /* DATA SHARING TAB */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-blue-50/60 border border-blue-200 p-4 rounded-xl">
            <div>
              <h2 className="text-sm font-semibold text-blue-950">Cross-Business Resource Sharing</h2>
              <p className="text-xs text-blue-800 mt-1">
                Securely grant read or operational access to inventory and analytics between entities you own.
              </p>
            </div>
            {ownedBusinesses.length >= 2 && (
              <button
                onClick={() => setShowGrant(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-xs shrink-0 transition"
              >
                + Grant Data Share
              </button>
            )}
          </div>

          {ownedBusinesses.length < 2 && (
            <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              You need at least two businesses registered under your account before you can share data between them.
            </div>
          )}

          {loadingShares ? (
            <div className="text-center py-16 text-gray-500 bg-white rounded-xl border">Loading data shares...</div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Source Business', 'Recipient Business', 'Shared Data Types', 'Granted On', ''].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shares.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                        No active cross-business data shares configured
                      </td>
                    </tr>
                  ) : (
                    shares.map((share) => (
                      <tr key={share.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">
                          {businessName(share.fromBusinessId)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          → {businessName(share.toBusinessId)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {share.dataTypes.map((t) => (
                              <span
                                key={t}
                                className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200"
                              >
                                {DATA_TYPE_LABELS[t] ?? t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(share.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setConfirmRevoke(share)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE NEW BUSINESS MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <h3 className="font-bold text-gray-900 text-lg">Create New Business Tenant</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Business Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Zentra Sky Aviation or Mirage Lounge"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Business Scopes (Choose at least one) *
                </label>
                <div className="space-y-2">
                  {SCOPES_CONFIG.map(({ scope, label, icon }) => {
                    const isSelected = createScopes.includes(scope);
                    return (
                      <div
                        key={scope}
                        onClick={() => toggleScope(scope)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-400 text-blue-900'
                            : 'bg-gray-50/50 border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span>{icon}</span>
                          <span>{label}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="h-4 w-4 rounded text-blue-600 pointer-events-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-5 border-t mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBusiness}
                disabled={creating}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition"
              >
                {creating ? 'Creating...' : 'Create Business'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRANT SHARE MODAL */}
      {showGrant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Grant Cross-Business Share</h3>
              <button onClick={() => setShowGrant(false)} className="text-gray-400 hover:text-gray-600 text-2xl">
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Source Business (Data Origin)</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  value={shareForm.fromBusinessId}
                  onChange={(e) => setShareForm((f) => ({ ...f, fromBusinessId: e.target.value }))}
                >
                  <option value="">Select source business...</option>
                  {ownedBusinesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Recipient Business (Gains Access)</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  value={shareForm.toBusinessId}
                  onChange={(e) => setShareForm((f) => ({ ...f, toBusinessId: e.target.value }))}
                >
                  <option value="">Select recipient business...</option>
                  {ownedBusinesses
                    .filter((b) => b.id !== shareForm.fromBusinessId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Data Types to Share</label>
                <div className="space-y-2">
                  {ALL_DATA_TYPES.map((type) => (
                    <label key={type} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shareForm.dataTypes.includes(type)}
                        onChange={() => toggleDataType(type)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {DATA_TYPE_LABELS[type]}
                    </label>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                Users assigned to the recipient business can view shared resources. Only managers or owners can deduct
                inventory or make updates.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowGrant(false)}
                  className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGrant}
                  disabled={submittingGrant}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {submittingGrant ? 'Granting...' : 'Grant Share'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM REVOKE MODAL */}
      {confirmRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Revoke Data Share</h3>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to revoke data sharing from <strong>{businessName(confirmRevoke.fromBusinessId)}</strong> to{' '}
              <strong>{businessName(confirmRevoke.toBusinessId)}</strong>? Recipient will immediately lose access.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRevoke(null)}
                className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRevoke(confirmRevoke)}
                disabled={revokingShareId === confirmRevoke.id}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {revokingShareId === confirmRevoke.id ? 'Revoking...' : 'Yes, Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
