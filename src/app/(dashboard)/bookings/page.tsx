'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { formatDate, formatCurrency, formatStatus, getStatusColor } from '@/lib/utils';
import { BookingStatus } from '@/types';

export default function BookingsPage() {
  const [page, setPage] = useState(0);
  const limit = 50;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', page],
    queryFn: () => apiClient.bookings.list(limit, page * limit),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; status: BookingStatus }) =>
      apiClient.bookings.updateStatus(vars.id, vars.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  const bookings = data?.data || [];
  const total = data?.total || 0;

  if (isLoading) {
    return <div className="text-center py-12 text-gray-600">Loading bookings...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>

      {/* Search & Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search..."
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Types</option>
            <option value="ticket">Tickets</option>
            <option value="table">Tables</option>
            <option value="apartment">Apartments</option>
            <option value="car">Cars</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING_PAYMENT">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Payment</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {bookings.map((booking: any) => (
              <tr key={booking.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm font-mono text-gray-600">
                  {booking.id.substring(0, 8)}...
                </td>
                <td className="px-6 py-3 text-sm capitalize text-gray-900">
                  {booking.bookingType}
                </td>
                <td className="px-6 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(booking.status)}`}>
                    {formatStatus(booking.status)}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                  {formatCurrency(booking.totalAmount)}
                </td>
                <td className="px-6 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(booking.paymentStatus)}`}>
                    {formatStatus(booking.paymentStatus)}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {formatDate(booking.createdAt)}
                </td>
                <td className="px-6 py-3 text-sm">
                  <select
                    value={booking.status}
                    onChange={(e) =>
                      updateMutation.mutate({
                        id: booking.id,
                        status: e.target.value as BookingStatus,
                      })
                    }
                    className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={updateMutation.isPending}
                  >
                    <option value="CONFIRMED">Confirm</option>
                    <option value="CHECKED_IN">Check In</option>
                    <option value="COMPLETED">Complete</option>
                    <option value="CANCELLED">Cancel</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={(page + 1) * limit >= total}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}