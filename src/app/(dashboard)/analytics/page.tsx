'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

type Tab = 'overview' | 'revenue' | 'staff' | 'orders';

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];

function StatCard({ label, value, color = 'text-blue-600' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white rounded-xl border p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [dateRange, setDateRange] = useState('30days');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const getDateParams = () => {
    const end   = new Date();
    const start = new Date();
    const days  = ({ '7days': 7, '30days': 30, '90days': 90 } as Record<string, number>)[dateRange] ?? 30;
    start.setDate(end.getDate() - days);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate:   end.toISOString().split('T')[0],
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setData(null);
      const params = getDateParams();
      try {
        let result: any;
        if (activeTab === 'overview') result = await apiClient.analytics.dashboard(params);
        else if (activeTab === 'revenue') result = await apiClient.analytics.revenue(params);
        else if (activeTab === 'staff')   result = await apiClient.analytics.staffPerformance(params);
        else if (activeTab === 'orders')  result = await apiClient.analytics.orders(params);
        setData(result);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [activeTab, dateRange]);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'revenue',  label: '💰 Revenue'  },
    { id: 'staff',    label: '👥 Staff'    },
    { id: 'orders',   label: '🍽️ Orders'  },
  ];

  const renderOverview = () => {
    if (!data) return null;
    const byTypeData = Object.entries(data.bookingsByType ?? data.bookings?.byType ?? {}).map(([name, value]) => ({ name, value }));
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Bookings"  value={data.totalBookings  ?? data.bookings?.total ?? 0} />
          <StatCard label="Active Bookings" value={data.activeBookings ?? data.bookings?.confirmed ?? 0} color="text-green-600" />
          <StatCard label="Total Revenue"   value={`₦${Number(data.totalRevenue ?? data.revenue?.total ?? 0).toLocaleString()}`} color="text-emerald-600" />
          <StatCard label="Today's Revenue" value={`₦${Number(data.todayRevenue ?? 0).toLocaleString()}`} color="text-purple-600" />
        </div>
        {byTypeData.length > 0 && (
          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Bookings by Type</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byTypeData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [v, 'Bookings']} />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  const renderRevenue = () => {
    if (!data) return null;
    const base       = Number(data.baseRevenue ?? data.totalRevenue ?? 0);
    const service    = Number(data.serviceCharges ?? data.serviceChargeRevenue ?? 0);
    const commission = Number(data.platformCommission ?? 0);
    const total      = Number(data.total ?? data.totalRevenue ?? 0);

    const barData = [
      { name: 'Base',       value: base },
      { name: 'Service',    value: service },
      { name: 'Commission', value: commission },
    ];
    const pieData = barData.filter(d => d.value > 0);

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Base Revenue"    value={`₦${base.toLocaleString()}`}       color="text-blue-600" />
          <StatCard label="Service Charges" value={`₦${service.toLocaleString()}`}    color="text-green-600" />
          <StatCard label="Commission"      value={`₦${commission.toLocaleString()}`} color="text-purple-600" />
          <StatCard label="Total"           value={`₦${total.toLocaleString()}`}      color="text-emerald-700" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue Breakdown (Bar)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`₦${Number(v).toLocaleString()}`, 'Amount']} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {barData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {pieData.length > 0 && (
            <div className="bg-white rounded-xl border p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue Breakdown (Pie)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `₦${Number(v).toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStaff = () => {
    if (!data) return null;
    const raw = data.byWaiter ?? {};
    const entries = Object.entries(raw as Record<string, { completed: number; total: number }>);
    if (!entries.length) return <div className="text-gray-400 text-sm py-8 text-center">No staff data in this period</div>;

    const chartData = entries.map(([id, s]) => ({
      name:      id === 'unassigned' ? 'Unassigned' : id.slice(0, 8),
      total:     s.total,
      completed: s.completed,
      rate:      s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
    }));

    return (
      <div className="space-y-5">
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Orders per Staff Member</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="total"     name="Total Orders" fill="#93C5FD" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Completed"    fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Staff ID', 'Total', 'Completed', 'Rate'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {chartData.map(row => (
                <tr key={row.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-mono text-gray-600">{row.name}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{row.total}</td>
                  <td className="px-4 py-3 text-sm text-green-600 font-medium">{row.completed}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${row.rate}%` }} />
                      </div>
                      <span className="text-xs text-gray-600">{row.rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderOrders = () => {
    if (!data) return null;
    const statuses  = data.byStatus as Record<string, number> ?? {};
    const chartData = Object.entries(statuses).map(([name, value]) => ({ name, value }));
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Total Orders" value={data.total ?? 0} />
          <StatCard label="Completed"    value={statuses['COMPLETED'] ?? 0} color="text-green-600" />
          <StatCard label="Cancelled"    value={statuses['CANCELLED'] ?? 0} color="text-red-500" />
        </div>
        {chartData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Orders by Status</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [v, 'Orders']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Orders by Status (Pie)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [v, 'Orders']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Platform performance metrics</p>
        </div>
        <select
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none"
          value={dateRange} onChange={e => setDateRange(e.target.value)}
        >
          <option value="7days">Last 7 days</option>
          <option value="30days">Last 30 days</option>
          <option value="90days">Last 90 days</option>
        </select>
      </div>

      <div className="flex gap-1 mb-6 border-b">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading analytics...</div>
      ) : !data ? (
        <div className="text-center py-20 text-gray-400">No data available</div>
      ) : (
        <>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'revenue'  && renderRevenue()}
          {activeTab === 'staff'    && renderStaff()}
          {activeTab === 'orders'   && renderOrders()}
        </>
      )}
    </div>
  );
}