'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';
import type { Event } from '@/types';
import { CommissionPayer } from '@/types';
import useUIStore from '@/store/ui.store';

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-800',
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

export default function EventsPage() {
  const addToast = useUIStore(s => s.addToast);
  const [events, setEvents]         = useState<Event[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [filter, setFilter]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [addTables, setAddTables] = useState(false);
  const [tables, setTables] = useState<Array<{ name: string; category: string; capacity: string; price: string }>>([]);
  const [venues, setVenues] = useState<Array<{ id: string; name: string }>>([]);
  const [tablesVenueId, setTablesVenueId] = useState('');
  const [form, setForm] = useState({
    name: '', description: '', venueId: '', startDate: '',
    endDate: '', capacity: '', ticketPrice: '', genre: '',
    dresscode: '', djs: '', commissionPayer: 'USER',
  });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await apiClient.events.list({ limit: 50 }) as any;
      const payload = res.data ?? res; // unwrap interceptor { data: { events, total } }
      setEvents(payload.events ?? payload.data ?? []);
      setTotal(payload.total ?? (payload.events ?? payload.data ?? []).length);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchVenues = async () => {
    try {
      const res = await apiClient.venues.list({ limit: 100 }) as any;
      setVenues(res.data?.data ?? res.data ?? []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchEvents(); fetchVenues(); }, []);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const eventData = {
        ...form,
        venueId: form.venueId || undefined, // Make venue optional
        capacity:    Number(form.capacity),
        ticketPrice: Number(form.ticketPrice),
        djs: form.djs ? form.djs.split(',').map(d => d.trim()) : [],
        commissionPayer: form.commissionPayer as CommissionPayer,
      };
      const event = await apiClient.events.create(eventData);

      // Create tables if requested
      if (addTables && tables.length > 0 && tablesVenueId) {
        for (const table of tables) {
          await apiClient.tables.createListing({
            venueId: tablesVenueId,
            name: table.name,
            category: table.category,
            capacity: Number(table.capacity),
            price: Number(table.price),
          });
        }
      }

      setShowCreate(false);
      setForm({ name: '', description: '', venueId: '', startDate: '', endDate: '', capacity: '', ticketPrice: '', genre: '', dresscode: '', djs: '', commissionPayer: 'USER' });
      setAddTables(false);
      setTables([]);
      setTablesVenueId('');
      fetchEvents();
      addToast('Event created successfully', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to create event', 'error');
    } finally { setSubmitting(false); }
  };

  const addTableRow = () => {
    setTables([...tables, { name: '', category: 'standard', capacity: '', price: '' }]);
  };

  const updateTable = (idx: number, field: string, value: string) => {
    setTables(tables.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const removeTable = (idx: number) => {
    setTables(tables.filter((_, i) => i !== idx));
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this event?')) return;
    try { await apiClient.events.cancel(id); fetchEvents(); addToast('Event cancelled', 'success'); }
    catch (e: any) { addToast(e?.response?.data?.message ?? 'Failed to cancel event', 'error'); }
  };

  const filtered = filter
    ? events.filter(e => e.name.toLowerCase().includes(filter.toLowerCase()))
    : events;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total events</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
          + Create Event
        </button>
      </div>

      <div className="mb-4">
        <input type="text" placeholder="Search events..."
          className="w-full max-w-sm px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filter} onChange={e => setFilter(e.target.value)} />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading events...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No events found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(ev => (
            <div key={ev.id} className="bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-base leading-tight">{ev.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ml-2 shrink-0 ${STATUS_COLORS[ev.status] ?? 'bg-gray-100 text-gray-600'}`}>
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
              <div className="flex gap-2 mt-4">
                <button onClick={() => setSelectedEvent(ev)}
                  className="flex-1 py-1.5 border border-blue-500 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-50">
                  View Details
                </button>
                {ev.status === 'active' && (
                  <button onClick={() => handleCancel(ev.id)}
                    className="flex-1 py-1.5 border border-red-400 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="Create Event" onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            {([
              { label: 'Event Name',              key: 'name',        type: 'text'           },
              { label: 'Start Date',              key: 'startDate',   type: 'datetime-local' },
              { label: 'End Date',                key: 'endDate',     type: 'datetime-local' },
              { label: 'Capacity',                key: 'capacity',    type: 'number'         },
              { label: 'Ticket Price (₦)',         key: 'ticketPrice', type: 'number'         },
              { label: 'Genre',                   key: 'genre',       type: 'text'           },
              { label: 'Dresscode',               key: 'dresscode',   type: 'text'           },
              { label: 'DJs (comma-separated)',   key: 'djs',         type: 'text'           },
            ] as const).map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input type={type}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Venue (optional)</label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.venueId}
                onChange={e => setForm(f => ({ ...f, venueId: e.target.value }))}>
                <option value="">No venue / Custom venue</option>
                {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Who Pays Commission?</label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.commissionPayer}
                onChange={e => setForm(f => ({ ...f, commissionPayer: e.target.value }))}>
                <option value="USER">Customer pays commission (added to ticket price)</option>
                <option value="ADMIN">Admin pays commission (deducted from payout)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {form.commissionPayer === 'USER' 
                  ? 'Commission will be added on top of the ticket price' 
                  : 'Commission will be deducted from your event payout'}
              </p>
            </div>

            {/* Table creation section */}
            <div className="border-t pt-3 mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={addTables} onChange={e => setAddTables(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300" />
                <span className="text-sm font-medium text-gray-700">Also create table reservations for this event</span>
              </label>
              {addTables && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Select venue for tables</label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={tablesVenueId}
                      onChange={e => setTablesVenueId(e.target.value)}>
                      <option value="">Select a venue...</option>
                      {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    {!tablesVenueId && <p className="text-xs text-red-500 mt-1">Select a venue to create tables</p>}
                  </div>
                  {tables.map((table, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-600">Table {idx + 1}</span>
                        <button onClick={() => removeTable(idx)} className="text-red-500 text-xs hover:text-red-700">Remove</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Table name"
                          className="px-2 py-1.5 border rounded text-xs"
                          value={table.name} onChange={e => updateTable(idx, 'name', e.target.value)} />
                        <select className="px-2 py-1.5 border rounded text-xs"
                          value={table.category} onChange={e => updateTable(idx, 'category', e.target.value)}>
                          <option value="standard">Standard</option>
                          <option value="vip">VIP</option>
                          <option value="vvip">VVIP</option>
                          <option value="booth">Booth</option>
                          <option value="private">Private</option>
                        </select>
                        <input type="number" placeholder="Capacity"
                          className="px-2 py-1.5 border rounded text-xs"
                          value={table.capacity} onChange={e => updateTable(idx, 'capacity', e.target.value)} />
                        <input type="number" placeholder="Min spend (₦)"
                          className="px-2 py-1.5 border rounded text-xs"
                          value={table.price} onChange={e => updateTable(idx, 'price', e.target.value)} />
                      </div>
                    </div>
                  ))}
                  <button onClick={addTableRow}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-blue-500 hover:text-blue-500">
                    + Add another table
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600">Cancel</button>
              <button onClick={handleCreate} disabled={submitting}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {selectedEvent && (
        <Modal title={selectedEvent.name} onClose={() => setSelectedEvent(null)}>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>Status:</strong> {selectedEvent.status}</p>
            <p><strong>Venue:</strong> {selectedEvent.venueId}</p>
            <p><strong>Start:</strong> {new Date(selectedEvent.startDate).toLocaleString()}</p>
            <p><strong>End:</strong> {new Date(selectedEvent.endDate).toLocaleString()}</p>
            <p><strong>Capacity:</strong> {selectedEvent.capacity}</p>
            <p><strong>Ticket Price:</strong> ₦{Number(selectedEvent.ticketPrice).toLocaleString()}</p>
            {selectedEvent.genre    && <p><strong>Genre:</strong> {selectedEvent.genre}</p>}
            {selectedEvent.dresscode && <p><strong>Dresscode:</strong> {selectedEvent.dresscode}</p>}
            {selectedEvent.djs?.length > 0 && <p><strong>DJs:</strong> {selectedEvent.djs.join(', ')}</p>}
            <p className="pt-2"><strong>Description:</strong> {selectedEvent.description}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}