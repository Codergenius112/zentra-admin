'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/services/api';
import type { Order, Venue } from '@/types';
import { OrderStatus } from '@/types';
import MediaUpload from '@/components/MediaUpload';
import useUIStore from '@/store/ui.store';

const STATUS_COLORS: Record<string, string> = {
  CREATED:        'bg-gray-100 text-gray-700',
  ASSIGNED:       'bg-blue-100 text-blue-800',
  ROUTED:         'bg-indigo-100 text-indigo-800',
  IN_PREPARATION: 'bg-yellow-100 text-yellow-800',
  READY:          'bg-teal-100 text-teal-800',
  SERVED:         'bg-green-100 text-green-700',
  COMPLETED:      'bg-gray-200 text-gray-600',
  CANCELLED:      'bg-red-100 text-red-700',
};

const NEXT_STATUS: Record<string, string> = {
  CREATED:        'ASSIGNED',
  ASSIGNED:       'ROUTED',
  ROUTED:         'IN_PREPARATION',
  IN_PREPARATION: 'READY',
  READY:          'SERVED',
  SERVED:         'COMPLETED',
};

function OrderCard({ order, onUpdate, onAssign }: {
  order: Order;
  onUpdate: (id: string, status: string) => void;
  onAssign: (order: Order) => void;
}) {
  const next       = NEXT_STATUS[order.status];
  const totalItems = order.items?.reduce((s, i) => s + i.quantity, 0) ?? 0;

  return (
    <div className={`bg-white rounded-xl border-2 p-4 shadow-sm ${
      order.status === 'IN_PREPARATION' ? 'border-yellow-400' :
      order.status === 'READY'          ? 'border-teal-400'   : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs font-mono text-gray-400">{order.id.slice(0, 8)}...</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {totalItems} item{totalItems !== 1 ? 's' : ''} · ₦{Number(order.totalAmount).toLocaleString()}
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100'}`}>
          {order.status}
        </span>
      </div>

      {/* Location Info */}
      {order.tableInfo && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-xs font-medium text-blue-900">
            📍 {order.tableInfo.tableName}
          </div>
          <div className="text-xs text-blue-700 capitalize">
            {order.tableInfo.category} Table
          </div>
        </div>
      )}
      {order.pickupLocation && (
        <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="text-xs font-medium text-orange-900">
            🎫 Pickup at: {order.pickupLocation}
          </div>
        </div>
      )}

      {order.items?.length > 0 && (
        <div className="space-y-1 mb-3">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-700">{item.name}</span>
              <span className="text-gray-500">×{item.quantity}</span>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-500 mb-3">
        {order.assignedToUserId
          ? <span className="text-green-600">👤 {order.assignedToUserId.slice(0, 8)}</span>
          : <span className="text-orange-500">⚠️ Unassigned</span>}
      </div>

      <div className="flex gap-2">
        {!order.assignedToUserId && (
          <button onClick={() => onAssign(order)}
            className="flex-1 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-medium hover:bg-blue-100">
            Assign Waiter
          </button>
        )}
        {next && (
          <button onClick={() => onUpdate(order.id, next)}
            className="flex-1 py-1.5 text-xs bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">
            → {next.replace('_', ' ')}
          </button>
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const addToast = useUIStore(s => s.addToast);
  const [tab, setTab]               = useState<'live' | 'all' | 'menu'>('live');
  const [liveOrders, setLiveOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders]   = useState<Order[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [assignModal, setAssignModal]   = useState<Order | null>(null);
  const [waiterId, setWaiterId]         = useState('');
  const [assigning, setAssigning]       = useState(false);
  const [updating, setUpdating]         = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Manual purchase state
  const [showManualPurchase, setShowManualPurchase] = useState(false);
  const [purchaseTargetType, setPurchaseTargetType] = useState<'table' | 'venue' | 'event'>('table');
  const [activeBookings, setActiveBookings] = useState<Array<{ id: string; guestName: string; tableName: string }>>([]);
  const [events, setEvents] = useState<Array<{ id: string; name: string }>>([]);
  const [purchaseBookingId, setPurchaseBookingId] = useState('');
  const [purchaseVenueId, setPurchaseVenueId] = useState('');
  const [purchaseEventId, setPurchaseEventId] = useState('');
  const [inventoryItems, setInventoryItems] = useState<Array<{ id: string; name: string; currentStock: number; sellingPrice: number }>>([]);
  const [purchaseLines, setPurchaseLines] = useState<Array<{ itemId: string; quantity: string }>>([
    { itemId: '', quantity: '1' },
  ]);
  const [recordingPurchase, setRecordingPurchase] = useState(false);

  // Menu state
  const [venues, setVenues]         = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [menuItems, setMenuItems]   = useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [menuForm, setMenuForm]     = useState({ name: '', description: '', category: 'food', price: '', sortOrder: '0' });
  const [menuImageUrl, setMenuImageUrl] = useState<string[]>([]);
  const [menuSaving, setMenuSaving] = useState(false);

  const fetchLive = useCallback(async () => {
    try {
      const res = await apiClient.orders.live() as any;
      setLiveOrders(Array.isArray(res) ? res : res.data?.data ?? res.data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.orders.list({
        limit: 100,
        status: statusFilter || undefined,
      }) as any;
      setAllOrders(res.data?.data ?? res.orders ?? res.data ?? []);
      setTotal(res.data?.total ?? res.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => {
    if (tab === 'live') {
      fetchLive();
      if (autoRefresh) {
        intervalRef.current = setInterval(fetchLive, 8000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
      }
    } else if (tab === 'all') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      fetchAll();
    } else if (tab === 'menu') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      fetchVenues();
    }
  }, [tab, autoRefresh, fetchLive, fetchAll]);

  const fetchVenues = async () => {
    setMenuLoading(true);
    try {
      const res = await apiClient.venues.list({ limit: 50 }) as any;
      const venueList = res.data?.data ?? res.data ?? [];
      setVenues(venueList);
      if (venueList.length > 0 && !selectedVenue) {
        setSelectedVenue(venueList[0].id);
      }
    } catch (e) { console.error(e); }
  };

  const fetchMenuItems = async (venueId: string) => {
    setMenuLoading(true);
    try {
      const res = await apiClient.menu.list(venueId) as any;
      setMenuItems(res.items ?? []);
    } catch (e) { console.error(e); }
    finally { setMenuLoading(false); }
  };

  useEffect(() => {
    if (tab === 'menu' && selectedVenue) fetchMenuItems(selectedVenue);
  }, [selectedVenue, tab]);

  const handleCreateMenuItem = async () => {
    if (!menuForm.name || !menuForm.price || !selectedVenue) {
      addToast('Please fill in name and price.', 'warning');
      return;
    }
    setMenuSaving(true);
    try {
      await apiClient.menu.create({
        venueId: selectedVenue,
        name: menuForm.name,
        description: menuForm.description,
        category: menuForm.category,
        price: Number(menuForm.price),
        imageUrl: menuImageUrl[0] || undefined,
        sortOrder: Number(menuForm.sortOrder) || 0,
      });
      setShowAddMenu(false);
      setMenuForm({ name: '', description: '', category: 'food', price: '', sortOrder: '0' });
      setMenuImageUrl([]);
      fetchMenuItems(selectedVenue);
      addToast('Menu item created successfully', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to create menu item', 'error');
    } finally { setMenuSaving(false); }
  };

  const handleDeactivateMenuItem = async (id: string) => {
    if (!confirm('Deactivate this menu item?')) return;
    try {
      await apiClient.menu.deactivate(id);
      fetchMenuItems(selectedVenue);
      addToast('Menu item deactivated', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Failed to deactivate', 'error');
    }
  };

  const openManualPurchase = async () => {
    setShowManualPurchase(true);
    try {
      const [bookingsRes, inventoryRes, venuesRes, eventsRes] = await Promise.all([
        apiClient.tables.bookings({}) as any,
        apiClient.inventory.list({ limit: 200 }) as any,
        apiClient.venues.list({ limit: 100 }) as any,
        apiClient.events.list({ limit: 100 }) as any,
      ]);
      const bookings = bookingsRes.data?.data ?? bookingsRes.data ?? [];
      setActiveBookings(
        bookings
          .filter((b: any) => ['CONFIRMED', 'ACTIVE'].includes(b.status))
          .map((b: any) => ({
            id: b.id,
            guestName: b.metadata?.guestName ?? (b.user ? `${b.user.firstName} ${b.user.lastName}` : 'Guest'),
            tableName: b.metadata?.tableName ?? b.id.slice(0, 8),
          })),
      );
      setInventoryItems(inventoryRes.data?.data ?? inventoryRes.data ?? []);
      setVenues(venuesRes.data?.data ?? venuesRes.data ?? []);
      setEvents(eventsRes.data?.data ?? eventsRes.data ?? []);
    } catch (e) { console.error(e); }
  };

  const resetManualPurchase = () => {
    setPurchaseTargetType('table');
    setPurchaseBookingId('');
    setPurchaseVenueId('');
    setPurchaseEventId('');
    setPurchaseLines([{ itemId: '', quantity: '1' }]);
  };

  const purchaseTotal = purchaseLines.reduce((sum, line) => {
    const item = inventoryItems.find(i => i.id === line.itemId);
    return sum + (item ? Number(item.sellingPrice) * (Number(line.quantity) || 0) : 0);
  }, 0);

  const handleRecordPurchase = async () => {
    setRecordingPurchase(true);
    try {
      const items = purchaseLines
        .filter(l => l.itemId && Number(l.quantity) > 0)
        .map(l => ({ itemId: l.itemId, quantity: Number(l.quantity) }));

      if (!items.length) {
        addToast('Add at least one item from inventory', 'warning');
        setRecordingPurchase(false);
        return;
      }

      await apiClient.orders.manualPurchase({
        ...(purchaseTargetType === 'table' ? { bookingId: purchaseBookingId } : {}),
        ...(purchaseTargetType === 'venue' ? { venueId: purchaseVenueId } : {}),
        ...(purchaseTargetType === 'event' ? { eventId: purchaseEventId } : {}),
        items,
      });
      setShowManualPurchase(false);
      resetManualPurchase();
      tab === 'live' ? fetchLive() : tab === 'all' ? fetchAll() : null;
      addToast('Purchase recorded and stock deducted', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Could not record purchase', 'error');
    } finally { setRecordingPurchase(false); }
  };

  const handleUpdate = async (id: string, status: string) => {
    setUpdating(id);
    try {
      await apiClient.orders.updateStatus(id, status);
      addToast(`Order updated to ${status.replace('_', ' ')}`, 'success');
      tab === 'live' ? fetchLive() : fetchAll();
    } catch (e: any) { addToast(e?.response?.data?.message ?? 'Update failed', 'error'); }
    finally { setUpdating(null); }
  };

  const handleAssign = async () => {
    if (!assignModal || !waiterId.trim()) return;
    setAssigning(true);
    try {
      await apiClient.orders.assign(assignModal.id, waiterId.trim());
      addToast('Waiter assigned successfully', 'success');
      setAssignModal(null);
      setWaiterId('');
      tab === 'live' ? fetchLive() : fetchAll();
    } catch (e: any) { addToast(e?.response?.data?.message ?? 'Assign failed', 'error'); }
    finally { setAssigning(false); }
  };

  const LIVE_ORDER = ['CREATED','ASSIGNED','ROUTED','IN_PREPARATION','READY','SERVED'];
  const liveGroups: Record<string, Order[]> = {};
  for (const o of liveOrders) {
    if (!liveGroups[o.status]) liveGroups[o.status] = [];
    liveGroups[o.status].push(o);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-1">
            {tab === 'live' ? `${liveOrders.length} active orders`
              : tab === 'all' ? `${total} total orders`
              : `${menuItems.length} menu items`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {tab === 'live' && (
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)} className="rounded" />
              Auto-refresh (8s)
            </label>
          )}
          <button onClick={openManualPurchase}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">
            + Manual Purchase
          </button>
          {(['live', 'all', 'menu'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                tab === t ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}>
              {t === 'live' ? '🔴 Live' : t === 'all' ? '📋 All Orders' : '🍽️ Menu'}
            </button>
          ))}
          {tab === 'menu' && (
            <button onClick={() => setShowAddMenu(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">
              + Add Item
            </button>
          )}
        </div>
      </div>

      {tab === 'all' && (
        <div className="mb-4">
          <select className="px-3 py-2 border rounded-lg text-sm"
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {tab === 'menu' ? (
        <div>
          {/* Venue selector */}
          <div className="mb-4 flex items-center gap-3">
            <label className="text-sm text-gray-600 font-medium">Venue:</label>
            <select className="px-3 py-2 border rounded-lg text-sm" value={selectedVenue}
              onChange={e => setSelectedVenue(e.target.value)}>
              {venues.length === 0 && <option value="">No venues found</option>}
              {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          {/* Menu items grid */}
          {menuLoading ? (
            <div className="text-center py-20 text-gray-500">Loading menu...</div>
          ) : menuItems.length === 0 ? (
            <div className="text-center py-20 text-gray-400">No menu items for this venue. Click "+ Add Item" to create one.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {menuItems.map(item => (
                <div key={item.id} className="bg-white rounded-xl border p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase">{item.category}</span>
                    </div>
                    <span className="text-lg font-bold text-gray-800">₦{Number(item.price).toLocaleString()}</span>
                  </div>
                  {item.description && <p className="text-xs text-gray-500 mt-2">{item.description}</p>}
                  <div className="mt-3 flex justify-between items-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                    {item.isAvailable && (
                      <button onClick={() => handleDeactivateMenuItem(item.id)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium">
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="text-center py-20 text-gray-500">Loading orders...</div>
      ) : tab === 'live' ? (
        liveOrders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-gray-500">No active orders right now</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {LIVE_ORDER.flatMap(status =>
              (liveGroups[status] ?? []).map(order => (
                <OrderCard key={order.id} order={order} onUpdate={handleUpdate} onAssign={setAssignModal} />
              ))
            )}
          </div>
        )
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Order ID','Items','Status','Assigned','Amount','Created',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allOrders.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No orders found</td></tr>
              ) : allOrders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{o.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{o.items?.length ?? 0} items</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[o.status] ?? 'bg-gray-100'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {o.assignedToUserId
                      ? o.assignedToUserId.slice(0, 8) + '...'
                      : <span className="text-orange-500">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">₦{Number(o.totalAmount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {!o.assignedToUserId && (
                      <button onClick={() => setAssignModal(o)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                        Assign
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Menu Item Modal */}
      {showAddMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Add Menu Item</h2>
              <button onClick={() => setShowAddMenu(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Venue</label>
                <select value={selectedVenue} onChange={e => setSelectedVenue(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input value={menuForm.name}
                  onChange={e => setMenuForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Jollof Rice & Chicken"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea value={menuForm.description}
                  onChange={e => setMenuForm(p => ({ ...p, description: e.target.value }))}
                  rows={2} placeholder="Short description..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
                  <select value={menuForm.category}
                    onChange={e => setMenuForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="food">Food</option>
                    <option value="drinks">Drinks</option>
                    <option value="cocktails">Cocktails</option>
                    <option value="bottles">Bottles</option>
                    <option value="desserts">Desserts</option>
                    <option value="extras">Extras</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Price (₦) *</label>
                  <input type="number" value={menuForm.price}
                    onChange={e => setMenuForm(p => ({ ...p, price: e.target.value }))}
                    placeholder="5000"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Image (optional)</label>
                <MediaUpload
                  onUploadComplete={setMenuImageUrl}
                  existingUrls={menuImageUrl}
                  maxFiles={1}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sort Order</label>
                <input type="number" value={menuForm.sortOrder}
                  onChange={e => setMenuForm(p => ({ ...p, sortOrder: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3">
              <button onClick={() => setShowAddMenu(false)}
                className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreateMenuItem} disabled={menuSaving}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {menuSaving ? 'Creating...' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showManualPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Manual Purchase</h3>
              <button onClick={() => { setShowManualPurchase(false); resetManualPurchase(); }}
                className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Record against</label>
                <div className="flex gap-2 mb-2">
                  {(['table', 'venue', 'event'] as const).map(t => (
                    <button key={t} type="button"
                      onClick={() => setPurchaseTargetType(t)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${
                        purchaseTargetType === t ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-300'
                      }`}>
                      {t === 'table' ? '🪑 A Table' : t === 'venue' ? '🏢 Venue (walk-up)' : '🎫 Event (walk-up)'}
                    </button>
                  ))}
                </div>

                {purchaseTargetType === 'table' && (
                  <select
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={purchaseBookingId}
                    onChange={e => setPurchaseBookingId(e.target.value)}>
                    <option value="">Select an active table...</option>
                    {activeBookings.length === 0 && <option value="" disabled>No active bookings found</option>}
                    {activeBookings.map(b => (
                      <option key={b.id} value={b.id}>{b.guestName} — {b.tableName}</option>
                    ))}
                  </select>
                )}
                {purchaseTargetType === 'venue' && (
                  <>
                    <select
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={purchaseVenueId}
                      onChange={e => setPurchaseVenueId(e.target.value)}>
                      <option value="">Select a venue...</option>
                      {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">For a walk-up purchase with no table — e.g. a guest buying a drink directly at the bar.</p>
                  </>
                )}
                {purchaseTargetType === 'event' && (
                  <>
                    <select
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={purchaseEventId}
                      onChange={e => setPurchaseEventId(e.target.value)}>
                      <option value="">Select an event...</option>
                      {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">For a guest without a table buying something at the event directly.</p>
                  </>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600">Items — from inventory</label>
                  <button type="button"
                    onClick={() => setPurchaseLines(lines => [...lines, { itemId: '', quantity: '1' }])}
                    className="text-xs text-blue-600 font-medium hover:underline">+ Add item</button>
                </div>
                <div className="space-y-2">
                  {purchaseLines.map((line, idx) => {
                    const selected = inventoryItems.find(i => i.id === line.itemId);
                    return (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          className="flex-[2] px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={line.itemId}
                          onChange={e => setPurchaseLines(lines => lines.map((l, i) => i === idx ? { ...l, itemId: e.target.value } : l))}>
                          <option value="">Select item...</option>
                          {inventoryItems.map(item => (
                            <option key={item.id} value={item.id} disabled={item.currentStock <= 0}>
                              {item.name} — ₦{Number(item.sellingPrice).toLocaleString()} ({item.currentStock} in stock)
                            </option>
                          ))}
                        </select>
                        <input type="number" placeholder="Qty" min={1} max={selected?.currentStock ?? undefined}
                          className="w-16 px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={line.quantity}
                          onChange={e => setPurchaseLines(lines => lines.map((l, i) => i === idx ? { ...l, quantity: e.target.value } : l))} />
                        {purchaseLines.length > 1 && (
                          <button type="button" onClick={() => setPurchaseLines(lines => lines.filter((_, i) => i !== idx))}
                            className="text-gray-400 hover:text-red-500 text-lg leading-none px-1">&times;</button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-2">Prices are pulled from inventory and stock is deducted automatically when the purchase is recorded.</p>
                <div className="text-right text-sm text-gray-600 mt-2">
                  Total: <strong>₦{purchaseTotal.toLocaleString()}</strong>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowManualPurchase(false); resetManualPurchase(); }}
                  className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600">Cancel</button>
                <button onClick={handleRecordPurchase}
                  disabled={
                    recordingPurchase ||
                    (purchaseTargetType === 'table' && !purchaseBookingId) ||
                    (purchaseTargetType === 'venue' && !purchaseVenueId) ||
                    (purchaseTargetType === 'event' && !purchaseEventId)
                  }
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {recordingPurchase ? 'Recording...' : 'Record Purchase'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Assign Waiter</h3>
            <p className="text-sm text-gray-500 mb-4">Order: <span className="font-mono">{assignModal.id.slice(0, 8)}...</span></p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Waiter User ID</label>
              <input type="text" placeholder="Enter waiter's user ID..."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={waiterId} onChange={e => setWaiterId(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setAssignModal(null); setWaiterId(''); }}
                className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600">Cancel</button>
              <button onClick={handleAssign} disabled={assigning || !waiterId.trim()}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {assigning ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}