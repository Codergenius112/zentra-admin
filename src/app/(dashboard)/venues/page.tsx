'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { apiClient } from '@/services/api';
import MediaUpload from '@/components/MediaUpload';
import FloorPlanEditor from '@/components/FloorPlanEditor';
import useUIStore from '@/store/ui.store';
import useAuthStore from '@/store/auth.store';
import type { Venue, TableListing } from '@/types';
import { UserRole } from '@/types';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function VenuesPage() {
  const addToast = useUIStore(s => s.addToast);
  const user = useAuthStore(s => s.user);
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  const [venues, setVenues] = useState<Venue[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [showFloorPlan, setShowFloorPlan] = useState<Venue | null>(null);
  const [floorPlanTables, setFloorPlanTables] = useState<TableListing[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [creatingTable, setCreatingTable] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '', address: '', city: '', maxCapacity: '',
  });

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const res = await apiClient.venues.list({ limit: 50 }) as any;
      setVenues(res.data?.data ?? res.data ?? []);
      setTotal(res.data?.total ?? res.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVenues(); }, []);

  const openFloorPlan = async (venue: Venue) => {
    setShowFloorPlan(venue);
    try {
      const res = await apiClient.tables.listings({ limit: 200, venueId: venue.id }) as any;
      const venueTables = res.data?.listings ?? res.data?.data ?? res.data ?? [];
      setFloorPlanTables(venueTables);
    } catch (e) {
      console.error(e);
      setFloorPlanTables([]);
    }
  };

  const handleCreate = async () => {
    if (mediaUrls.length === 0) {
      addToast('Upload at least one image before creating a venue', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.venues.create({
        name: form.name,
        address: form.address,
        city: form.city,
        maxCapacity: Number(form.maxCapacity) || 0,
        mediaUrls: mediaUrls,
      });
      setShowCreate(false);
      setForm({ name: '', address: '', city: '', maxCapacity: '' });
      setMediaUrls([]);
      fetchVenues();
      addToast('Venue created successfully', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to create venue', 'error');
    } finally { setSubmitting(false); }
  };

  const handleToggleActive = async (venue: Venue) => {
    try {
      await apiClient.venues.update(venue.id, { isActive: !venue.isActive });
      fetchVenues();
      addToast(`Venue ${venue.isActive ? 'deactivated' : 'activated'}`, 'success');
    } catch (e: any) { addToast(e?.response?.data?.message ?? 'Update failed', 'error'); }
  };

  const handleToggleWalkIn = async (venue: Venue) => {
    try {
      await apiClient.venues.update(venue.id, { allowWalkInOrders: !venue.allowWalkInOrders });
      fetchVenues();
      addToast(`Walk-in orders ${venue.allowWalkInOrders ? 'disabled' : 'enabled'} for ${venue.name}`, 'success');
    } catch (e: any) { addToast(e?.response?.data?.message ?? 'Update failed', 'error'); }
  };

  const handleCreateFloorPlanTable = async () => {
    if (!showFloorPlan) return;
    try {
      setCreatingTable(true);
      await apiClient.tables.createListing({
        venueId: showFloorPlan.id,
        name: `Table ${floorPlanTables.length + 1}`,
        category: 'standard',
        capacity: 4,
        price: 0,
        description: 'Created from floor plan',
        features: [],
      });
      const res = await apiClient.tables.listings({ limit: 200, venueId: showFloorPlan.id }) as any;
      const venueTables = res.data?.listings ?? res.data?.data ?? res.data ?? [];
      setFloorPlanTables(venueTables);
      addToast('Table added to the floor plan', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Could not add table', 'error');
    } finally {
      setCreatingTable(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this venue? This will soft-delete it.')) return;
    try {
      await apiClient.venues.delete(id);
      fetchVenues();
      addToast('Venue deleted', 'success');
    } catch (e: any) { addToast(e?.response?.data?.message ?? 'Delete failed', 'error'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Venues</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total venues</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
          + Add Venue
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading venues...</div>
      ) : venues.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No venues found. Create your first venue!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {venues.map(venue => (
            <div key={venue.id} className="bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-base leading-tight">{venue.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ml-2 shrink-0 ${
                  venue.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {venue.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-500">
                <div className="flex items-start gap-1">
                  <span>📍</span>
                  <span className="line-clamp-1">{venue.address}, {venue.city}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>👥</span>
                  <span>Capacity: {venue.maxCapacity || 'Not set'}</span>
                </div>
                <div className="text-xs text-gray-400 pt-1">
                  ID: {venue.id.slice(0, 8)}...
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setSelectedVenue(venue)}
                  className="flex-1 py-1.5 border border-blue-500 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-50">
                  Details
                </button>
                <button onClick={() => openFloorPlan(venue)}
                  className="flex-1 py-1.5 border border-purple-500 text-purple-600 rounded-lg text-xs font-medium hover:bg-purple-50">
                  🎨 {isSuperAdmin ? 'View Floor Plan' : 'Floor Plan'}
                </button>
                <button onClick={() => handleToggleActive(venue)}
                  className={`flex-1 py-1.5 border rounded-lg text-xs font-medium ${
                    venue.isActive 
                      ? 'border-orange-400 text-orange-600 hover:bg-orange-50' 
                      : 'border-green-400 text-green-600 hover:bg-green-50'
                  }`}>
                  {venue.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => handleToggleWalkIn(venue)}
                  className={`flex-1 py-1.5 border rounded-lg text-xs font-medium ${
                    venue.allowWalkInOrders !== false
                      ? 'border-indigo-400 text-indigo-600 hover:bg-indigo-50'
                      : 'border-gray-400 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {venue.allowWalkInOrders !== false ? 'Walk-in On' : 'Walk-in Off'}
                </button>
                <button onClick={() => handleDelete(venue.id)}
                  className="flex-1 py-1.5 border border-red-400 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="Add Venue" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            {([
              { label: 'Venue Name',     key: 'name',        type: 'text',   placeholder: 'e.g. Club Luxe' },
              { label: 'Address',        key: 'address',     type: 'text',   placeholder: 'e.g. 123 Victoria Island' },
              { label: 'City',           key: 'city',        type: 'text',   placeholder: 'e.g. Lagos' },
              { label: 'Max Capacity',   key: 'maxCapacity', type: 'number', placeholder: 'e.g. 500' },
            ] as const).map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input type={type} placeholder={placeholder}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Media (optional)</label>
              <MediaUpload
                onUploadComplete={setMediaUrls}
                existingUrls={mediaUrls}
                maxFiles={5}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600">Cancel</button>
              <button onClick={handleCreate} disabled={submitting}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {submitting ? 'Creating...' : 'Create Venue'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {selectedVenue && (
        <Modal title={selectedVenue.name} onClose={() => setSelectedVenue(null)}>
          <div className="space-y-3 text-sm text-gray-700">
            <p><strong>ID:</strong> <span className="font-mono text-xs">{selectedVenue.id}</span></p>
            <p><strong>Status:</strong> {selectedVenue.isActive ? 'Active' : 'Inactive'}</p>
            <p><strong>Address:</strong> {selectedVenue.address}</p>
            <p><strong>City:</strong> {selectedVenue.city}</p>
            <p><strong>Max Capacity:</strong> {selectedVenue.maxCapacity || 'Not set'}</p>
            <p><strong>Created:</strong> {new Date(selectedVenue.createdAt).toLocaleDateString()}</p>
            {selectedVenue.mediaUrls?.length > 0 ? (
              <div>
                <strong>Media:</strong>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {selectedVenue.mediaUrls.map((url, i) => (
                    <div key={i} className="overflow-hidden rounded-lg border bg-gray-100">
                      {url.match(/\.(mp4|mov|avi|mkv)$/i) ? (
                        <video src={url} controls className="w-full h-24 object-cover" />
                      ) : (
                        <div className="relative w-full h-24">
                          <Image src={url} alt="" fill className="object-cover" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No media uploaded yet.</p>
            )}
          </div>
        </Modal>
      )}

      {showFloorPlan && (
        <div className="fixed inset-0 z-50 bg-white overflow-auto">
          <div className="max-w-7xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Floor Plan: {showFloorPlan.name}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {isSuperAdmin
                    ? 'Read-only view for oversight. Editing is restricted to the business admin/manager.'
                    : 'Drag tables to position them. Click to select and rotate/resize.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isSuperAdmin && (
                  <button
                    onClick={handleCreateFloorPlanTable}
                    disabled={creatingTable}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm disabled:opacity-50"
                  >
                    {creatingTable ? 'Adding...' : '➕ Add Table'}
                  </button>
                )}
                <button
                  onClick={() => setShowFloorPlan(null)}
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium text-sm"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            <FloorPlanEditor
              venue={showFloorPlan}
              tables={floorPlanTables}
              readOnly={isSuperAdmin}
              onSaved={() => {
                addToast('Floor plan saved successfully', 'success');
                fetchVenues();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
