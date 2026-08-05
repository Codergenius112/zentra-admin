'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';
import type { NotificationCampaign, CampaignTier } from '@/types';
import useUIStore from '@/store/ui.store';

const SCOPES = ['ALL','CAR_RENTAL','APARTMENT','TABLE_CLUB','EVENT_TICKETING'];

const STATUS_COLORS: Record<string, string> = {
  SENT:   'bg-green-100 text-green-800',
  DRAFT:  'bg-yellow-100 text-yellow-800',
  FAILED: 'bg-red-100 text-red-700',
};

export default function CampaignsPage() {
  const addToast = useUIStore(s => s.addToast);
  const [campaigns, setCampaigns]   = useState<NotificationCampaign[]>([]);
  const [tiers, setTiers]           = useState<CampaignTier[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingId, setSendingId]   = useState<string | null>(null);
  const [form, setForm]             = useState({ title: '', body: '', targetScope: 'ALL', tierId: '' });

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await apiClient.campaigns.list({ limit: 50 }) as any;
      setCampaigns(res.data?.data ?? res.data ?? []);
      setTotal(res.data?.total ?? res.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchTiers = async () => {
    try {
      const res = await apiClient.campaigns.listTiers() as any;
      const list: CampaignTier[] = res.data ?? res ?? [];
      setTiers(list);
      if (list.length && !form.tierId) {
        setForm(f => ({ ...f, tierId: list[0].id }));
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchCampaigns(); fetchTiers(); }, []);

  const selectedTier = tiers.find(t => t.id === form.tierId);

  const handleCreate = async () => {
    if (!form.tierId) {
      addToast('Choose a target count / pricing tier first', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.campaigns.create(form);
      setShowCreate(false);
      setForm({ title: '', body: '', targetScope: 'ALL', tierId: tiers[0]?.id ?? '' });
      fetchCampaigns();
      addToast('Campaign created as draft', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to create campaign', 'error');
    } finally { setSubmitting(false); }
  };

  const handleSend = async (id: string) => {
    if (!confirm('Send this campaign now? A platform fee will be charged based on the target count.')) return;
    setSendingId(id);
    try {
      await apiClient.campaigns.send(id);
      fetchCampaigns();
      addToast('Campaign sent successfully', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to send campaign', 'error');
    } finally { setSendingId(null); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Campaigns</h1>
          <p className="text-gray-500 text-sm mt-1">{total} campaigns</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
          + Create Campaign
        </button>
      </div>

      <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <span className="text-amber-500 text-xl mt-0.5">ℹ️</span>
        <div className="text-sm text-amber-800">
          <strong>Platform fee applies.</strong> The fee is based on the <strong>target count (tier)</strong> you
          choose, not the business label. The label just tags the campaign for your own reporting.
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📢</div>
          <p className="text-gray-500">No campaigns yet. Create your first notification campaign.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(c => (
            <div key={c.id} className="bg-white rounded-xl border p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{c.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {c.status}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-200"
                      title="Reporting label only — does not filter recipients">
                      🏷️ {c.targetScope === 'ALL' ? 'All Users (label)' : `${c.targetScope} (label)`}
                    </span>
                    {c.tierMaxRecipients != null && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        🎯 Target count: {c.tierMaxRecipients.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{c.body}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span>👥 {c.recipientCount} recipients reached</span>
                    <span>💳 Fee: ₦{Number(c.feePaid).toLocaleString()} · {c.paymentStatus}</span>
                    {c.sentAt && <span>📤 Sent: {new Date(c.sentAt).toLocaleString()}</span>}
                    <span>🕐 Created: {new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {c.status === 'DRAFT' && (
                  <button onClick={() => handleSend(c.id)} disabled={sendingId === c.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 shrink-0">
                    {sendingId === c.id ? 'Sending...' : '📤 Send Now'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Create Campaign</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                <input type="text"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Message Body</label>
                <textarea rows={4}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Target Count <span className="text-gray-400">(this is what determines reach and price)</span>
                </label>
                {tiers.length === 0 ? (
                  <p className="text-xs text-red-500">
                    No pricing tiers configured yet. Ask a super admin to set one up under Platform Settings → Notification Tiers.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tiers.map(t => (
                      <label key={t.id}
                        className={`flex items-center justify-between px-3 py-2 border rounded-lg text-sm cursor-pointer ${
                          form.tierId === t.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}>
                        <span className="flex items-center gap-2">
                          <input type="radio" name="tier" checked={form.tierId === t.id}
                            onChange={() => setForm(f => ({ ...f, tierId: t.id }))} />
                          {t.label} — up to {t.maxRecipients.toLocaleString()} recipients
                        </span>
                        <span className="text-gray-500">₦{Number(t.price).toLocaleString()}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Business Label <span className="text-gray-400">(for your own reporting only — does not filter recipients)</span>
                </label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm"
                  value={form.targetScope} onChange={e => setForm(f => ({ ...f, targetScope: e.target.value }))}>
                  {SCOPES.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Users' : s}</option>)}
                </select>
              </div>

              {selectedTier && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  ⚠️ Sending will charge <strong>₦{Number(selectedTier.price).toLocaleString()}</strong> from
                  your wallet, reaching up to <strong>{selectedTier.maxRecipients.toLocaleString()}</strong> users.
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600">Cancel</button>
                <button onClick={handleCreate} disabled={submitting || !form.title || !form.body || !form.tierId}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {submitting ? 'Creating...' : 'Save as Draft'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
