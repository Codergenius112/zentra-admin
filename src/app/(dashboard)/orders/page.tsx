'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { formatDate, formatCurrency, formatStatus, getStatusColor } from '@/lib/utils';

export default function OrdersPage() {
  const [page, setPage] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const limit = 50;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page],
    queryFn: () => apiClient.orders.list(limit, page * limit),
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; status: string }) =>
      apiClient.orders.updateStatus(vars.id, vars.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const assignMutation = useMutation({
    mutationFn: (vars: { id: string; waiterId: string }) =>
      apiClient.orders.assign(vars.id, vars.waiterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const orders = data?.data || [];
  const total = data?.total || 0;

  if (isLoading) {
    return <div className="text-center py-12 text-gray-600">Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Live Updates
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search order..."
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-[200px]"
          />
          <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Statuses</option>
            <option value="CREATED">Created</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PREPARATION">In Prep</option>
            <option value="READY">Ready</option>
            <option value="SERVED">Served</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Order ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Items</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Assigned To</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Time</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders.map((order: any) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm font-mono text-gray-600">
                  {order.id.substring(0, 8)}...
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {order.items?.length || 0} items
                </td>
                <td className="px-6 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(order.status)}`}>
                    {formatStatus(order.status)}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                  {formatCurrency(order.totalAmount)}
                </td>
                <td className="px-6 py-3 text-sm">
                  {order.assignedToUserId ? (
                    <span className="text-gray-900">Assigned</span>
                  ) : (
                    <span className="text-red-600 font-semibold">Unassigned</span>
                  )}
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {formatDate(order.createdAt)}
                </td>
                <td className="px-6 py-3 text-sm">
                  <div className="flex gap-2">
                    <select
                      value={order.status}
                      onChange={(e) =>
                        updateMutation.mutate({
                          id: order.id,
                          status: e.target.value,
                        })
                      }
                      className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={updateMutation.isPending}
                    >
                      <option value="CREATED">Create</option>
                      <option value="IN_PREPARATION">Prep</option>
                      <option value="READY">Ready</option>
                      <option value="SERVED">Serve</option>
                      <option value="COMPLETED">Complete</option>
                    </select>
                  </div>
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