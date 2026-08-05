'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';
import type { Booking } from '@/types';
import useUIStore from '@/store/ui.store';

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-blue-100 text-blue-800',
  ACTIVE:    'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
};

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

export default function TablesPage() {
  const addToast = useUIStore(s => s.addToast);
  const [tab, setTab]               = useState<'listings' | 'bookings'>('listings');
  const [listings, setListings]     = useState<any[]>([]);
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [walkInForm, setWalkInForm] = useState({ tableId: '', guestName: '', guestCount: '', notes: '' });
  const [venues, setVenues] = useState<Array<{ id: string; name: string }>>([]);
  const [listingForm, setListingForm] = useState({
    venueId: '', name: '', category: 'standard', capacity: '', price: '', description: '', features: '',
  });

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.tables.listings() as any;
      setListings(res.data?.listings ?? res.data?.data ?? res.data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.tables.bookings({ status: statusFilter || undefined }) as any;
      setBookings(res.data?.data ?? res.data ?? []);
      setTotal(res.data?.total ?? res.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchVenues = async () => {
    try {
      const res = await apiClient.venues.list({ limit: 100 }) as any;
      setVenues(res.data?.data ?? res.data ?? []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchVenues(); }, []);
  useEffect(() => { tab === 'listings' ? fetchListings() : fetchBookings(); }, [tab, statusFilter]);

  const handleWalkIn = async () => {
    setSubmitting(true);
    try {
      await apiClient.tables.walkIn({
        tableId:    walkInForm.tableId,
        guestName:  walkInForm.guestName,
        guestCount: Number(walkInForm.guestCount),
        notes:      walkInForm.notes,
        includeDefaultOrder: false, // seating only — purchases are logged separately under Orders
      });
      setShowWalkIn(false);
      setWalkInForm({ tableId: '', guestName: '', guestCount: '', notes: '' });
      fetchBookings();
      addToast('Walk-in booking created', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Walk-in failed', 'error');
    } finally { setSubmitting(false); }
  };

  const handleCreateListing = async () => {
    setSubmitting(true);
    try {
      await apiClient.tables.createListing({
        venueId: listingForm.venueId,
        name: listingForm.name,
        category: listingForm.category,
        capacity: Number(listingForm.capacity),
        price: Number(listingForm.price),
        description: listingForm.description || null,
        features: listingForm.features ? listingForm.features.split(',').map(f => f.trim()) : [],
      });
      setShowCreateListing(false);
      setListingForm({ venueId: '', name: '', category: 'standard', capacity: '', price: '', description: '', features: '' });
      fetchListings();
      addToast('Table listing created', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to create listing', 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tables</h1>
          <p className="text-gray-500 text-sm mt-1">
            {tab === 'bookings' ? `${total} table bookings` : 'Table listings'}
          </p>
        </div>
        <div className="flex gap-2">
          {(['listings', 'bookings'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                tab === t ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}>
              {t === 'listings' ? '🪑 Listings' : '📋 Bookings'}
            </button>
          ))}
          {tab === 'listings' && (
            <button onClick={() => setShowCreateListing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              + Add Table
            </button>
          )}
          {tab === 'bookings' && (
            <button onClick={() => setShowWalkIn(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              + Walk-in
            </button>
          )}
        </div>
      </div>

      {tab === 'bookings' && (
        <div className="mb-4">
          <select className="px-3 py-2 border rounded-lg text-sm"
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {['CONFIRMED','ACTIVE','COMPLETED','CANCELLED'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading...</div>
      ) : tab === 'listings' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {listings.length === 0 ? (
            <div className="col-span-3 text-center py-20 text-gray-400">No table listings found</div>
          ) : listings.map((l: any) => (
            <div key={l.id} className="bg-white rounded-xl border p-5 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900">{l.name ?? `Table ${l.tableNumber}`}</h3>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${l.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {l.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="text-sm text-gray-500 space-y-1">
                <div>Category: <strong>{l.category ?? '—'}</strong></div>
                <div>Capacity: <strong>{l.capacity ?? '—'}</strong></div>
                <div>Min Spend: <strong>₦{Number(l.minimumSpend ?? 0).toLocaleString()}</strong></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Booking ID','Guest','Guests','Status','Amount','Created'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No bookings found</td></tr>
              ) : bookings.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{b.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    {b.metadata?.guestName ?? (b.user ? `${b.user.firstName} ${b.user.lastName}` : '—')}
                    {b.metadata?.isWalkIn && <span className="ml-1 text-xs bg-orange-100 text-orange-700 px-1.5 rounded">Walk-in</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{b.guestCount ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">₦{Number(b.totalAmount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showWalkIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Walk-in Booking</h3>
              <button onClick={() => setShowWalkIn(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Table</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={walkInForm.tableId}
                  onChange={e => setWalkInForm(f => ({ ...f, tableId: e.target.value }))}>
                  <option value="">Select a table...</option>
                  {listings.map((l: any) => (
                    <option key={l.id} value={l.id}>{l.name ?? `Table ${l.tableNumber}`}</option>
                  ))}
                </select>
              </div>
              {([
                { label: 'Guest Name',        key: 'guestName',  type: 'text'   },
                { label: 'Party Size',        key: 'guestCount', type: 'number' },
                { label: 'Notes (optional)',  key: 'notes',      type: 'text'   },
              ] as const).map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type={type}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={(walkInForm as any)[key]}
                    onChange={e => setWalkInForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <p className="text-xs text-gray-400 pt-1">
                Just seats the guest — log their purchases afterwards from the Orders page.
              </p>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowWalkIn(false)}
                  className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600">Cancel</button>
                <button onClick={handleWalkIn} disabled={submitting || !walkInForm.tableId || !walkInForm.guestName}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {submitting ? 'Creating...' : 'Create Walk-in'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateListing && (
        <Modal title="Add Table Listing" onClose={() => setShowCreateListing(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Venue</label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={listingForm.venueId}
                onChange={e => setListingForm(f => ({ ...f, venueId: e.target.value }))}>
                <option value="">Select a venue...</option>
                {venues.length === 0 && <option value="" disabled>No venues found - create one first</option>}
                {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            {([
              { label: 'Table Name',     key: 'name',       type: 'text'   },
              { label: 'Capacity',       key: 'capacity',   type: 'number' },
              { label: 'Min Spend (₦)',  key: 'price',      type: 'number' },
            ] as const).map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input type={type}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={(listingForm as any)[key]}
                  onChange={e => setListingForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={listingForm.category}
                onChange={e => setListingForm(f => ({ ...f, category: e.target.value }))}>
                <option value="standard">Standard</option>
                <option value="vip">VIP</option>
                <option value="vvip">VVIP</option>
                <option value="booth">Booth</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
              <textarea rows={2}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={listingForm.description}
                onChange={e => setListingForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Features (comma-separated, optional)</label>
              <input type="text" placeholder="e.g. Bottle service, Dance floor view"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={listingForm.features}
                onChange={e => setListingForm(f => ({ ...f, features: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreateListing(false)}
                className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600">Cancel</button>
              <button onClick={handleCreateListing} disabled={submitting}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {submitting ? 'Creating...' : 'Create Table'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
