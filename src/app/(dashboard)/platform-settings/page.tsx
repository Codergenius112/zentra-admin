'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';
import type { PlatformSettings, CampaignTier } from '@/types';
import useAuthStore from '@/store/auth.store';
import useUIStore from '@/store/ui.store';
import { UserRole } from '@/types';

enum CommissionPayer {
  USER  = 'USER',
  ADMIN = 'ADMIN',
}

const DEFAULT_FORM = {
  serviceCharge:       '',
  commissionRate:      '',
  commissionPayer:     CommissionPayer.USER,
  pushNotificationFee: '',
};

export default function PlatformSettingsPage() {
  // FIX: ALL hooks must be declared before any conditional return.
  // Previously the early-return for non-SUPER_ADMIN was placed after the
  // hooks, which is structurally fine — but the useEffect had an early
  // bail-out `if (user?.role !== SUPER_ADMIN) return;` that prevented
  // the loading state from ever resolving when a non-super-admin visited
  // the page.  We now keep all hooks unconditional and gate only the JSX.
  const { user }             = useAuthStore();
  const addToast             = useUIStore(s => s.addToast);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [form, setForm]         = useState(DEFAULT_FORM);

  const [tiers, setTiers]         = useState<CampaignTier[]>([]);
  const [tiersLoading, setTiersLoading] = useState(true);
  const [showTierModal, setShowTierModal] = useState(false);
  const [editingTier, setEditingTier]     = useState<CampaignTier | null>(null);
  const [tierForm, setTierForm]   = useState({ label: '', maxRecipients: '', price: '' });
  const [savingTier, setSavingTier] = useState(false);

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  useEffect(() => {
    // Gate the API call, but always call setLoading(false) so the
    // component doesn't stay in a perpetual "loading" state for
    // non-super-admins (which would also swallow the access-denied UI).
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }

    apiClient.superAdmin
      .getSettings()
      .then((s) => {
        setSettings(s);
        setForm({
          serviceCharge:       String(s.serviceCharge),
          commissionRate:      String(Number(s.commissionRate) * 100),
          commissionPayer:     s.commissionPayer || CommissionPayer.USER,
          pushNotificationFee: String(s.pushNotificationFee),
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isSuperAdmin]);

  const fetchTiers = () => {
    setTiersLoading(true);
    apiClient.superAdmin.listCampaignTiers()
      .then((res: any) => setTiers(res.data ?? res ?? []))
      .catch(console.error)
      .finally(() => setTiersLoading(false));
  };

  useEffect(() => {
    if (isSuperAdmin) fetchTiers();
    else setTiersLoading(false);
  }, [isSuperAdmin]);

  const openTierModal = (tier?: CampaignTier) => {
    if (tier) {
      setEditingTier(tier);
      setTierForm({ label: tier.label, maxRecipients: String(tier.maxRecipients), price: String(tier.price) });
    } else {
      setEditingTier(null);
      setTierForm({ label: '', maxRecipients: '', price: '' });
    }
    setShowTierModal(true);
  };

  const handleSaveTier = async () => {
    setSavingTier(true);
    try {
      const payload = {
        label: tierForm.label,
        maxRecipients: Number(tierForm.maxRecipients),
        price: Number(tierForm.price),
      };
      if (editingTier) {
        await apiClient.superAdmin.updateCampaignTier(editingTier.id, payload);
        addToast('Tier updated', 'success');
      } else {
        await apiClient.superAdmin.createCampaignTier(payload);
        addToast('Tier created', 'success');
      }
      setShowTierModal(false);
      fetchTiers();
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to save tier', 'error');
    } finally { setSavingTier(false); }
  };

  const handleToggleTier = async (tier: CampaignTier) => {
    try {
      await apiClient.superAdmin.updateCampaignTier(tier.id, { isActive: !tier.isActive });
      fetchTiers();
      addToast(tier.isActive ? 'Tier deactivated' : 'Tier activated', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to update tier', 'error');
    }
  };

  // Access-denied screen — rendered AFTER all hooks have been called.
  if (!isSuperAdmin) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Restricted</h2>
        <p className="text-gray-500">Platform settings are only accessible to Super Admins.</p>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await apiClient.superAdmin.updateSettings({
        serviceCharge:       Number(form.serviceCharge),
        commissionRate:      Number(form.commissionRate) / 100,
        commissionPayer:     form.commissionPayer,
        pushNotificationFee: Number(form.pushNotificationFee),
      });
      setSettings(updated);
      setSaved(true);
      addToast('Platform settings saved', 'success');
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-gray-500 text-sm mt-1">
          Changes apply to all new bookings. Existing bookings are not affected.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading settings...</div>
      ) : (
        <div className="max-w-2xl">
          <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-800 mb-5">Financial Settings</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Charge (₦ per booking)
                </label>
                <p className="text-xs text-gray-500 mb-2">Fixed amount added to each booking total</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₦</span>
                  <input
                    type="number"
                    min="0"
                    className="w-full pl-8 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.serviceCharge}
                    onChange={(e) => setForm((f) => ({ ...f, serviceCharge: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Platform Commission Rate (%)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Percentage deducted from each booking as platform revenue
                </p>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full pr-10 pl-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.commissionRate}
                    onChange={(e) => setForm((f) => ({ ...f, commissionRate: e.target.value }))}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Who Pays Commission?
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {form.commissionPayer === 'USER'
                    ? 'Customer pays commission (added on top of base price)'
                    : 'Admin pays commission (deducted from admin payout)'}
                </p>
                <select
                  className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={form.commissionPayer}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, commissionPayer: e.target.value as CommissionPayer }))
                  }
                >
                  <option value="USER">Customer pays commission</option>
                  <option value="ADMIN">Admin pays commission</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Push Notification Campaign Fee (₦ per recipient) — legacy
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Superseded by <strong>Notification Tiers</strong> below, which now control campaign
                  pricing. Kept for backward compatibility only.
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₦</span>
                  <input
                    type="number"
                    min="0"
                    className="w-full pl-8 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.pushNotificationFee}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, pushNotificationFee: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 pt-5 border-t">
              <div className="text-xs text-gray-400">
                {settings?.updatedAt &&
                  `Last updated: ${new Date(settings.updatedAt).toLocaleString()}`}
              </div>
              <div className="flex items-center gap-3">
                {saved && <span className="text-sm text-green-600 font-medium">✅ Saved</span>}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold text-gray-800">Notification Tiers</h2>
              <button onClick={() => openTierModal()}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                + Add Tier
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Target count / pricing bands admins choose from when sending a notification campaign.
            </p>
            {tiersLoading ? (
              <div className="text-sm text-gray-400 py-6 text-center">Loading tiers...</div>
            ) : tiers.length === 0 ? (
              <div className="text-sm text-gray-400 py-6 text-center">
                No tiers yet — admins won't be able to send campaigns until at least one exists.
              </div>
            ) : (
              <div className="divide-y">
                {tiers.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        {t.label}
                        {!t.isActive && <span className="ml-2 text-xs text-gray-400">(inactive)</span>}
                      </div>
                      <div className="text-xs text-gray-500">
                        Up to {t.maxRecipients.toLocaleString()} recipients · ₦{Number(t.price).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openTierModal(t)}
                        className="text-xs text-blue-600 font-medium hover:underline">Edit</button>
                      <button onClick={() => handleToggleTier(t)}
                        className={`text-xs font-medium hover:underline ${t.isActive ? 'text-red-600' : 'text-green-600'}`}>
                        {t.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-amber-900 mb-2">⚠️ Important</h3>
            <ul className="text-sm text-amber-800 space-y-1 list-disc ml-4">
              <li>Changes take effect immediately for all new bookings</li>
              <li>Existing confirmed bookings retain their original pricing</li>
              <li>All setting changes are logged in the audit trail</li>
            </ul>
          </div>
        </div>
      )}

      {showTierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingTier ? 'Edit Tier' : 'Add Tier'}
              </h3>
              <button onClick={() => setShowTierModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
                <input type="text" placeholder="e.g. Starter, Growth, Reach"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={tierForm.label} onChange={e => setTierForm(f => ({ ...f, label: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Target Count (max recipients)</label>
                <input type="number" min={1}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={tierForm.maxRecipients} onChange={e => setTierForm(f => ({ ...f, maxRecipients: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Price (₦)</label>
                <input type="number" min={0}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={tierForm.price} onChange={e => setTierForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowTierModal(false)}
                  className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600">Cancel</button>
                <button onClick={handleSaveTier}
                  disabled={savingTier || !tierForm.label || !tierForm.maxRecipients || !tierForm.price}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {savingTier ? 'Saving...' : editingTier ? 'Save Changes' : 'Create Tier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}