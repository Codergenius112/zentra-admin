'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';
import type { NotificationCampaign } from '@/types';
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
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingId, setSendingId]   = useState<string | null>(null);
  const [form, setForm]             = useState({ title: '', body: '', targetScope: 'ALL' });

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await apiClient.campaigns.list({ limit: 50 }) as any;
      setCampaigns(res.data?.data ?? res.data ?? []);
      setTotal(res.data?.total ?? res.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await apiClient.campaigns.create(form);
      setShowCreate(false);
      setForm({ title: '', body: '', targetScope: 'ALL' });
      fetchCampaigns();
      addToast('Campaign created as draft', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to create campaign', 'error');
    } finally { setSubmitting(false); }
  };

  const handleSend = async (id: string) => {
    if (!confirm('Send this campaign now? A platform fee will be charged per recipient.')) return;
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
          <strong>Platform fee applies.</strong> Sending a campaign charges a push notification
          fee per recipient. Fees are deducted from your wallet balance.
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
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{c.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {c.status}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {c.targetScope}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{c.body}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span>👥 {c.recipientCount} recipients</span>
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Create Campaign</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                ⚠️ Sending this campaign will charge a platform fee per recipient from your wallet.
              </div>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Target Audience</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm"
                  value={form.targetScope} onChange={e => setForm(f => ({ ...f, targetScope: e.target.value }))}>
                  {SCOPES.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Users' : s}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600">Cancel</button>
                <button onClick={handleCreate} disabled={submitting || !form.title || !form.body}
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