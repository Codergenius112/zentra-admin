'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => apiClient.analytics.dashboard(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Failed to load dashboard
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Bookings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Bookings</h3>
          <div className="flex items-baseline space-x-2">
            <p className="text-3xl font-bold">{metrics?.bookings?.total || 0}</p>
            <p className="text-green-600 text-sm">
              {metrics?.bookings?.conversionRate || '0%'}
            </p>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Revenue</h3>
          <div>
            <p className="text-3xl font-bold">
              {formatCurrency(metrics?.revenue?.total)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Commission: {formatCurrency(metrics?.revenue?.platformCommission)}
            </p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Orders</h3>
          <div className="flex items-baseline space-x-2">
            <p className="text-3xl font-bold">{metrics?.orders?.total || 0}</p>
            <p className="text-green-600 text-sm">
              {metrics?.orders?.completionRate || '0%'}
            </p>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Avg Order Value</h3>
          <p className="text-3xl font-bold">
            {formatCurrency(metrics?.orders?.averageValue)}
          </p>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Booking Status Distribution</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {metrics?.bookings?.confirmed || 0}
            </div>
            <div className="text-sm text-gray-600">Confirmed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">0</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {metrics?.bookings?.cancelled || 0}
            </div>
            <div className="text-sm text-gray-600">Cancelled</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">0</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">0</div>
            <div className="text-sm text-gray-600">Expired</div>
          </div>
        </div>
      </div>

      {/* Quick Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Quick Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <p>• Your admin panel is running smoothly</p>
          <p>• All integrations are connected</p>
          <p>• Navigate using the sidebar menu</p>
          <p>• Click on any page to manage that section</p>
        </div>
      </div>
    </div>
  );
}