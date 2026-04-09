'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { formatDate, formatStatus } from '@/lib/utils';
import { UserRole } from '@/types';

export default function StaffPage() {
  const [page, setPage] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: UserRole.WAITER,
  });
  const limit = 50;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['staff', page],
    queryFn: () => apiClient.staff.list(limit, page * limit),
  });

  const addMutation = useMutation({
    mutationFn: (newStaff: any) => apiClient.staff.add(newStaff),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setShowAddForm(false);
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        role: UserRole.WAITER,
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: (vars: { id: string; role: UserRole }) =>
      apiClient.staff.updateRole(vars.id, vars.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });

  const staffMembers = data?.data || [];
  const total = data?.total || 0;

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Failed to add staff');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-600">Loading staff...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          {showAddForm ? 'Cancel' : '+ Add Staff'}
        </button>
      </div>

      {/* Add Staff Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Add New Staff Member</h2>
          <form onSubmit={handleAddStaff} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={handleInputChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={UserRole.WAITER}>Waiter</option>
                <option value={UserRole.KITCHEN_STAFF}>Kitchen Staff</option>
                <option value={UserRole.BAR_STAFF}>Bar Staff</option>
                <option value={UserRole.DOOR_STAFF}>Door Staff</option>
                <option value={UserRole.MANAGER}>Manager</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium"
            >
              {addMutation.isPending ? 'Adding...' : 'Add Staff Member'}
            </button>
          </form>
        </div>
      )}

      {/* Search & Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search by name or email..."
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-[200px]"
          />
          <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Roles</option>
            <option value="waiter">Waiter</option>
            <option value="kitchen_staff">Kitchen Staff</option>
            <option value="bar_staff">Bar Staff</option>
            <option value="door_staff">Door Staff</option>
            <option value="manager">Manager</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Phone</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Joined</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {staffMembers.map((staff: any) => (
              <tr key={staff.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm font-medium text-gray-900">
                  {staff.firstName} {staff.lastName}
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">{staff.email}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{staff.phone || '—'}</td>
                <td className="px-6 py-3 text-sm">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                    {formatStatus(staff.role)}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      staff.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {staff.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {formatDate(staff.createdAt)}
                </td>
                <td className="px-6 py-3 text-sm">
                  <select
                    value={staff.role}
                    onChange={(e) =>
                      updateRoleMutation.mutate({
                        id: staff.id,
                        role: e.target.value as UserRole,
                      })
                    }
                    className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={updateRoleMutation.isPending}
                  >
                    <option value={UserRole.WAITER}>Waiter</option>
                    <option value={UserRole.KITCHEN_STAFF}>Kitchen</option>
                    <option value={UserRole.BAR_STAFF}>Bar</option>
                    <option value={UserRole.DOOR_STAFF}>Door</option>
                    <option value={UserRole.MANAGER}>Manager</option>
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