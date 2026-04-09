'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { formatDate, formatCurrency, formatStatus } from '@/lib/utils';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('7days');

  const getDateParams = () => {
    const endDate = new Date();
    const startDate = new Date();

    switch (dateRange) {
      case '7days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const { startDate, endDate } = getDateParams();

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['analytics', 'bookings', dateRange],
    queryFn: () => apiClient.analytics.bookings(startDate, endDate),
  });

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => apiClient.analytics.dashboard(),
  });

  const isLoading = bookingsLoading || dashboardLoading;

  if (isLoading) {
    return <div className="text-center py-12 text-gray-600">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
        </select>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bookings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Bookings</h3>
          <p className="text-3xl font-bold text-blue-600">
            {bookingsData?.totalBookings || 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Growth: {bookingsData?.growthRate || '0%'}
          </p>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(bookingsData?.totalRevenue || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Avg: {formatCurrency(bookingsData?.averageRevenuePerBooking || 0)}
          </p>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Conversion Rate</h3>
          <p className="text-3xl font-bold text-purple-600">
            {bookingsData?.conversionRate || '0%'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Completed: {bookingsData?.completedBookings || 0}
          </p>
        </div>

        {/* Cancellation Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Cancellation Rate</h3>
          <p className="text-3xl font-bold text-red-600">
            {bookingsData?.cancellationRate || '0%'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Cancelled: {bookingsData?.cancelledBookings || 0}
          </p>
        </div>
      </div>

      {/* Booking Status Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Booking Status Distribution</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">
              {bookingsData?.byStatus?.confirmed || 0}
            </p>
            <p className="text-sm text-gray-600">Confirmed</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">
              {bookingsData?.byStatus?.pending || 0}
            </p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {bookingsData?.byStatus?.completed || 0}
            </p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">
              {bookingsData?.byStatus?.cancelled || 0}
            </p>
            <p className="text-sm text-gray-600">Cancelled</p>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Revenue Breakdown</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Base Revenue</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(bookingsData?.revenueBreakdown?.baseRevenue || 0)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Service Charges</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(bookingsData?.revenueBreakdown?.serviceCharges || 0)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Platform Commission</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(bookingsData?.revenueBreakdown?.platformCommission || 0)}
            </span>
          </div>
          <hr />
          <div className="flex justify-between items-center">
            <span className="text-gray-900 font-semibold">Total Revenue</span>
            <span className="font-bold text-lg text-green-600">
              {formatCurrency(bookingsData?.totalRevenue || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Top Booking Types */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Bookings by Type</h2>
        <div className="space-y-3">
          {bookingsData?.byType && Object.entries(bookingsData.byType).map(([type, count]: any) => (
            <div key={type} className="flex items-center justify-between">
              <span className="text-gray-600 capitalize">{type}</span>
              <div className="flex items-center gap-3">
                <div className="w-48 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${(count / (bookingsData?.totalBookings || 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="font-semibold text-gray-900 w-12">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Payment Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-600">
            <p className="text-sm text-gray-600">Fully Paid</p>
            <p className="text-2xl font-bold text-green-600">
              {bookingsData?.paymentStatus?.fullyPaid || 0}
            </p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-600">
            <p className="text-sm text-gray-600">Partially Paid</p>
            <p className="text-2xl font-bold text-yellow-600">
              {bookingsData?.paymentStatus?.partiallyPaid || 0}
            </p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-600">
            <p className="text-sm text-gray-600">Unpaid</p>
            <p className="text-2xl font-bold text-red-600">
              {bookingsData?.paymentStatus?.unpaid || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}