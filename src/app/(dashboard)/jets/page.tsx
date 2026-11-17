'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';
import type { JetListing, Booking } from '@/types';
import MediaUpload from '@/components/MediaUpload';
import Image from 'next/image';
import useUIStore from '@/store/ui.store';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: 'All Aircraft', value: 'ALL' },
  { label: 'Heavy Jets',   value: 'HEAVY_JET' },
  { label: 'Midsize Jets', value: 'MIDSIZE_JET' },
  { label: 'Light Jets',   value: 'LIGHT_JET' },
  { label: 'Helicopters',  value: 'HELICOPTER' },
];

const CATEGORY_LABELS: Record<string, string> = {
  HEAVY_JET:   'Heavy Jet',
  MIDSIZE_JET: 'Midsize Jet',
  LIGHT_JET:   'Light Jet',
  HELICOPTER:  'Helicopter',
};

const CAUTION_COLORS: Record<string, string> = {
  HELD:      'bg-yellow-100 text-yellow-800',
  REFUNDED:  'bg-green-100 text-green-700',
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

type JetForm = typeof emptyJetForm;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formToPayload(form: JetForm, imageUrls: string[]) {
  return {
    name:                form.name.trim(),
    model:               form.model.trim(),
    manufacturer:        form.manufacturer.trim() || form.name.split(' ')[0],
    category:            form.category,
    tailNumber:          form.tailNumber.trim().toUpperCase(),
    capacity:            Number(form.capacity) || 8,
    rangeNauticalMiles:  form.rangeNauticalMiles  ? Number(form.rangeNauticalMiles)  : undefined,
    cruisingSpeedKnots:  form.cruisingSpeedKnots  ? Number(form.cruisingSpeedKnots)  : undefined,
    pricePerHour:        Number(form.pricePerHour),
    cautionFee:          form.cautionFee ? Number(form.cautionFee) : Math.round(Number(form.pricePerHour) * 0.15),
    cautionFeeRefundable: true,
    baseAirport:         form.baseAirport.trim(),
    city:                form.city.trim(),
    country:             form.country.trim() || 'Nigeria',
    description:         form.description.trim() || 'Luxury private aviation charter.',
    features:            form.features  ? form.features.split(',').map((s) => s.trim()).filter(Boolean)  : [],
    amenities:           form.amenities ? form.amenities.split(',').map((s) => s.trim()).filter(Boolean) : [],
    images:              imageUrls,
  };
}

function listingToForm(j: JetListing): JetForm {
  return {
    name:               j.name,
    model:              j.model,
    manufacturer:       j.manufacturer,
    category:           j.category,
    tailNumber:         j.tailNumber,
    capacity:           String(j.capacity),
    rangeNauticalMiles: j.rangeNauticalMiles != null ? String(j.rangeNauticalMiles) : '',
    cruisingSpeedKnots: j.cruisingSpeedKnots != null ? String(j.cruisingSpeedKnots) : '',
    pricePerHour:       String(j.pricePerHour),
    cautionFee:         String(j.cautionFee),
    baseAirport:        j.baseAirport,
    city:               j.city,
    country:            j.country,
    description:        j.description,
    features:           Array.isArray(j.features)  ? j.features.join(', ')  : '',
    amenities:          Array.isArray(j.amenities) ? j.amenities.join(', ') : '',
  };
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

function JetFormModal({
  mode,
  form,
  setForm,
  imageUrls,
  setImageUrls,
  saving,
  onSave,
  onClose,
}: {
  mode: 'add' | 'edit';
  form: JetForm;
  setForm: (f: JetForm) => void;
  imageUrls: string[];
  setImageUrls: (u: string[]) => void;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
})
// eslint-disable-next-line no-unexpected-multiline
 {
  const f = (key: keyof JetForm) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm({ ...form, [key]: e.target.value }),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-3xl w-full shadow-xl my-8">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {mode === 'add' ? '✈️ Add Aircraft to Fleet' : '✏️ Edit Aircraft Listing'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">
            ×
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Aircraft Photos */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Aircraft Photos {mode === 'add' && <span className="text-red-500">*</span>}
            </label>
            <MediaUpload
              onUploadComplete={(urls) => setImageUrls([...imageUrls, ...urls])}
              existingUrls={imageUrls}
              maxFiles={8}
            />
          </div>

          {/* Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Aircraft Name *</label>
              <input {...f('name')} placeholder="e.g. Bombardier Global 7500" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Model *</label>
              <input {...f('model')} placeholder="e.g. Global 7500" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Manufacturer</label>
              <input {...f('manufacturer')} placeholder="e.g. Bombardier" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tail Number *</label>
              <input {...f('tailNumber')} placeholder="e.g. 5N-JET" className="w-full px-3 py-2 border rounded-lg text-sm font-mono" />
            </div>
          </div>

          {/* Category + Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Aircraft Category</label>
              <select {...f('category')} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                {CATEGORIES.filter((c) => c.value !== 'ALL').map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Passenger Capacity</label>
              <input {...f('capacity')} type="number" min="1" max="50" placeholder="8" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>

          {/* Performance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Range (Nautical Miles)</label>
              <input {...f('rangeNauticalMiles')} type="number" placeholder="7700" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cruising Speed (Knots)</label>
              <input {...f('cruisingSpeedKnots')} type="number" placeholder="516" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Price Per Hour (₦) *</label>
              <input {...f('pricePerHour')} type="number" min="0" placeholder="1500000" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Caution / Security Fee (₦)
                <span className="text-gray-400 font-normal ml-1">— auto 15% if blank</span>
              </label>
              <input {...f('cautionFee')} type="number" min="0" placeholder="Auto (15% of hourly rate)" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Base Airport *</label>
              <input {...f('baseAirport')} placeholder="LOS - Murtala Muhammed International" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">City *</label>
              <input {...f('city')} placeholder="Lagos" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
              <input {...f('country')} placeholder="Nigeria" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              rows={3}
              {...f('description')}
              placeholder="Describe the aircraft cabin, configuration, and onboard luxury experience..."
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          {/* Features & Amenities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Features (comma-separated)</label>
              <input {...f('features')} placeholder="Ka-Band Wi-Fi, Full Galley, Private Stateroom" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amenities (comma-separated)</label>
              <input {...f('amenities')} placeholder="Champagne Service, Fine Crystal, VIP Chauffeur" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
          >
            {saving
              ? mode === 'add' ? 'Creating...' : 'Saving...'
              : mode === 'add' ? 'Save Aircraft' : 'Update Aircraft'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function JetsPage() {
  const addToast = useUIStore((s) => s.addToast);

  const [tab, setTab] = useState<'listings' | 'bookings'>('listings');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const [listings, setListings] = useState<JetListing[]>([]);
  const [bookings, setBookings]  = useState<Booking[]>([]);
  const [total, setTotal]        = useState(0);
  const [loading, setLoading]    = useState(true);

  // Add modal
  const [showAdd, setShowAdd]    = useState(false);
  const [addForm, setAddForm]    = useState<JetForm>(emptyJetForm);
  const [addImages, setAddImages] = useState<string[]>([]);
  const [saving, setSaving]      = useState(false);

  // Edit modal
  const [editListing, setEditListing] = useState<JetListing | null>(null);
  const [editForm, setEditForm]       = useState<JetForm>(emptyJetForm);
  const [editImages, setEditImages]   = useState<string[]>([]);
  const [editSaving, setEditSaving]   = useState(false);

  // Caution fee modal
  const [cautionAction, setCautionAction] = useState<{ booking: Booking; type: 'refund' | 'forfeit' } | null>(null);
  const [cautionLoading, setCautionLoading] = useState(false);

  // ── Fetchers ────────────────────────────────────────────────────────────────

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = (await apiClient.jets.listings({
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        limit: 50,
      })) as any;
      // Backend returns { listings, total }
      const data = res?.listings ?? res?.data?.listings ?? res?.data?.data ?? res?.data ?? [];
      setListings(Array.isArray(data) ? data : []);
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
      const data  = res?.data?.data ?? res?.data?.bookings ?? res?.bookings ?? res?.data ?? [];
      const count = res?.data?.total ?? res?.total ?? 0;
      setBookings(Array.isArray(data) ? data : []);
      setTotal(count);
    } catch (e) {
      console.error(e);
      addToast('Failed to load charter bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'listings') fetchListings();
    else fetchBookings();
  }, [tab, selectedCategory]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!addForm.name || !addForm.model || !addForm.tailNumber || !addForm.pricePerHour || !addForm.baseAirport) {
      addToast('Please complete name, model, tail number, price, and base airport.', 'warning');
      return;
    }
    if (addImages.length === 0) {
      addToast('Please upload at least one aircraft photo.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await apiClient.jets.createListing(formToPayload(addForm, addImages));
      setShowAdd(false);
      setAddForm(emptyJetForm);
      setAddImages([]);
      fetchListings();
      addToast('Aircraft listing created successfully ✈️', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to create aircraft listing', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (jet: JetListing) => {
    setEditListing(jet);
    setEditForm(listingToForm(jet));
    setEditImages(jet.images ?? []);
  };

  const handleUpdate = async () => {
    if (!editListing) return;
    if (!editForm.name || !editForm.model || !editForm.tailNumber || !editForm.pricePerHour || !editForm.baseAirport) {
      addToast('Please complete name, model, tail number, price, and base airport.', 'warning');
      return;
    }
    setEditSaving(true);
    try {
      await apiClient.jets.updateListing(editListing.id, formToPayload(editForm, editImages));
      setEditListing(null);
      fetchListings();
      addToast('Aircraft listing updated successfully', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to update aircraft listing', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const toggleActive = async (jet: JetListing) => {
    try {
      await apiClient.jets.updateListing(jet.id, { isActive: !jet.isActive });
      addToast(`Aircraft ${jet.isActive ? 'paused' : 'activated'}`, 'success');
      fetchListings();
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to update listing', 'error');
    }
  };

  const handleDelete = async (jet: JetListing) => {
    if (!confirm(`Remove ${jet.name} (${jet.tailNumber}) from the fleet?`)) return;
    try {
      await apiClient.jets.deleteListing(jet.id);
      addToast('Aircraft removed from fleet', 'success');
      fetchListings();
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to remove aircraft', 'error');
    }
  };

  const handleCautionFee = async () => {
    if (!cautionAction) return;
    setCautionLoading(true);
    try {
      if (cautionAction.type === 'refund') {
        await (apiClient as any).post(`/admin/bookings/${cautionAction.booking.id}/refund-caution-fee`);
        addToast('Caution fee refunded to client wallet', 'success');
      } else {
        await (apiClient as any).post(`/admin/bookings/${cautionAction.booking.id}/forfeit-caution-fee`, {
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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>✈️</span> Private Jets &amp; Helicopters
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage your aviation charter fleet, luxury helicopters, and client flight bookings.
          </p>
        </div>
        {tab === 'listings' && (
          <button
            onClick={() => { setAddForm(emptyJetForm); setAddImages([]); setShowAdd(true); }}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2 whitespace-nowrap"
          >
            <span>+</span> Add Aircraft
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-gray-200 mb-6 gap-6">
        {(['listings', 'bookings'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-sm font-medium capitalize border-b-2 transition ${
              tab === t ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'listings' ? '✈️ Fleet' : '📋 Charter Bookings'}
            {t === 'bookings' && total > 0 && (
              <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Category Filter (listings tab) ── */}
      {tab === 'listings' && (
        <div className="flex gap-2 flex-wrap mb-5">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setSelectedCategory(c.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${
                selectedCategory === c.value
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
      )}

      {/* ══════════════════ LISTINGS TAB ══════════════════ */}
      {!loading && tab === 'listings' && (
        <>
          {listings.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-3">✈️</div>
              <p className="text-gray-500 text-sm">No aircraft in this category yet.</p>
              <button
                onClick={() => { setAddForm(emptyJetForm); setAddImages([]); setShowAdd(true); }}
                className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium"
              >
                Add First Aircraft
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {listings.map((jet) => (
                <div key={jet.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  {/* Image */}
                  <div className="relative h-44 bg-gray-100">
                    {jet.images?.[0] ? (
                      <Image src={jet.images[0]} alt={jet.name} fill className="object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-4xl text-gray-300">✈️</div>
                    )}
                    {/* Status badge */}
                    <span className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      jet.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {jet.isActive ? 'Active' : 'Paused'}
                    </span>
                    {/* Category badge */}
                    <span className="absolute top-2 left-2 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {CATEGORY_LABELS[jet.category] ?? jet.category}
                    </span>
                  </div>

                  <div className="p-4 flex flex-col flex-1">
                    {/* Name + Tail */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-gray-900 text-sm leading-tight">{jet.name}</h3>
                      <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded whitespace-nowrap">{jet.tailNumber}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{jet.manufacturer} · {jet.model}</p>

                    {/* Provider badge */}
                    {jet.businessId && (
                      <span className="inline-flex items-center gap-1 self-start mb-2 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                        🏢 {jet.businessId}
                      </span>
                    )}

                    {/* Specs row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                      <span>👥 {jet.capacity} pax</span>
                      {jet.rangeNauticalMiles  && <span>📍 {jet.rangeNauticalMiles.toLocaleString()} nm</span>}
                      {jet.cruisingSpeedKnots  && <span>💨 {jet.cruisingSpeedKnots} kts</span>}
                      <span>🛫 {jet.baseAirport}</span>
                    </div>

                    {/* Pricing */}
                    <div className="flex items-center gap-3 mb-3">
                      <div>
                        <div className="text-base font-bold text-amber-700">₦{Number(jet.pricePerHour).toLocaleString()}<span className="text-xs font-normal text-gray-400">/hr</span></div>
                      </div>
                      {jet.cautionFee > 0 && (
                        <div className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded px-2 py-0.5">
                          🛡 Caution ₦{Number(jet.cautionFee).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    {jet.features?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {jet.features.slice(0, 3).map((f) => (
                          <span key={f} className="text-xs bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            {f}
                          </span>
                        ))}
                        {jet.features.length > 3 && (
                          <span className="text-xs text-gray-400">+{jet.features.length - 3} more</span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-auto flex gap-2 pt-3 border-t border-gray-50">
                      <button
                        onClick={() => openEdit(jet)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium border border-amber-300 text-amber-700 hover:bg-amber-50 rounded-lg transition"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => toggleActive(jet)}
                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition border ${
                          jet.isActive
                            ? 'border-orange-200 text-orange-600 hover:bg-orange-50'
                            : 'border-green-200 text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {jet.isActive ? '⏸ Pause' : '▶ Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(jet)}
                        className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════════════ BOOKINGS TAB ══════════════════ */}
      {!loading && tab === 'bookings' && (
        <>
          {bookings.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm">No charter bookings yet.</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-left">Aircraft</th>
                    <th className="px-4 py-3 text-left">Charter Info</th>
                    <th className="px-4 py-3 text-left">Total</th>
                    <th className="px-4 py-3 text-left">Caution Fee</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const m = b.metadata ?? {} as any;
                    return (
                      <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{b.user?.firstName} {b.user?.lastName}</div>
                          <div className="text-xs text-gray-400">{b.user?.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{m.jetName ?? '—'}</div>
                          <div className="text-xs text-gray-400 font-mono">{m.tailNumber ?? ''}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-gray-500">{m.departureAirport ?? '—'} → {m.destination ?? '—'}</div>
                          <div className="text-xs text-gray-400">{m.hours ?? '—'} hrs · {m.paxCount ?? '—'} pax</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          ₦{Number(b.totalAmount ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          {m.cautionFee ? (
                            <div>
                              <div className="font-semibold">₦{Number(m.cautionFee).toLocaleString()}</div>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                CAUTION_COLORS[b.cautionFeeStatus || 'HELD'] || 'bg-gray-100 text-gray-600'
                              }`}>
                                {b.cautionFeeStatus || 'HELD'}
                              </span>
                              {/* Refund / Forfeit actions for completed bookings */}
                              {(!b.cautionFeeStatus || b.cautionFeeStatus === 'HELD') && b.status === 'COMPLETED' && (
                                <div className="flex gap-1 mt-1">
                                  <button
                                    onClick={() => setCautionAction({ booking: b, type: 'refund' })}
                                    className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                                  >
                                    Refund
                                  </button>
                                  <button
                                    onClick={() => setCautionAction({ booking: b, type: 'forfeit' })}
                                    className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
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
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            b.status === 'COMPLETED'  ? 'bg-green-100 text-green-700' :
                            b.status === 'CONFIRMED'  ? 'bg-blue-100 text-blue-700'  :
                            b.status === 'CANCELLED'  ? 'bg-red-100 text-red-700'    :
                            b.status === 'PENDING_PAYMENT' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {new Date(b.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ══════════════════ ADD MODAL ══════════════════ */}
      {showAdd && (
        <JetFormModal
          mode="add"
          form={addForm}
          setForm={setAddForm}
          imageUrls={addImages}
          setImageUrls={setAddImages}
          saving={saving}
          onSave={handleCreate}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* ══════════════════ EDIT MODAL ══════════════════ */}
      {editListing && (
        <JetFormModal
          mode="edit"
          form={editForm}
          setForm={setEditForm}
          imageUrls={editImages}
          setImageUrls={setEditImages}
          saving={editSaving}
          onSave={handleUpdate}
          onClose={() => setEditListing(null)}
        />
      )}

      {/* ══════════════════ CAUTION FEE MODAL ══════════════════ */}
      {cautionAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-base font-bold text-gray-900 mb-2">
              {cautionAction.type === 'refund' ? '💚 Refund Caution Fee' : '🔴 Forfeit Caution Fee'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {cautionAction.type === 'refund'
                ? `Refund ₦${Number(cautionAction.booking.metadata?.cautionFee ?? 0).toLocaleString()} to the client's wallet?`
                : `Forfeit ₦${Number(cautionAction.booking.metadata?.cautionFee ?? 0).toLocaleString()} caution fee due to flight overtime or aircraft damages?`}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCautionAction(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={handleCautionFee}
                disabled={cautionLoading}
                className={`px-4 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-50 ${
                  cautionAction.type === 'refund' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {cautionLoading
                  ? 'Processing...'
                  : cautionAction.type === 'refund' ? 'Confirm Refund' : 'Confirm Forfeit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
