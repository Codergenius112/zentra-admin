'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';
import type { ApartmentListing, Booking } from '@/types';
import MediaUpload from '@/components/MediaUpload';
import Image from 'next/image';
import useUIStore from '@/store/ui.store';

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-blue-100 text-blue-800',
  ACTIVE:    'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
};

const CAUTION_COLORS: Record<string, string> = {
  HELD:      'bg-yellow-100 text-yellow-800',
  REFUNDED:  'bg-green-100 text-green-700',
  FORFEITED: 'bg-red-100 text-red-700',
};

const emptyAptForm = {
  name: '', description: '', address: '', city: '', state: '',
  pricePerNight: '', bedrooms: '', bathrooms: '', maxGuests: '',
  cautionFee: '0', houseRules: '', amenities: '',
};

export default function ApartmentsPage() {
  const addToast = useUIStore(s => s.addToast);
  const [tab, setTab]               = useState<'listings' | 'bookings'>('listings');
  const [listings, setListings]     = useState<ApartmentListing[]>([]);
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [form, setForm]             = useState(emptyAptForm);
  const [imageUrls, setImageUrls]   = useState<string[]>([]);
  const [saving, setSaving]         = useState(false);
  const [cautionAction, setCautionAction] = useState<{ booking: Booking; type: 'refund' | 'forfeit' } | null>(null);
  const [cautionLoading, setCautionLoading] = useState(false);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.apartments.listings({ limit: 50 }) as any;
      setListings(res.data?.data ?? res.listings ?? res.data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.apartments.bookings({ limit: 100 }) as any;
      setBookings(res.data?.data ?? res.data ?? []);
      setTotal(res.data?.total ?? res.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { tab === 'listings' ? fetchListings() : fetchBookings(); }, [tab]);

  const handleCreate = async () => {
    if (!form.name || !form.address || !form.city || !form.pricePerNight) {
      addToast('Please fill in name, address, city, and price.', 'warning');
      return;
    }
    if (imageUrls.length === 0) {
      addToast('Upload at least one image before creating a listing', 'warning');
      return;
    }
    setSaving(true);
    try {
      await apiClient.apartments.createListing({
        name: form.name,
        description: form.description,
        address: form.address,
        city: form.city,
        state: form.state || form.city,
        pricePerNight: Number(form.pricePerNight),
        bedrooms: Number(form.bedrooms) || 1,
        bathrooms: Number(form.bathrooms) || 1,
        maxGuests: Number(form.maxGuests) || 2,
        cautionFee: Number(form.cautionFee) || 0,
        cautionFeeRefundable: true,
        houseRules: form.houseRules || undefined,
        amenities: form.amenities ? form.amenities.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        images: imageUrls,
      });
      setShowAdd(false);
      setForm(emptyAptForm);
      setImageUrls([]);
      fetchListings();
      addToast('Apartment listing created', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to create listing', 'error');
    } finally { setSaving(false); }
  };

  const handleCautionFee = async () => {
    if (!cautionAction) return;
    setCautionLoading(true);
    try {
      cautionAction.type === 'refund'
        ? await apiClient.bookings.refundCautionFee(cautionAction.booking.id)
        : await apiClient.bookings.forfeitCautionFee(cautionAction.booking.id);
      setCautionAction(null);
      fetchBookings();
      addToast(`Caution fee ${cautionAction.type === 'refund' ? 'refunded' : 'forfeited'}`, 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Action failed', 'error');
    } finally { setCautionLoading(false); }
  };

  const upd = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Apartments</h1>
          <p className="text-gray-500 text-sm mt-1">
            {tab === 'bookings' ? `${total} apartment bookings` : `${listings.length} apartment listings`}
          </p>
        </div>
        <div className="flex gap-2">
          {(['listings', 'bookings'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                tab === t ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}>
              {t === 'listings' ? '🏠 Listings' : '📋 Bookings'}
            </button>
          ))}
          {tab === 'listings' && (
            <button onClick={() => setShowAdd(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">
              + Add Apartment
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading...</div>
      ) : tab === 'listings' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {listings.length === 0 ? (
            <div className="col-span-3 text-center py-20 text-gray-400">No apartment listings found. Click "+ Add Apartment" to create one.</div>
          ) : listings.map(l => (
            <div key={l.id} className="bg-white rounded-xl border p-5 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900">{l.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${l.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {l.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{l.city}, {l.state}</p>
              {l.images?.length > 0 && (
                <div className="mb-3 overflow-hidden rounded-lg border bg-gray-100">
                  {l.images[0].match(/\.(mp4|mov|avi|mkv)$/i) ? (
                    <video src={l.images[0]} controls className="w-full h-28 object-cover" />
                  ) : (
                    <div className="relative w-full h-28">
                      <Image src={l.images[0]} alt={l.name} fill className="object-cover" />
                    </div>
                  )}
                </div>
              )}
              <div className="text-sm text-gray-700 space-y-1">
                <div>₦{Number(l.pricePerNight).toLocaleString()} / night</div>
                <div>{l.bedrooms} bed · {l.bathrooms} bath · {l.maxGuests} guests</div>
                {l.cautionFee > 0 && (
                  <div className="text-orange-600">Caution: ₦{Number(l.cautionFee).toLocaleString()}</div>
                )}
                {l.amenities?.length > 0 && (
                  <div className="text-xs text-gray-400 mt-2">{l.amenities.slice(0, 5).join(', ')}{l.amenities.length > 5 ? '...' : ''}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Booking','Guest','Status','Caution Fee','Total','Actions'].map(h => (
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
                    {b.user ? `${b.user.firstName} ${b.user.lastName}` : b.userId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {b.cautionFeeAmount > 0 ? (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${CAUTION_COLORS[b.cautionFeeStatus]}`}>
                        ₦{Number(b.cautionFeeAmount).toLocaleString()} · {b.cautionFeeStatus}
                      </span>
                    ) : <span className="text-xs text-gray-400">None</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">₦{Number(b.totalAmount).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {b.status === 'COMPLETED' && b.cautionFeeStatus === 'HELD' && b.cautionFeeAmount > 0 && (
                      <div className="flex gap-1">
                        <button onClick={() => setCautionAction({ booking: b, type: 'refund' })}
                          className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium">Refund</button>
                        <button onClick={() => setCautionAction({ booking: b, type: 'forfeit' })}
                          className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium">Forfeit</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Apartment Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-800">Add Apartment Listing</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input value={form.name} onChange={upd('name')} placeholder="e.g. Lekki Heights Suite"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea value={form.description} onChange={upd('description')} rows={3} placeholder="Describe the apartment..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address *</label>
                  <input value={form.address} onChange={upd('address')} placeholder="14 Admiralty Way"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">City *</label>
                  <input value={form.city} onChange={upd('city')} placeholder="Lagos"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
                  <input value={form.state} onChange={upd('state')} placeholder="Lagos"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Price/Night (₦) *</label>
                  <input type="number" value={form.pricePerNight} onChange={upd('pricePerNight')} placeholder="45000"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bedrooms</label>
                  <input type="number" value={form.bedrooms} onChange={upd('bedrooms')} placeholder="2"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bathrooms</label>
                  <input type="number" value={form.bathrooms} onChange={upd('bathrooms')} placeholder="2"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max Guests</label>
                  <input type="number" value={form.maxGuests} onChange={upd('maxGuests')} placeholder="4"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Caution Fee (₦)</label>
                <input type="number" value={form.cautionFee} onChange={upd('cautionFee')} placeholder="0"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amenities (comma-separated)</label>
                <input value={form.amenities} onChange={upd('amenities')} placeholder="WiFi, AC, Smart TV, Kitchen, Pool"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">House Rules</label>
                <input value={form.houseRules} onChange={upd('houseRules')} placeholder="No smoking, no pets..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Images</label>
                <MediaUpload
                  onUploadComplete={setImageUrls}
                  existingUrls={imageUrls}
                  maxFiles={10}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Listing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Caution Fee Modal */}
      {cautionAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              {cautionAction.type === 'refund' ? '💚 Refund' : '🔴 Forfeit'} Caution Fee
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              {cautionAction.type === 'refund'
                ? `Return ₦${Number(cautionAction.booking.cautionFeeAmount).toLocaleString()} to the customer's wallet.`
                : `Permanently forfeit ₦${Number(cautionAction.booking.cautionFeeAmount).toLocaleString()}.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setCautionAction(null)}
                className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600">Cancel</button>
              <button onClick={handleCautionFee} disabled={cautionLoading}
                className={`flex-1 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 ${cautionAction.type === 'refund' ? 'bg-green-600' : 'bg-red-500'}`}>
                {cautionLoading ? '...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
