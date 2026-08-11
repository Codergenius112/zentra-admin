'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/api';
import type { AuditLog } from '@/types';

const RESOURCE_TYPES = ['booking','user','order','payment','inventory_item','platform_settings','notification_campaign'];
const ACTION_TYPES = [
  'BOOKING_CREATED','BOOKING_CANCELLED','BOOKING_CHECKED_IN',
  'PAYMENT_PROCESSED','PAYMENT_REFUNDED',
  'ORDER_CREATED','ORDER_ASSIGNED','ORDER_COMPLETED',
  'USER_CREATED','USER_UPDATED','STAFF_DEACTIVATED','STAFF_SCOPE_UPDATED',
  'TICKET_SCANNED','SETTINGS_UPDATED','CAMPAIGN_SENT',
  'INVENTORY_RESTOCKED','INVENTORY_DEDUCTED',
  'CAUTION_FEE_REFUNDED','CAUTION_FEE_FORFEITED','ADMIN_OVERRIDE',
];

function exportCSV(logs: AuditLog[]) {
  const headers = ['ID','Action','Actor','Resource Type','Resource ID','IP','Timestamp'];
  const rows    = logs.map(l => [
    l.id, l.actionType, l.actorId,
    l.resourceType ?? '', l.resourceId ?? '',
    l.ipAddress ?? '', new Date(l.timestamp).toISOString(),
  ]);
  const csv  = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const ACTION_COLORS: Record<string, string> = {
  BOOKING_CREATED:       'bg-blue-100 text-blue-800',
  BOOKING_CANCELLED:     'bg-red-100 text-red-700',
  PAYMENT_PROCESSED:     'bg-green-100 text-green-800',
  PAYMENT_REFUNDED:      'bg-orange-100 text-orange-700',
  SETTINGS_UPDATED:      'bg-purple-100 text-purple-800',
  STAFF_DEACTIVATED:     'bg-red-100 text-red-700',
  TICKET_SCANNED:        'bg-teal-100 text-teal-800',
  CAMPAIGN_SENT:         'bg-indigo-100 text-indigo-700',
  CAUTION_FEE_FORFEITED: 'bg-red-100 text-red-700',
  CAUTION_FEE_REFUNDED:  'bg-green-100 text-green-700',
  ADMIN_OVERRIDE:        'bg-yellow-100 text-yellow-800',
};

export default function AuditPage() {
  const [logs, setLogs]           = useState<AuditLog[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const LIMIT = 50;

  const [actionFilter, setActionFilter]           = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [startDate, setStartDate]                 = useState('');
  const [endDate, setEndDate]                     = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.superAdmin.getAuditLogs({
        limit:  LIMIT,
        offset: page * LIMIT,
        action:       actionFilter       || undefined,
        resourceType: resourceTypeFilter || undefined,
        startDate:    startDate          || undefined,
        endDate:      endDate            || undefined,
      }) as any;
      setLogs(res.data?.data ?? res.data ?? []);
      setTotal(res.data?.total ?? res.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, actionFilter, resourceTypeFilter, startDate, endDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-gray-500 text-sm mt-1">{total.toLocaleString()} total entries</p>
        </div>
        <button
          onClick={() => exportCSV(logs)}
          disabled={logs.length === 0}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
        >
          ⬇ Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border p-4 mb-5 flex flex-wrap gap-3">
        <select className="px-3 py-2 border rounded-lg text-sm"
          value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(0); }}>
          <option value="">All Actions</option>
          {ACTION_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="px-3 py-2 border rounded-lg text-sm"
          value={resourceTypeFilter} onChange={e => { setResourceTypeFilter(e.target.value); setPage(0); }}>
          <option value="">All Resource Types</option>
          {RESOURCE_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">From</label>
          <input type="date" className="px-3 py-2 border rounded-lg text-sm"
            value={startDate} onChange={e => { setStartDate(e.target.value); setPage(0); }} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">To</label>
          <input type="date" className="px-3 py-2 border rounded-lg text-sm"
            value={endDate} onChange={e => { setEndDate(e.target.value); setPage(0); }} />
        </div>
        {(actionFilter || resourceTypeFilter || startDate || endDate) && (
          <button
            onClick={() => { setActionFilter(''); setResourceTypeFilter(''); setStartDate(''); setEndDate(''); setPage(0); }}
            className="px-3 py-2 text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Clear Filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading audit logs...</div>
      ) : (
        <>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Action', 'Actor', 'Resource', 'IP Address', 'Timestamp', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">No audit logs found</td></tr>
                ) : logs.map(log => (
                  <>
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${ACTION_COLORS[log.actionType] ?? 'bg-gray-100 text-gray-600'}`}>
                          {log.actionType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        <div className="font-medium text-gray-800">
                          {log.actorName ?? (log.actorId === 'SYSTEM' ? 'System' : `${log.actorId?.slice(0, 8)}...`)}
                        </div>
                        {log.actorRole && <div className="text-gray-400">{log.actorRole}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {log.resourceType && <div className="font-medium">{log.resourceType}</div>}
                        {log.resourceId && <div className="font-mono text-gray-400">{log.resourceId.slice(0, 8)}...</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{log.ipAddress ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                        <div className="text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {expandedId === log.id ? '▲' : '▼'}
                      </td>
                    </tr>
                    {expandedId === log.id && log.changes && (
                      <tr key={`${log.id}-detail`} className="bg-gray-50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="text-xs font-medium text-gray-500 mb-2">Changes</div>
                          <pre className="text-xs text-gray-700 bg-white rounded border p-3 overflow-x-auto max-h-48">
                            {JSON.stringify(log.changes, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">Page {page + 1} of {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                  ← Previous
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}