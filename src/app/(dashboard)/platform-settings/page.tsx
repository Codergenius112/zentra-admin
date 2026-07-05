'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';
import type { PlatformSettings } from '@/types';
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
                  Push Notification Campaign Fee (₦ per recipient)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Fee charged per recipient when sending a notification campaign
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
    </div>
  );
}