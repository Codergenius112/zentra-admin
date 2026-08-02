'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';
import type { CarListing, Booking } from '@/types';
import MediaUpload from '@/components/MediaUpload';
import Image from 'next/image';
import useUIStore from '@/store/ui.store';

const CAUTION_COLORS: Record<string, string> = {
  HELD:      'bg-yellow-100 text-yellow-800',
  REFUNDED:  'bg-green-100 text-green-700',
  FORFEITED: 'bg-red-100 text-red-700',
};

const emptyCarForm = {
  make: '', model: '', year: '', color: '', plateNumber: '',
  transmission: 'automatic', category: 'sedan', seats: '', pricePerDay: '',
  cautionFee: '0', description: '', features: '',
  city: '', state: '', withDriver: false,
};

export default function CarsPage() {
  const addToast = useUIStore(s => s.addToast);
  const [tab, setTab]               = useState<'listings' | 'bookings'>('listings');
  const [listings, setListings]     = useState<CarListing[]>([]);
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [form, setForm]             = useState(emptyCarForm);
  const [imageUrls, setImageUrls]   = useState<string[]>([]);
  const [saving, setSaving]         = useState(false);
  const [cautionAction, setCautionAction] = useState<{ booking: Booking; type: 'refund' | 'forfeit' } | null>(null);
  const [cautionLoading, setCautionLoading] = useState(false);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.cars.listings({ limit: 50 }) as any;
      setListings(res.data?.data ?? res.listings ?? res.data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.cars.bookings({ limit: 100 }) as any;
      setBookings(res.data?.data ?? res.data ?? []);
      setTotal(res.data?.total ?? res.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { tab === 'listings' ? fetchListings() : fetchBookings(); }, [tab]);

  const handleCreate = async () => {
    if (!form.make || !form.model || !form.year || !form.pricePerDay || !form.city) {
      addToast('Please fill in make, model, year, price, and city.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await apiClient.cars.createListing({
        make: form.make,
        model: form.model,
        year: Number(form.year),
        color: form.color || 'N/A',
        plateNumber: form.plateNumber || 'N/A',
        transmission: form.transmission,
        category: form.category,
        seats: Number(form.seats) || 5,
        pricePerDay: Number(form.pricePerDay),
        cautionFee: Number(form.cautionFee) || 0,
        cautionFeeRefundable: true,
        description: form.description || '',
        features: form.features ? form.features.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        images: imageUrls,
        city: form.city,
        state: form.state || form.city,
        withDriver: form.withDriver,
      });
      setShowAdd(false);
      setForm(emptyCarForm);
      setImageUrls([]);
      fetchListings();
      addToast('Car listing created', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to create car listing', 'error');
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

  const upd = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cars</h1>
          <p className="text-gray-500 text-sm mt-1">
            {tab === 'bookings' ? `${total} car rentals` : `${listings.length} fleet listings`}
          </p>
        </div>
        <div className="flex gap-2">
          {(['listings', 'bookings'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                tab === t ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}>
              {t === 'listings' ? '🚗 Fleet' : '📋 Rentals'}
            </button>
          ))}
          {tab === 'listings' && (
            <button onClick={() => setShowAdd(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">
              + Add Car
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
            <div className="col-span-3 text-center py-20 text-gray-400">No cars in fleet. Click "+ Add Car" to create one.</div>
          ) : listings.map(l => (
            <div key={l.id} className="bg-white rounded-xl border p-5 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900">{l.year} {l.make} {l.model}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${l.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {l.isActive ? 'Available' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{l.color} · {l.plateNumber} · {l.transmission}</p>
              {l.images?.length > 0 && (
                <div className="mb-3 overflow-hidden rounded-lg border bg-gray-100">
                  {l.images[0].match(/\.(mp4|mov|avi|mkv)$/i) ? (
                    <video src={l.images[0]} controls className="w-full h-28 object-cover" />
                  ) : (
                    <div className="relative w-full h-28">
                      <Image src={l.images[0]} alt={`${l.make} ${l.model}`} fill className="object-cover" />
                    </div>
                  )}
                </div>
              )}
              <div className="text-sm text-gray-700 space-y-1">
                <div>₦{Number(l.pricePerDay).toLocaleString()} / day · {l.seats} seats</div>
                <div>{l.city}, {l.state}{l.withDriver ? ' · With Driver' : ''}</div>
                {l.cautionFee > 0 && (
                  <div className="text-orange-600">Caution: ₦{Number(l.cautionFee).toLocaleString()}</div>
                )}
                {l.features?.length > 0 && (
                  <div className="text-xs text-gray-400 mt-2">{l.features.slice(0, 4).join(', ')}{l.features.length > 4 ? '...' : ''}</div>
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
                {['Booking','Customer','Status','Caution Fee','Total','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No rentals found</td></tr>
              ) : bookings.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{b.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    {b.user ? `${b.user.firstName} ${b.user.lastName}` : b.userId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{b.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {b.cautionFeeAmount > 0
                      ? <span className={`text-xs px-2 py-1 rounded-full font-medium ${CAUTION_COLORS[b.cautionFeeStatus]}`}>
                          ₦{Number(b.cautionFeeAmount).toLocaleString()} · {b.cautionFeeStatus}
                        </span>
                      : <span className="text-xs text-gray-400">None</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">₦{Number(b.totalAmount).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {b.status === 'COMPLETED' && b.cautionFeeStatus === 'HELD' && b.cautionFeeAmount > 0 && (
                      <div className="flex gap-1">
                        <button onClick={() => setCautionAction({ booking: b, type: 'refund' })}
                          className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">Refund</button>
                        <button onClick={() => setCautionAction({ booking: b, type: 'forfeit' })}
                          className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded font-medium">Forfeit</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Car Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-800">Add Car to Fleet</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Make *</label>
                  <input value={form.make} onChange={upd('make')} placeholder="Toyota"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Model *</label>
                  <input value={form.model} onChange={upd('model')} placeholder="Camry"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Year *</label>
                  <input type="number" value={form.year} onChange={upd('year')} placeholder="2023"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                  <input value={form.color} onChange={upd('color')} placeholder="White"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Plate No.</label>
                  <input value={form.plateNumber} onChange={upd('plateNumber')} placeholder="LAG-123-AA"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Transmission</label>
                  <select value={form.transmission} onChange={upd('transmission')}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="automatic">Automatic</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <select value={form.category} onChange={upd('category')}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="luxury">Luxury</option>
                    <option value="van">Van</option>
                    <option value="truck">Truck</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Seats</label>
                  <input type="number" value={form.seats} onChange={upd('seats')} placeholder="5"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Price/Day (₦) *</label>
                  <input type="number" value={form.pricePerDay} onChange={upd('pricePerDay')} placeholder="25000"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">City *</label>
                  <input value={form.city} onChange={upd('city')} placeholder="Lagos"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
                  <input value={form.state} onChange={upd('state')} placeholder="Lagos"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Caution Fee (₦)</label>
                  <input type="number" value={form.cautionFee} onChange={upd('cautionFee')} placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.withDriver} onChange={upd('withDriver')} className="rounded" />
                    <span className="text-sm text-gray-700">Comes with driver</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea value={form.description} onChange={upd('description')} rows={2} placeholder="Describe the car..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Features (comma-separated)</label>
                <input value={form.features} onChange={upd('features')} placeholder="AC, Bluetooth, GPS, Sunroof"
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
                {saving ? 'Creating...' : 'Add Car'}
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
                ? `Return ₦${Number(cautionAction.booking.cautionFeeAmount).toLocaleString()} to customer's wallet.`
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
