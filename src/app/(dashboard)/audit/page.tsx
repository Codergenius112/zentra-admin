'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { formatDate, formatStatus } from '@/lib/utils';

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  userId: string;
  userName: string;
  changes: {
    before?: any;
    after?: any;
  };
  ipAddress?: string;
  userAgent?: string;
  status: string;
  createdAt: string;
}

export default function AuditPage() {
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    dateRange: '30days',
  });
  const limit = 50;

  const getDateParams = () => {
    const endDate = new Date();
    const startDate = new Date();

    switch (filters.dateRange) {
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
        startDate.setDate(endDate.getDate() - 30);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const { startDate, endDate } = getDateParams();

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, filters],
    queryFn: async () => {
      // Mock data - replace with actual API call when available
      return {
        data: [
          {
            id: '1',
            action: 'CREATE',
            resource: 'BOOKING',
            resourceId: 'bk_123',
            userId: 'user_1',
            userName: 'Admin User',
            changes: { after: { status: 'CONFIRMED' } },
            ipAddress: '192.168.1.1',
            status: 'SUCCESS',
            createdAt: new Date().toISOString(),
          },
          {
            id: '2',
            action: 'UPDATE',
            resource: 'BOOKING',
            resourceId: 'bk_456',
            userId: 'user_2',
            userName: 'Manager User',
            changes: { before: { status: 'PENDING' }, after: { status: 'CONFIRMED' } },
            ipAddress: '192.168.1.2',
            status: 'SUCCESS',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: '3',
            action: 'DELETE',
            resource: 'ORDER',
            resourceId: 'ord_789',
            userId: 'user_1',
            userName: 'Admin User',
            changes: { before: { status: 'CREATED' } },
            ipAddress: '192.168.1.1',
            status: 'SUCCESS',
            createdAt: new Date(Date.now() - 7200000).toISOString(),
          },
          {
            id: '4',
            action: 'UPDATE',
            resource: 'STAFF',
            resourceId: 'staff_111',
            userId: 'user_2',
            userName: 'Manager User',
            changes: { before: { role: 'WAITER' }, after: { role: 'KITCHEN_STAFF' } },
            ipAddress: '192.168.1.2',
            status: 'SUCCESS',
            createdAt: new Date(Date.now() - 10800000).toISOString(),
          },
        ],
        total: 4,
        limit,
        offset: page * limit,
      };
    },
  });

  const logs = (data?.data as AuditLog[]) || [];
  const total = data?.total || 0;

  const getActionColor = (action: string): string => {
    const colors: Record<string, string> = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
      LOGIN: 'bg-purple-100 text-purple-800',
      LOGOUT: 'bg-gray-100 text-gray-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const getResourceColor = (resource: string): string => {
    const colors: Record<string, string> = {
      BOOKING: 'bg-indigo-100 text-indigo-800',
      ORDER: 'bg-orange-100 text-orange-800',
      STAFF: 'bg-cyan-100 text-cyan-800',
      PAYMENT: 'bg-teal-100 text-teal-800',
      USER: 'bg-pink-100 text-pink-800',
    };
    return colors[resource] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-600">Loading audit logs...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4 flex-wrap">
          <input
            type="text"
            'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { formatDate, formatStatus } from '@/lib/utils';

export default function AuditPage() {
  const [page, setPage] = useState(0);
  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, filterAction, filterResource],
    queryFn: () => apiClient.get('/admin/audit', {
      params: {
        limit,
        offset: page * limit,
        action: filterAction || undefined,
        resourceType: filterResource || undefined,
      },
    }),
  });

  const logs = data?.data || [];
  const total = data?.total || 0;

  const actionColors: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-800',
    UPDATE: 'bg-blue-100 text-blue-800',
    DELETE: 'bg-red-100 text-red-800',
    READ: 'bg-gray-100 text-gray-800',
    LOGIN: 'bg-purple-100 text-purple-800',
    LOGOUT: 'bg-yellow-100 text-yellow-800',
    ASSIGN: 'bg-indigo-100 text-indigo-800',
    STATUS_CHANGE: 'bg-cyan-100 text-cyan-800',
  };

  const getActionColor = (action: string): string => {
    return actionColors[action] || 'bg-gray-100 text-gray-800';
  };

  const resourceColors: Record<string, string> = {
    BOOKING: 'bg-orange-100 text-orange-800',
    ORDER: 'bg-pink-100 text-pink-800',
    USER: 'bg-teal-100 text-teal-800',
    STAFF: 'bg-lime-100 text-lime-800',
    PAYMENT: 'bg-emerald-100 text-emerald-800',
    ANALYTICS: 'bg-sky-100 text-sky-800',
  };

  const getResourceColor = (resource: string): string => {
    return resourceColors[resource] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-600">Loading audit logs...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
            <select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="ASSIGN">Assign</option>
              <option value="STATUS_CHANGE">Status Change</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Resource Type</label>
            <select
              value={filterResource}
              onChange={(e) => {
                setFilterResource(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Resources</option>
              <option value="BOOKING">Booking</option>
              <option value="ORDER">Order</option>
              <option value="USER">User</option>
              <option value="STAFF">Staff</option>
              <option value="PAYMENT">Payment</option>
              <option value="ANALYTICS">Analytics</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by ID or user..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full min-w-[1200px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">User</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Resource
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Resource ID
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {logs.map((log: any) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {formatDate(log.createdAt)}
                </td>
                <td className="px-6 py-3 text-sm">
                  <div className="text-gray-900 font-medium">{log.userName}</div>
                  <div className="text-gray-500 text-xs">{log.userEmail}</div>
                </td>
                <td className="px-6 py-3 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${getActionColor(
                      log.action,
                    )}`}
                  >
                    {formatStatus(log.action)}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${getResourceColor(
                      log.resourceType,
                    )}`}
                  >
                    {log.resourceType}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm font-mono text-gray-600">
                  {log.resourceId?.substring(0, 8)}...
                </td>
                <td className="px-6 py-3 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      log.status === 'SUCCESS'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {log.status}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {log.description || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {logs.length === 0 && (
          <div className="text-center py-12 text-gray-600">
            No audit logs found for the selected filters
          </div>
        )}
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
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition font-medium text-sm"
          >
            Previous
          </button>
          <span className="px-3 py-2 text-sm text-gray-600">
            Page {page + 1}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={(page + 1) * limit >= total}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition font-medium text-sm"
          >
            Next
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Actions</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                  CREATE
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                  UPDATE
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">
                  DELETE
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                  LOGIN
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Resources</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-800">
                  BOOKING
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded text-xs font-semibold bg-pink-100 text-pink-800">
                  ORDER
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded text-xs font-semibold bg-teal-100 text-teal-800">
                  USER
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded text-xs font-semibold bg-lime-100 text-lime-800">
                  STAFF
                </span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-medium text-gray-900 mb-2">Info</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• All actions are tracked and logged automatically</li>
              <li>• Filter by action, resource type, or search by ID</li>
              <li>• Status shows if action succeeded or failed</li>
              <li>• Timestamps are in your local timezone</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}="Search by user or resource ID..."
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-[200px]"
          />
          <select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
          </select>
          <select
            value={filters.resource}
            onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Resources</option>
            <option value="BOOKING">Bookings</option>
            <option value="ORDER">Orders</option>
            <option value="STAFF">Staff</option>
            <option value="PAYMENT">Payments</option>
            <option value="USER">Users</option>
          </select>
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full min-w-[1200px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Timestamp</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">User</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Resource</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Resource ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Changes</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">IP Address</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {formatDate(log.createdAt)}
                </td>
                <td className="px-6 py-3 text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{log.userName}</span>
                    <span className="text-xs text-gray-500">{log.userId}</span>
                  </div>
                </td>
                <td className="px-6 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getActionColor(log.action)}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getResourceColor(log.resource)}`}>
                    {log.resource}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm font-mono text-gray-600">
                  {log.resourceId.substring(0, 12)}...
                </td>
                <td className="px-6 py-3 text-sm">
                  <details className="cursor-pointer">
                    <summary className="text-blue-600 hover:text-blue-800 font-medium">
                      View Changes
                    </summary>
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono text-gray-700 max-w-xs overflow-auto">
                      <pre>{JSON.stringify(log.changes, null, 2)}</pre>
                    </div>
                  </details>
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {log.ipAddress || '—'}
                </td>
                <td className="px-6 py-3 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      log.status === 'SUCCESS'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {logs.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 text-lg">No audit logs found</p>
          <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
        </div>
      )}

      {/* Pagination */}
      {logs.length > 0 && (
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
      )}

      {/* Legend */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-3">Action Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">CREATE</span>
            <span className="text-gray-600">New record</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">UPDATE</span>
            <span className="text-gray-600">Modified</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">DELETE</span>
            <span className="text-gray-600">Removed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">LOGIN</span>
            <span className="text-gray-600">Sign in</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-semibold">LOGOUT</span>
            <span className="text-gray-600">Sign out</span>
          </div>
        </div>
      </div>
    </div>
  );
}