'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { apiClient } from '@/services/api';
import type { Event, Booking } from '@/types';
import { CommissionPayer } from '@/types';
import MediaUpload from '@/components/MediaUpload';
import useUIStore from '@/store/ui.store';

const EVENT_STATUS_COLORS: Record<string, string> = {
  active:    'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-800',
};

const TICKET_STATUS_COLORS: Record<string, string> = {
  CONFIRMED:  'bg-blue-100 text-blue-800',
  CHECKED_IN: 'bg-green-100 text-green-800',
  COMPLETED:  'bg-gray-100 text-gray-600',
  CANCELLED:  'bg-red-100 text-red-700',
  EXPIRED:    'bg-orange-100 text-orange-700',
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

// ─── QR Code Scanner Subcomponent ─────────────────────────────────────────────
function QRScanTab() {
  const addToast = useUIStore((s) => s.addToast);
  const [qrInput, setQrInput] = useState('');
  const [result, setResult] = useState<{ success: boolean; booking?: Booking; message?: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    processingRef.current = processing;
  }, [processing]);

  useEffect(() => {
    if (cameraActive && hasPermission && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive, hasPermission]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const handleQRData = useCallback(
    async (data: string) => {
      if (processingRef.current) return;
      setProcessing(true);
      setResult(null);
      try {
        let qrPayload = data;
        try {
          const parsed = JSON.parse(data);
          qrPayload = parsed.qrCodeData ?? parsed.bookingId ?? data;
        } catch {
          /* raw string */
        }
        const booking = await apiClient.tickets.scan(qrPayload.trim());
        setResult({ success: true, booking });
        addToast('Ticket checked in successfully', 'success');
        if ('vibrate' in navigator) navigator.vibrate(200);
      } catch (e: any) {
        const msg = e?.response?.data?.message ?? 'Invalid or already scanned ticket';
        setResult({ success: false, message: msg });
        addToast(msg, 'error');
      } finally {
        setProcessing(false);
      }
    },
    [addToast],
  );

  const startScanLoop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || !cameraActive) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      if ('BarcodeDetector' in window) {
        try {
          // @ts-ignore
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(canvas);
          if (barcodes.length > 0) await handleQRData(barcodes[0].rawValue);
        } catch (err) {
          console.error('Detection error:', err);
        }
      }
    }, 500);
  }, [cameraActive, handleQRData]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setHasPermission(true);
      setCameraActive(true);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') setHasPermission(false);
      else setResult({ success: false, message: 'Camera error: ' + err.message });
    }
  }, []);

  useEffect(() => {
    if (cameraActive) startScanLoop();
    else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cameraActive, startScanLoop]);

  useEffect(() => () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const handleManualScan = async () => {
    if (!qrInput.trim()) return;
    setScanning(true);
    setResult(null);
    try {
      const booking = await apiClient.tickets.scan(qrInput.trim());
      setResult({ success: true, booking });
      addToast('Ticket checked in successfully', 'success');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Invalid or already scanned ticket';
      setResult({ success: false, message: msg });
      addToast(msg, 'error');
    } finally {
      setScanning(false);
      setQrInput('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-white rounded-xl border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800">📷 Live QR Scanner</h3>
            <p className="text-xs text-gray-500">Scan digital ticket QR code presented by guests at the entrance.</p>
          </div>
          {cameraActive ? (
            <button
              onClick={stopCamera}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition"
            >
              Stop Camera
            </button>
          ) : (
            <button
              onClick={startCamera}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
            >
              Start Camera
            </button>
          )}
        </div>

        {cameraActive && hasPermission && (
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video mb-4">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-white/60 rounded-xl" />
            </div>
          </div>
        )}

        {hasPermission === false && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 mb-4">
            Camera permission denied. Please allow camera access in browser permissions or use the manual entry below.
          </div>
        )}

        <div className="pt-2 border-t">
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Manual Ticket Code / QR Payload</label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Paste ticket QR string or booking ID..."
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
              className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono"
            />
            <button
              onClick={handleManualScan}
              disabled={scanning || !qrInput.trim()}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black disabled:opacity-50 transition"
            >
              {scanning ? 'Checking...' : 'Check In'}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className={`rounded-xl p-4 border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {result.success && result.booking ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-600 text-xl">✅</span>
                <span className="font-semibold text-green-800">Check-in Verified</span>
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>Booking ID:</strong> #{result.booking.id.slice(0, 8)}</p>
                <p><strong>Guest:</strong> {result.booking.user?.firstName} {result.booking.user?.lastName}</p>
                <p><strong>Status:</strong> {result.booking.status}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-xl">❌</span>
              <span className="text-red-800 text-sm font-medium">{result.message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Events & Tickets Page ──────────────────────────────────────────────
export default function EventsPage() {
  const addToast = useUIStore((s) => s.addToast);
  const [activeMainTab, setActiveMainTab] = useState<'events' | 'tickets'>('events');

  // Events State
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [filter, setFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [addTables, setAddTables] = useState(false);
  const [tables, setTables] = useState<Array<{ name: string; category: string; capacity: string; price: string }>>([]);
  const [venues, setVenues] = useState<Array<{ id: string; name: string; city?: string }>>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [tablesVenueId, setTablesVenueId] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    venueId: '',
    startDate: '',
    endDate: '',
    capacity: '',
    ticketPrice: '',
    genre: '',
    dresscode: '',
    djs: '',
    commissionPayer: 'USER',
  });

  // Tickets State
  const [ticketSubTab, setTicketSubTab] = useState<'list' | 'scan'>('list');
  const [ticketBookings, setTicketBookings] = useState<Booking[]>([]);
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketStatusFilter, setTicketStatusFilter] = useState('');

  const fetchEvents = async () => {
    try {
      setEventsLoading(true);
      const res = (await apiClient.events.listMine({ limit: 50 })) as any;
      const payload = res.data ?? res;
      setEvents(payload.events ?? payload.data ?? []);
      setEventsTotal(payload.total ?? (payload.events ?? payload.data ?? []).length);
    } catch (e) {
      console.error(e);
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchVenues = async () => {
    try {
      const res = (await apiClient.venues.list({ limit: 100 })) as any;
      setVenues(res.data?.data ?? res.data ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTickets = async () => {
    try {
      setTicketsLoading(true);
      const res = (await apiClient.tickets.list({
        limit: 100,
        status: ticketStatusFilter || undefined,
      })) as any;
      setTicketBookings(res.data?.data ?? res.data ?? []);
      setTicketsTotal(res.data?.total ?? res.total ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchVenues();
  }, []);

  useEffect(() => {
    if (activeMainTab === 'tickets' && ticketSubTab === 'list') {
      fetchTickets();
    }
  }, [activeMainTab, ticketSubTab, ticketStatusFilter]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      addToast('Event name is required', 'warning');
      return;
    }
    if (!form.startDate || !form.endDate) {
      addToast('Start date and end date are required', 'warning');
      return;
    }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      addToast('End date must be after start date', 'warning');
      return;
    }
    if (mediaUrls.length === 0) {
      addToast('Upload at least one image before creating an event', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const eventData = {
        ...form,
        venueId: form.venueId || undefined,
        capacity: Number(form.capacity),
        ticketPrice: Number(form.ticketPrice),
        djs: form.djs ? form.djs.split(',').map((d) => d.trim()) : [],
        commissionPayer: form.commissionPayer as CommissionPayer,
        images: mediaUrls,
      };
      const event = await apiClient.events.create(eventData);

      if (addTables && tables.length > 0 && event?.id) {
        for (const table of tables) {
          if (table.name && table.capacity && table.price) {
            await apiClient.tables.createListing({
              venueId: form.venueId || tablesVenueId || undefined,
              eventId: event.id,
              name: table.name,
              category: table.category as any,
              capacity: Number(table.capacity),
              price: Number(table.price),
              description: `Table for ${event.name}`,
            });
          }
        }
      }

      setShowCreate(false);
      setForm({
        name: '', description: '', venueId: '', startDate: '', endDate: '',
        capacity: '', ticketPrice: '', genre: '', dresscode: '', djs: '', commissionPayer: 'USER',
      });
      setAddTables(false);
      setTables([]);
      setTablesVenueId('');
      setMediaUrls([]);
      fetchEvents();
      addToast('Event created successfully', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to create event', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this event?')) return;
    try {
      await apiClient.events.cancel(id);
      fetchEvents();
      addToast('Event cancelled', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to cancel event', 'error');
    }
  };

  const filteredEvents = filter
    ? events.filter((e) => e.name.toLowerCase().includes(filter.toLowerCase()))
    : events;

  return (
    <div>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>🎪</span> Events & Ticketing
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage your ticketed events, view customer ticket bookings, and verify QR check-ins.
          </p>
        </div>
        {activeMainTab === 'events' && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition shadow-sm"
          >
            + Create Event
          </button>
        )}
      </div>

      {/* Main Tabs: Events vs Ticket Bookings */}
      <div className="flex border-b border-gray-200 mb-6 gap-6">
        <button
          onClick={() => setActiveMainTab('events')}
          className={`pb-3 text-sm font-semibold transition border-b-2 -mb-px ${
            activeMainTab === 'events'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Event Listings ({eventsTotal})
        </button>
        <button
          onClick={() => setActiveMainTab('tickets')}
          className={`pb-3 text-sm font-semibold transition border-b-2 -mb-px ${
            activeMainTab === 'tickets'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Ticket Bookings & Check-In ({ticketsTotal})
        </button>
      </div>

      {/* ─── TAB 1: EVENTS ─────────────────────────────────────────────────── */}
      {activeMainTab === 'events' && (
        <>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search events by name..."
              className="w-full max-w-sm px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          {eventsLoading ? (
            <div className="text-center py-20 text-gray-500">Loading events...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed p-8">
              <span className="text-3xl mb-2 block">🎪</span>
              <p className="text-gray-700 font-semibold mb-1">No events found</p>
              <p className="text-gray-500 text-xs mb-4">Create your first ticketed event to begin selling tickets.</p>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
              >
                + Create Event
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredEvents.map((ev) => (
                <div key={ev.id} className="bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 text-base leading-tight">{ev.name}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ml-2 shrink-0 ${
                        EVENT_STATUS_COLORS[ev.status] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {ev.status}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mb-3 line-clamp-2">{ev.description}</p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div>📅 {new Date(ev.startDate).toLocaleDateString()} – {new Date(ev.endDate).toLocaleDateString()}</div>
                    <div>🎫 ₦{Number(ev.ticketPrice).toLocaleString()} · Capacity: {ev.capacity}</div>
                    {ev.genre && <div>🎵 {ev.genre}</div>}
                    {ev.djs?.length > 0 && <div>🎧 {ev.djs.join(', ')}</div>}
                  </div>
                  <div className="flex gap-2 mt-4 pt-3 border-t">
                    <button
                      onClick={() => setSelectedEvent(ev)}
                      className="flex-1 py-1.5 border border-blue-500 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-50 transition"
                    >
                      View Details
                    </button>
                    {ev.status === 'active' && (
                      <button
                        onClick={() => handleCancel(ev.id)}
                        className="flex-1 py-1.5 border border-red-400 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── TAB 2: TICKET BOOKINGS & SCANNER ──────────────────────────────── */}
      {activeMainTab === 'tickets' && (
        <div>
          {/* Subtabs: Table List vs Scanner */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex gap-2">
              <button
                onClick={() => setTicketSubTab('list')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold border transition ${
                  ticketSubTab === 'list'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'text-gray-600 border-gray-300 hover:bg-gray-50 bg-white'
                }`}
              >
                🎟️ All Ticket Bookings
              </button>
              <button
                onClick={() => setTicketSubTab('scan')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold border transition ${
                  ticketSubTab === 'scan'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'text-gray-600 border-gray-300 hover:bg-gray-50 bg-white'
                }`}
              >
                📷 Live QR Scanner
              </button>
            </div>

            {ticketSubTab === 'list' && (
              <select
                className="px-3 py-1.5 border rounded-lg text-xs bg-white"
                value={ticketStatusFilter}
                onChange={(e) => setTicketStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                {['CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'EXPIRED'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </div>

          {ticketSubTab === 'scan' ? (
            <QRScanTab />
          ) : ticketsLoading ? (
            <div className="text-center py-20 text-gray-500">Loading ticket bookings...</div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Booking ID', 'Guest', 'Status', 'Amount', 'Scanned At', 'Purchased Date'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ticketBookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400">
                        No ticket bookings found
                      </td>
                    </tr>
                  ) : (
                    ticketBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-xs font-mono text-gray-500">#{b.id.slice(0, 8)}</td>
                        <td className="px-4 py-3 text-sm text-gray-800">
                          <div className="font-medium">
                            {b.user ? `${b.user.firstName} ${b.user.lastName}` : (b.metadata?.contactName || b.userId.slice(0, 8))}
                          </div>
                          <div className="text-xs text-gray-400">{b.user?.email || b.metadata?.contactPhone || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                              TICKET_STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          ₦{Number(b.totalAmount).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {b.scannedAt ? new Date(b.scannedAt).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(b.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE EVENT MODAL */}
      {showCreate && (
        <Modal title="Create Ticketed Event" onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Event Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="e.g. Neon Summer Night"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date & Time *</label>
                <input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date & Time *</label>
                <input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Ticket Capacity *</label>
                <input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Ticket Price (₦) *</label>
                <input
                  type="number"
                  value={form.ticketPrice}
                  onChange={(e) => setForm({ ...form, ticketPrice: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-semibold"
                  placeholder="15000"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Venue (Optional)</label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-sm"
                value={form.venueId}
                onChange={(e) => setForm({ ...form, venueId: e.target.value })}
              >
                <option value="">No venue (Standalone event)</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}{v.city ? ` (${v.city})` : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Details about the event, experience, and line-up..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Event Banner Images *</label>
              <MediaUpload onUploadComplete={(urls) => setMediaUrls(urls)} maxFiles={3} />
            </div>

            <div className="pt-2 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Publish Event'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* EVENT DETAIL MODAL */}
      {selectedEvent && (
        <Modal title={selectedEvent.name} onClose={() => setSelectedEvent(null)}>
          <div className="space-y-3 text-sm">
            <p className="text-gray-600">{selectedEvent.description}</p>
            <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3 rounded-lg">
              <div><strong>Start:</strong> {new Date(selectedEvent.startDate).toLocaleString()}</div>
              <div><strong>End:</strong> {new Date(selectedEvent.endDate).toLocaleString()}</div>
              <div><strong>Capacity:</strong> {selectedEvent.capacity} guests</div>
              <div><strong>Ticket Price:</strong> ₦{Number(selectedEvent.ticketPrice).toLocaleString()}</div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
