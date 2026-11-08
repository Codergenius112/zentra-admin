'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';
import type { JetListing, Booking } from '@/types';
import MediaUpload from '@/components/MediaUpload';
import Image from 'next/image';
import useUIStore from '@/store/ui.store';

const CATEGORIES = [
  { label: 'All Aircraft', value: 'ALL' },
  { label: 'Heavy Jets', value: 'HEAVY_JET' },
  { label: 'Midsize Jets', value: 'MIDSIZE_JET' },
  { label: 'Light Jets', value: 'LIGHT_JET' },
  { label: 'Helicopters', value: 'HELICOPTER' },
];

const CAUTION_COLORS: Record<string, string> = {
  HELD: 'bg-yellow-100 text-yellow-800',
  REFUNDED: 'bg-green-100 text-green-700',
  FORFEITED: 'bg-red-100 text-red-700',
};

const emptyJetForm = {
  name: '',
  model: '',
  manufacturer: '',
  category: 'MIDSIZE_JET',
  tailNumber: '',
  capacity: '8',
  rangeNauticalMiles: '',
  cruisingSpeedKnots: '',
  pricePerHour: '',
  cautionFee: '',
  baseAirport: 'LOS - Murtala Muhammed International',
  city: 'Lagos',
  country: 'Nigeria',
  description: '',
  features: 'Wi-Fi, Flight Attendant, Enclosed Lavatory',
  amenities: 'Champagne Service, Luxury Club Seating',
};

export default function JetsPage() {
  const addToast = useUIStore((s) => s.addToast);
  const [tab, setTab] = useState<'listings' | 'bookings'>('listings');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [listings, setListings] = useState<JetListing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyJetForm);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [cautionAction, setCautionAction] = useState<{ booking: Booking; type: 'refund' | 'forfeit' } | null>(null);
  const [cautionLoading, setCautionLoading] = useState(false);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = (await apiClient.jets.listings({
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        limit: 50,
      })) as any;
      setListings(res.data?.data ?? res.listings ?? res.data ?? []);
    } catch (e) {
      console.error(e);
      addToast('Failed to load aircraft fleet', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = (await apiClient.jets.bookings({ limit: 100 })) as any;
      setBookings(res.data?.data ?? res.data ?? []);
      setTotal(res.data?.total ?? res.total ?? 0);
    } catch (e) {
      console.error(e);
      addToast('Failed to load charter bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'listings') {
      fetchListings();
    } else {
      fetchBookings();
    }
  }, [tab, selectedCategory]);

  const handleCreate = async () => {
    if (!form.name || !form.model || !form.tailNumber || !form.pricePerHour || !form.baseAirport) {
      addToast('Please complete name, model, tail number, price, and base airport.', 'warning');
      return;
    }
    if (imageUrls.length === 0) {
      addToast('Please upload at least one aircraft photo.', 'warning');
      return;
    }

    setSaving(true);
    try {
      await apiClient.jets.createListing({
        name: form.name,
        model: form.model,
        manufacturer: form.manufacturer || form.name.split(' ')[0],
        category: form.category,
        tailNumber: form.tailNumber,
        capacity: Number(form.capacity) || 8,
        rangeNauticalMiles: form.rangeNauticalMiles ? Number(form.rangeNauticalMiles) : undefined,
        cruisingSpeedKnots: form.cruisingSpeedKnots ? Number(form.cruisingSpeedKnots) : undefined,
        pricePerHour: Number(form.pricePerHour),
        cautionFee: form.cautionFee ? Number(form.cautionFee) : Math.round(Number(form.pricePerHour) * 0.15),
        cautionFeeRefundable: true,
        baseAirport: form.baseAirport,
        city: form.city,
        country: form.country || 'Nigeria',
        description: form.description || 'Luxury private aviation charter.',
        features: form.features ? form.features.split(',').map((s) => s.trim()).filter(Boolean) : [],
        amenities: form.amenities ? form.amenities.split(',').map((s) => s.trim()).filter(Boolean) : [],
        images: imageUrls,
      });

      setShowAdd(false);
      setForm(emptyJetForm);
      setImageUrls([]);
      fetchListings();
      addToast('Aircraft listing created successfully', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to create aircraft listing', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCautionFee = async () => {
    if (!cautionAction) return;
    setCautionLoading(true);
    try {
      if (cautionAction.type === 'refund') {
        await apiClient.post(`/admin/bookings/${cautionAction.booking.id}/refund-caution-fee`);
        addToast('Caution fee refunded to client wallet', 'success');
      } else {
        await apiClient.post(`/admin/bookings/${cautionAction.booking.id}/forfeit-caution-fee`, {
          reason: 'Charter damages / flight extension fee',
        });
        addToast('Caution fee forfeited', 'warning');
      }
      setCautionAction(null);
      fetchBookings();
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Caution fee action failed', 'error');
    } finally {
      setCautionLoading(false);
    }
  };

  const toggleListingActive = async (jet: JetListing) => {
    try {
      await apiClient.jets.updateListing(jet.id, { isActive: !jet.isActive });
      addToast(`Aircraft listing ${jet.isActive ? 'paused' : 'activated'}`, 'success');
      fetchListings();
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to update listing', 'error');
    }
  };

  const deleteListing = async (jet: JetListing) => {
    if (!confirm(`Are you sure you want to remove ${jet.name} (${jet.tailNumber})?`)) return;
    try {
      await apiClient.jets.deleteListing(jet.id);
      addToast('Aircraft removed from fleet', 'success');
      fetchListings();
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to delete listing', 'error');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>✈️</span> Private Jets & Helicopters
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage your aviation charter fleet, luxury helicopters, and client flight bookings.
          </p>
        </div>
        {tab === 'listings' && (
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2"
          >
            <span>+</span> Add Aircraft
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-6">
        <button
          onClick={() => setTab('listings')}
          className={`pb-3 text-sm font-semibold transition border-b-2 -mb-px ${
            tab === 'listings'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Fleet Listings ({listings.length})
        </button>
        <button
          onClick={() => setTab('bookings')}
          className={`pb-3 text-sm font-semibold transition border-b-2 -mb-px ${
            tab === 'bookings'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Charter Bookings ({total})
        </button>
      </div>

      {/* LISTINGS TAB */}
      {tab === 'listings' && (
        <>
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  selectedCategory === cat.value
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-20 text-gray-400">Loading aircraft fleet...</div>
          ) : listings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300 p-8">
              <span className="text-4xl mb-3 block">🛩️</span>
              <p className="text-gray-800 font-semibold mb-1">No aircraft in this fleet yet</p>
              <p className="text-gray-500 text-sm mb-4">Add your first jet or helicopter listing to begin accepting charter bookings.</p>
              <button
                onClick={() => setShowAdd(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition"
              >
                + Add Aircraft
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((jet) => (
                <div
                  key={jet.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col"
                >
                  {/* Photo Banner */}
                  <div className="relative h-48 bg-gray-900">
                    {jet.images?.[0] ? (
                      <Image
                        src={jet.images[0]}
                        alt={jet.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">No Photo</div>
                    )}
                    <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md text-amber-400 text-xs font-semibold px-2.5 py-1 rounded-md">
                      {jet.category?.replace('_', ' ')}
                    </div>
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/75 backdrop-blur-md text-xs px-2.5 py-1 rounded-md font-mono text-white">
                      {jet.tailNumber}
                    </div>
                    {!jet.isActive && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                        <span className="bg-red-500 text-white font-bold px-3 py-1 rounded-md text-xs tracking-wide uppercase">
                          Inactive
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{jet.name}</h3>
                      <p className="text-gray-500 text-xs mb-3">{jet.manufacturer} • {jet.model}</p>

                      <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-gray-100 mb-3 text-center">
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase tracking-wider">Seats</div>
                          <div className="text-sm font-semibold text-gray-800">{jet.capacity} pax</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase tracking-wider">Speed</div>
                          <div className="text-sm font-semibold text-gray-800">{jet.cruisingSpeedKnots ?? 450} kts</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase tracking-wider">Range</div>
                          <div className="text-sm font-semibold text-gray-800">{jet.rangeNauticalMiles ?? '—'} nm</div>
                        </div>
                      </div>

                      <div className="text-xs text-gray-600 space-y-1 mb-4">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-gray-400">🛫 Base:</span>
                          <span className="font-medium truncate">{jet.baseAirport}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400">📍 Location:</span>
                          <span>{jet.city}, {jet.country}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between mb-4">
                        <div>
                          <span className="text-xs text-gray-400 block">Charter Rate</span>
                          <span className="text-lg font-bold text-amber-700">
                            ₦{Number(jet.pricePerHour).toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-400"> / hour</span>
                        </div>
                        {jet.cautionFee > 0 && (
                          <div className="text-right">
                            <span className="text-[10px] text-gray-400 block">Caution Fee</span>
                            <span className="text-xs font-semibold text-gray-600">
                              ₦{Number(jet.cautionFee).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => toggleListingActive(jet)}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition ${
                            jet.isActive
                              ? 'border-gray-200 text-gray-700 hover:bg-gray-50'
                              : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                          }`}
                        >
                          {jet.isActive ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          onClick={() => deleteListing(jet)}
                          className="py-1.5 px-3 rounded-lg text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* BOOKINGS TAB */}
      {tab === 'bookings' && (
        <>
          {loading ? (
            <div className="text-center py-20 text-gray-400">Loading charter bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <span className="text-3xl mb-2 block">📋</span>
              <p className="text-gray-600 font-medium">No jet charter bookings yet</p>
              <p className="text-gray-400 text-xs mt-1">Bookings made via the mobile app or web will show here.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Booking</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Aircraft & Route</th>
                      <th className="py-3 px-4">Flight Date & Pax</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Caution Fee</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {bookings.map((b) => {
                      const m = b.metadata || {};
                      return (
                        <tr key={b.id} className="hover:bg-gray-50/50 transition">
                          <td className="py-3.5 px-4 font-mono text-xs text-gray-500">
                            #{b.id.slice(0, 8)}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-gray-900">
                              {b.user ? `${b.user.firstName} ${b.user.lastName}` : (m.contactName || 'Guest Client')}
                            </div>
                            <div className="text-xs text-gray-400">{b.user?.email || m.contactPhone || '—'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-gray-900">{m.aircraftName || 'Private Jet'}</div>
                            <div className="text-xs text-amber-700 font-medium">
                              {m.departureAirport || 'LOS'} → {m.arrivalAirport || 'ABV'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            <div className="font-medium text-gray-800">{m.departureDate || '—'} at {m.departureTime || '10:00'}</div>
                            <div className="text-gray-400">{m.passengerCount || b.guestCount || 1} passenger(s) • {m.tripType || 'ONE_WAY'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-900">
                              ₦{Number(b.totalAmount).toLocaleString()}
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              b.paymentStatus === 'FULLY_PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {b.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            {m.cautionFee ? (
                              <div>
                                <div className="font-semibold">₦{Number(m.cautionFee).toLocaleString()}</div>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  CAUTION_COLORS[b.cautionFeeStatus || 'HELD'] || 'bg-gray-100 text-gray-600'
                                }`}>
                                  {b.cautionFeeStatus || 'HELD'}
                                </span>
                                {(!b.cautionFeeStatus || b.cautionFeeStatus === 'HELD') && b.status === 'COMPLETED' && (
                                  <div className="flex gap-2 mt-1">
                                    <button
                                      onClick={() => setCautionAction({ booking: b, type: 'refund' })}
                                      className="text-green-600 hover:underline text-[11px]"
                                    >
                                      Refund
                                    </button>
                                    <button
                                      onClick={() => setCautionAction({ booking: b, type: 'forfeit' })}
                                      className="text-red-600 hover:underline text-[11px]"
                                    >
                                      Forfeit
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                              b.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                              b.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                              b.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* CREATE AIRCRAFT MODAL */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>✈️</span> Add Aircraft to Fleet
              </h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Media Upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Aircraft Photos</label>
                <MediaUpload onUploadComplete={(urls) => setImageUrls(urls)} maxFiles={5} />
              </div>

              {/* Basic Specs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Aircraft Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Gulfstream G650ER"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Model *</label>
                  <input
                    type="text"
                    placeholder="e.g. G650ER"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="HEAVY_JET">Heavy Jet</option>
                    <option value="MIDSIZE_JET">Midsize Jet</option>
                    <option value="LIGHT_JET">Light Jet</option>
                    <option value="HELICOPTER">Helicopter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tail Number *</label>
                  <input
                    type="text"
                    placeholder="5N-ZEN"
                    value={form.tailNumber}
                    onChange={(e) => setForm({ ...form, tailNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max Capacity (Seats) *</label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Pricing & Performance */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Charter Rate / Hour (₦) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 4500000"
                    value={form.pricePerHour}
                    onChange={(e) => setForm({ ...form, pricePerHour: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Caution Fee (₦)</label>
                  <input
                    type="number"
                    placeholder="e.g. 500000"
                    value={form.cautionFee}
                    onChange={(e) => setForm({ ...form, cautionFee: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cruising Speed (Knots)</label>
                  <input
                    type="number"
                    placeholder="e.g. 516"
                    value={form.cruisingSpeedKnots}
                    onChange={(e) => setForm({ ...form, cruisingSpeedKnots: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Flight Range (Nautical Miles)</label>
                  <input
                    type="number"
                    placeholder="e.g. 7500"
                    value={form.rangeNauticalMiles}
                    onChange={(e) => setForm({ ...form, rangeNauticalMiles: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Base Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Base Airport *</label>
                  <input
                    type="text"
                    placeholder="LOS - Murtala Muhammed International"
                    value={form.baseAirport}
                    onChange={(e) => setForm({ ...form, baseAirport: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">City *</label>
                  <input
                    type="text"
                    placeholder="Lagos"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Description & Features */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the aircraft cabin, configuration, and onboard luxury experience..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Features (comma-separated)</label>
                <input
                  type="text"
                  placeholder="Ka-Band Wi-Fi, Full Galley, Private Stateroom"
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amenities (comma-separated)</label>
                <input
                  type="text"
                  placeholder="Champagne Service, Fine Crystal, VIP Chauffeur"
                  value={form.amenities}
                  onChange={(e) => setForm({ ...form, amenities: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-100 mt-5">
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
              >
                {saving ? 'Creating...' : 'Save Aircraft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAUTION ACTION MODAL */}
      {cautionAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-base font-bold text-gray-900 mb-2">
              {cautionAction.type === 'refund' ? 'Refund Caution Fee' : 'Forfeit Caution Fee'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {cautionAction.type === 'refund'
                ? `Refund ₦${Number(cautionAction.booking.metadata?.cautionFee ?? 0).toLocaleString()} to customer's wallet?`
                : `Forfeit ₦${Number(cautionAction.booking.metadata?.cautionFee ?? 0).toLocaleString()} caution fee due to flight overtime or damages?`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCautionAction(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCautionFee}
                disabled={cautionLoading}
                className={`px-4 py-2 text-sm text-white rounded-lg font-medium ${
                  cautionAction.type === 'refund' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {cautionLoading ? 'Processing...' : cautionAction.type === 'refund' ? 'Confirm Refund' : 'Confirm Forfeit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
