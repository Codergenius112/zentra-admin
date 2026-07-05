'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/api';
import type { Booking } from '@/types';
import { BookingStatus, BookingType } from '@/types';
import Link from 'next/link';
import useUIStore from '@/store/ui.store';

const STATUS_COLORS: Record<string, string> = {
  INITIATED: 'bg-gray-100 text-gray-600',
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  PENDING_GROUP_PAYMENT: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  CHECKED_IN: 'bg-teal-100 text-teal-800',
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
};

const TYPE_ICONS: Record<string, string> = {
  ticket: '🎟️', table: '🪑', apartment: '🏠', car: '🚗',
};

function BookingDetailPanel({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const addToast = useUIStore(s => s.addToast);
  const [newStatus, setNewStatus] = useState(booking.status);
  const [updating, setUpdating] = useState(false);

  const handleStatusUpdate = async () => {
    if (newStatus === booking.status) return;
    setUpdating(true);
    try {
      await apiClient.bookings.updateStatus(booking.id, newStatus);
      addToast(`Booking status updated to ${newStatus}`, 'success');
      onClose();
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Update failed', 'error');
    } finally { setUpdating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Booking Detail</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{TYPE_ICONS[booking.bookingType] ?? '📋'}</span>
            <div>
              <div className="text-xs text-gray-400 font-mono">{booking.id}</div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[booking.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {booking.status}
              </span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <h3 className="font-medium text-gray-700 mb-2">Customer</h3>
            {booking.user ? (
              <>
                <p><strong>Name:</strong> {booking.user.firstName} {booking.user.lastName}</p>
                <p><strong>Email:</strong> {booking.user.email}</p>
              </>
            ) : (
              <p className="text-gray-500">ID: {booking.userId}</p>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <h3 className="font-medium text-gray-700 mb-2">Financials</h3>
            <p><strong>Base Price:</strong> ₦{Number(booking.basePrice).toLocaleString()}</p>
            <p><strong>Service Charge:</strong> ₦{Number(booking.serviceCharge).toLocaleString()}</p>
            <p><strong>Commission:</strong> ₦{Number(booking.platformCommission).toLocaleString()}</p>
            <p className="text-base font-bold text-gray-800 pt-1 border-t">
              Total: ₦{Number(booking.totalAmount).toLocaleString()}
            </p>
            <p><strong>Payment:</strong> {booking.paymentStatus}</p>
          </div>
          {booking.cautionFeeAmount > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-1 text-sm">
              <h3 className="font-medium text-orange-800 mb-1">Caution Fee</h3>
              <p>Amount: ₦{Number(booking.cautionFeeAmount).toLocaleString()}</p>
              <p>Status: <strong>{booking.cautionFeeStatus}</strong></p>
              {booking.status === 'COMPLETED' && booking.cautionFeeStatus === 'HELD' && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={async () => { try { await apiClient.bookings.refundCautionFee(booking.id); addToast('Caution fee refunded', 'success'); onClose(); } catch(e: any) { addToast(e?.response?.data?.message ?? 'Refund failed', 'error'); } }}
                    className="flex-1 py-1.5 bg-green-600 text-white rounded text-xs font-medium"
                  >
                    Refund
                  </button>
                  <button
                    onClick={async () => { try { await apiClient.bookings.forfeitCautionFee(booking.id); addToast('Caution fee forfeited', 'success'); onClose(); } catch(e: any) { addToast(e?.response?.data?.message ?? 'Forfeit failed', 'error'); } }}
                    className="flex-1 py-1.5 bg-red-500 text-white rounded text-xs font-medium"
                  >
                    Forfeit
                  </button>
                </div>
              )}
            </div>
          )}
          {booking.scannedAt && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm">
              <p className="text-teal-800">✅ Scanned at {new Date(booking.scannedAt).toLocaleString()}</p>
            </div>
          )}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <h3 className="font-medium text-gray-700 mb-2">Dates</h3>
            <p><strong>Created:</strong> {new Date(booking.createdAt).toLocaleString()}</p>
            {booking.checkInTime && <p><strong>Check-in:</strong> {new Date(booking.checkInTime).toLocaleString()}</p>}
            {booking.completedAt && <p><strong>Completed:</strong> {new Date(booking.completedAt).toLocaleString()}</p>}
          </div>
          {booking.metadata && Object.keys(booking.metadata).length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <h3 className="font-medium text-gray-700 mb-2">Metadata</h3>
              <pre className="text-xs text-gray-600 overflow-x-auto">{JSON.stringify(booking.metadata, null, 2)}</pre>
            </div>
          )}
        </div>
        <div className="p-6 border-t space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Override Status</h3>
          <div className="flex gap-2">
            <select
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
              value={newStatus}
              onChange={e => setNewStatus(e.target.value as BookingStatus)}
            >
              {Object.values(BookingStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={handleStatusUpdate}
              disabled={updating || newStatus === booking.status}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
            >
              {updating ? '...' : 'Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Booking | null>(null);
  const LIMIT = 50;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.bookings.list({
        limit: LIMIT, offset: page * LIMIT,
        status: statusFilter || undefined,
        bookingType: typeFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search || undefined,
      }) as any;
      setBookings(res.data?.data ?? res.data ?? []);
      setTotal(res.data?.total ?? res.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, statusFilter, typeFilter, startDate, endDate, search]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 text-sm mt-1">{total.toLocaleString()} total bookings</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 mb-5 flex flex-wrap gap-3">
        <input
          type="text" placeholder="Search ID or email..."
          className="px-3 py-2 border rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
        />
        <select className="px-3 py-2 border rounded-lg text-sm" value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(0); }}>
          <option value="">All Types</option>
          {Object.values(BookingType).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="px-3 py-2 border rounded-lg text-sm" value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
          <option value="">All Statuses</option>
          {Object.values(BookingStatus).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" className="px-3 py-2 border rounded-lg text-sm"
          value={startDate} onChange={e => { setStartDate(e.target.value); setPage(0); }} />
        <input type="date" className="px-3 py-2 border rounded-lg text-sm"
          value={endDate} onChange={e => { setEndDate(e.target.value); setPage(0); }} />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading bookings...</div>
      ) : (
        <>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Type', 'ID', 'Customer', 'Status', 'Amount', 'Payment', 'Created', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400">No bookings found</td></tr>
                ) : bookings.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(b)}>
                    <td className="px-4 py-3 text-lg">{TYPE_ICONS[b.bookingType] ?? '📋'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{b.id.slice(0, 8)}...</td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {b.user ? `${b.user.firstName} ${b.user.lastName}` : b.userId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">₦{Number(b.totalAmount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{b.paymentStatus}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/bookings/${b.id}`}
                        className="text-xs text-blue-600 hover:underline font-medium"
                        onClick={e => e.stopPropagation()}
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
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

      {selected && (
        <BookingDetailPanel booking={selected} onClose={() => { setSelected(null); fetchBookings(); }} />
      )}
    </div>
  );
}