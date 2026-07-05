'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/services/api';
import type { Booking } from '@/types';
import { BookingStatus } from '@/types';
import useUIStore from '@/store/ui.store';

const STATUS_COLORS: Record<string, string> = {
  INITIATED: 'bg-gray-100 text-gray-600',
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  CHECKED_IN: 'bg-teal-100 text-teal-800',
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-200 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
};

const TYPE_ICONS: Record<string, string> = {
  ticket: '🎟️', table: '🪑', apartment: '🏠', car: '🚗',
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 w-40 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 font-medium text-right flex-1">{value}</span>
    </div>
  );
}

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const addToast = useUIStore(s => s.addToast);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState<BookingStatus | ''>('');
  const [updating, setUpdating] = useState(false);
  const [cautionLoading, setCautionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchBooking = async () => {
    try {
      const data = await apiClient.bookings.get(id);
      setBooking(data);
      setNewStatus(data.status as BookingStatus);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBooking(); }, [id]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === booking?.status) return;
    setUpdating(true);
    try {
      await apiClient.bookings.updateStatus(id, newStatus);
      showMessage('success', `Status updated to ${newStatus}`);
      addToast(`Status updated to ${newStatus}`, 'success');
      fetchBooking();
    } catch (e: any) {
      showMessage('error', e?.response?.data?.message ?? 'Update failed');
      addToast(e?.response?.data?.message ?? 'Update failed', 'error');
    } finally { setUpdating(false); }
  };

  const handleCautionFee = async (action: 'refund' | 'forfeit') => {
    setCautionLoading(true);
    try {
      if (action === 'refund') {
        await apiClient.bookings.refundCautionFee(id);
        showMessage('success', 'Caution fee refunded to customer wallet');
        addToast('Caution fee refunded', 'success');
      } else {
        await apiClient.bookings.forfeitCautionFee(id);
        showMessage('success', 'Caution fee forfeited');
        addToast('Caution fee forfeited', 'success');
      }
      fetchBooking();
    } catch (e: any) {
      showMessage('error', e?.response?.data?.message ?? 'Action failed');
      addToast(e?.response?.data?.message ?? 'Action failed', 'error');
    } finally { setCautionLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-500">Loading booking...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">❌</div>
        <p className="text-gray-500">Booking not found</p>
        <button onClick={() => router.back()} className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium">
          ← Back to Bookings
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-600 text-sm font-medium flex items-center gap-1"
        >
          ← Back
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{TYPE_ICONS[booking.bookingType] ?? '📋'}</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Booking Detail</h1>
              <p className="text-xs font-mono text-gray-400">{booking.id}</p>
            </div>
          </div>
        </div>
        <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${STATUS_COLORS[booking.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {booking.status}
        </span>
      </div>

      {actionMessage && (
        <div className={`mb-5 px-4 py-3 rounded-lg text-sm font-medium ${actionMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {actionMessage.type === 'success' ? '✅' : '❌'} {actionMessage.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Customer</h2>
          {booking.user ? (
            <>
              <DetailRow label="Name" value={`${booking.user.firstName} ${booking.user.lastName}`} />
              <DetailRow label="Email" value={booking.user.email} />
              <DetailRow label="User ID" value={<span className="font-mono text-xs">{booking.user.id}</span>} />
            </>
          ) : (
            <DetailRow label="User ID" value={<span className="font-mono text-xs">{booking.userId}</span>} />
          )}
          {booking.guestCount && <DetailRow label="Guest Count" value={booking.guestCount} />}
        </div>

        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Financials</h2>
          <DetailRow label="Base Price" value={`₦${Number(booking.basePrice).toLocaleString()}`} />
          <DetailRow label="Service Charge" value={`₦${Number(booking.serviceCharge).toLocaleString()}`} />
          <DetailRow label="Commission" value={`₦${Number(booking.platformCommission).toLocaleString()}`} />
          <DetailRow label="Total" value={<span className="text-base font-bold">₦{Number(booking.totalAmount).toLocaleString()}</span>} />
          <DetailRow label="Payment Status" value={
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${booking.paymentStatus === 'FULLY_PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {booking.paymentStatus}
            </span>
          } />
          {booking.paymentMethod && <DetailRow label="Payment Method" value={booking.paymentMethod} />}
        </div>

        {booking.cautionFeeAmount > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-orange-800 mb-3 pb-2 border-b border-orange-200">Caution Fee</h2>
            <DetailRow label="Amount" value={`₦${Number(booking.cautionFeeAmount).toLocaleString()}`} />
            <DetailRow label="Status" value={
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                booking.cautionFeeStatus === 'HELD' ? 'bg-yellow-100 text-yellow-800' :
                booking.cautionFeeStatus === 'REFUNDED' ? 'bg-green-100 text-green-700' :
                'bg-red-100 text-red-700'
              }`}>
                {booking.cautionFeeStatus}
              </span>
            } />
            {booking.cautionFeeResolvedAt && (
              <DetailRow label="Resolved At" value={new Date(booking.cautionFeeResolvedAt).toLocaleString()} />
            )}
            {booking.status === 'COMPLETED' && booking.cautionFeeStatus === 'HELD' && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-orange-200">
                <button
                  onClick={() => handleCautionFee('refund')}
                  disabled={cautionLoading}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  💚 Refund to Wallet
                </button>
                <button
                  onClick={() => handleCautionFee('forfeit')}
                  disabled={cautionLoading}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 disabled:opacity-50"
                >
                  🔴 Forfeit
                </button>
              </div>
            )}
          </div>
        )}

        {(booking.qrCodeData || booking.scannedAt) && (
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-teal-800 mb-3 pb-2 border-b border-teal-200">QR / Check-in</h2>
            {booking.qrCodeData && <DetailRow label="QR Data" value={<span className="font-mono text-xs break-all">{booking.qrCodeData}</span>} />}
            {booking.scannedAt
              ? <DetailRow label="Scanned At" value={<span className="text-green-700 font-medium">✅ {new Date(booking.scannedAt).toLocaleString()}</span>} />
              : <DetailRow label="Scan Status" value={<span className="text-orange-600">Not yet scanned</span>} />}
            {booking.checkInTime && <DetailRow label="Check-in Time" value={new Date(booking.checkInTime).toLocaleString()} />}
          </div>
        )}

        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Dates</h2>
          <DetailRow label="Created" value={new Date(booking.createdAt).toLocaleString()} />
          <DetailRow label="Updated" value={new Date(booking.updatedAt).toLocaleString()} />
          {booking.completedAt && <DetailRow label="Completed" value={new Date(booking.completedAt).toLocaleString()} />}
          {booking.cancelledAt && <DetailRow label="Cancelled" value={new Date(booking.cancelledAt).toLocaleString()} />}
        </div>

        {booking.metadata && Object.keys(booking.metadata).length > 0 && (
          <div className="bg-white rounded-xl border p-5 shadow-sm md:col-span-2">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Metadata</h2>
            <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 overflow-x-auto">
              {JSON.stringify(booking.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="mt-5 bg-white rounded-xl border p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Override Booking Status</h2>
        <p className="text-xs text-gray-500 mb-3">This logs an admin override in the audit trail.</p>
        <div className="flex gap-3">
          <select
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={newStatus}
            onChange={e => setNewStatus(e.target.value as BookingStatus)}
          >
            {Object.values(BookingStatus).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={handleStatusUpdate}
            disabled={updating || newStatus === booking.status}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
          >
            {updating ? 'Updating...' : 'Update Status'}
          </button>
        </div>
      </div>
    </div>
  );
}