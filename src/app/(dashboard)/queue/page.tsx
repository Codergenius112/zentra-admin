'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/api';
import useUIStore from '@/store/ui.store';

interface QueueEntry {
  id: string;
  position: number;
  guestName?: string;
  guestCount?: number;
  userId?: string;
  waitingSince: string;
  estimatedWait?: number;
}

interface QueueData {
  id: string;
  venueId: string;
  status: 'OPEN' | 'CLOSED' | 'PAUSED';
  currentNumber: number;
  entries: QueueEntry[];
}

export default function QueuePage() {
  const addToast = useUIStore(s => s.addToast);
  const [venues, setVenues] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [queue, setQueue] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchVenues = async () => {
    try {
      const res = await apiClient.venues.list({ limit: 100 }) as any;
      const venueList = res.data?.data ?? res.data ?? [];
      setVenues(venueList);
      if (venueList.length > 0 && !selectedVenue) {
        setSelectedVenue(venueList[0].id);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchVenues(); }, []);

  const fetchQueue = useCallback(async () => {
    if (!selectedVenue) { setLoading(false); return; }
    try {
      const data = await apiClient.queue.current(selectedVenue) as any;
      setQueue(data);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
      setQueue(null);
    }
    finally { setLoading(false); }
  }, [selectedVenue]);

  useEffect(() => {
    if (selectedVenue) {
      setLoading(true);
      fetchQueue();
      const interval = setInterval(fetchQueue, 15000);
      return () => clearInterval(interval);
    }
  }, [fetchQueue, selectedVenue]);

  const handleAdvance = async () => {
    if (!queue) return;
    setActionLoading('advance');
    try { await apiClient.queue.advance(queue.id); await fetchQueue(); addToast('Queue advanced', 'success'); }
    catch (e: any) { addToast(e?.response?.data?.message ?? 'Advance failed', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleClose = async () => {
    if (!queue || !confirm('Close the queue?')) return;
    setActionLoading('close');
    try { await apiClient.queue.close(queue.id); await fetchQueue(); addToast('Queue closed', 'success'); }
    catch (e: any) { addToast(e?.response?.data?.message ?? 'Close failed', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleRemove = async (entryId: string) => {
    if (!queue || !confirm('Remove this guest from the queue?')) return;
    setActionLoading(entryId);
    try { await apiClient.queue.remove(queue.id, entryId); await fetchQueue(); addToast('Guest removed from queue', 'success'); }
    catch (e: any) { addToast(e?.response?.data?.message ?? 'Remove failed', 'error'); }
    finally { setActionLoading(null); }
  };

  const waitTime = (since: string) => {
    const mins = Math.floor((Date.now() - new Date(since).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Queue</h1>
          <p className="text-gray-500 text-sm mt-1">
            Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 15s
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="px-3 py-2 border rounded-lg text-sm"
            value={selectedVenue}
            onChange={e => setSelectedVenue(e.target.value)}>
            {venues.length === 0 && <option value="">No venues found</option>}
            {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <button onClick={fetchQueue}
            className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
            🔄 Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading queue...</div>
      ) : !queue ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔢</div>
          <p className="text-gray-500">No active queue found for this venue.</p>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border p-5 shadow-sm text-center">
              <div className="text-3xl font-bold text-blue-600">{queue.entries?.length ?? 0}</div>
              <div className="text-sm text-gray-500 mt-1">In Queue</div>
            </div>
            <div className="bg-white rounded-xl border p-5 shadow-sm text-center">
              <div className="text-3xl font-bold text-green-600">#{queue.currentNumber}</div>
              <div className="text-sm text-gray-500 mt-1">Current Number</div>
            </div>
            <div className="bg-white rounded-xl border p-5 shadow-sm text-center">
              <div className={`text-sm font-bold px-3 py-1 rounded-full inline-block mt-1 ${queue.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {queue.status}
              </div>
              <div className="text-sm text-gray-500 mt-2">Queue Status</div>
            </div>
            <div className="bg-white rounded-xl border p-5 shadow-sm">
              <div className="flex flex-col gap-2">
                <button onClick={handleAdvance}
                  disabled={actionLoading === 'advance' || queue.status !== 'OPEN' || queue.entries?.length === 0}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                  {actionLoading === 'advance' ? '...' : '⏭ Advance'}
                </button>
                <button onClick={handleClose} disabled={actionLoading === 'close'}
                  className="w-full py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-40">
                  {actionLoading === 'close' ? '...' : '🔒 Close Queue'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-700">Queue Entries</h2>
            </div>
            {!queue.entries || queue.entries.length === 0 ? (
              <div className="text-center py-16 text-gray-400">Queue is empty</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['#','Guest','Party Size','Waiting','Est. Wait',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {queue.entries.map((entry, i) => (
                    <tr key={entry.id} className={i === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                          {entry.position}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                        {entry.guestName ?? `Guest ${entry.userId?.slice(0, 6)}`}
                        {i === 0 && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Next Up</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{entry.guestCount ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-orange-600 font-medium">{waitTime(entry.waitingSince)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {entry.estimatedWait ? `~${entry.estimatedWait}m` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleRemove(entry.id)} disabled={actionLoading === entry.id}
                          className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-40">
                          {actionLoading === entry.id ? '...' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
