'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';
import type { InventoryItem, InventoryTransaction, BusinessScope } from '@/types';
import useUIStore from '@/store/ui.store';

const CATEGORIES = ['BAR_STOCK','KITCHEN_INGREDIENT','VEHICLE_SUPPLY','APARTMENT_SUPPLY','VENUE_EQUIPMENT'];
const SCOPES     = ['CAR_RENTAL','APARTMENT','TABLE_CLUB','EVENT_TICKETING'];

function StockBadge({ item }: { item: InventoryItem }) {
  if (item.currentStock <= 0)
    return <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">Out of Stock</span>;
  if (item.currentStock <= item.lowStockThreshold)
    return <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium">Low Stock</span>;
  return <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">In Stock</span>;
}

function HistoryDrawer({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const [history, setHistory] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.inventory.history(item.id)
      .then(data => setHistory(data as InventoryTransaction[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [item.id]);

  const TYPE_COLORS: Record<string, string> = {
    RESTOCK:    'bg-green-100 text-green-700',
    DEDUCTION:  'bg-red-100 text-red-700',
    ADJUSTMENT: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Transaction History</h2>
            <p className="text-xs text-gray-500 mt-0.5">{item.name} · {item.sku}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-3 bg-gray-50 border-b flex gap-4 text-sm">
          <div><span className="text-gray-500">Current Stock: </span><strong>{item.currentStock} {item.unit}</strong></div>
          <div><span className="text-gray-500">Threshold: </span><strong>{item.lowStockThreshold}</strong></div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No transactions yet</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {history.map(tx => (
                <div key={tx.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-1">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${TYPE_COLORS[tx.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {tx.type}
                    </span>
                    <span className={`text-sm font-bold ${tx.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.quantity > 0 ? '+' : ''}{tx.quantity} {item.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                    <span>{tx.balanceBefore} → {tx.balanceAfter} {item.unit}</span>
                    <span>{new Date(tx.createdAt).toLocaleString()}</span>
                  </div>
                  {tx.reason && <p className="text-xs text-gray-600 mt-1 italic">"{tx.reason}"</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    By: {tx.performedByUser
                      ? `${tx.performedByUser.firstName} ${tx.performedByUser.lastName} (${tx.performedByUser.role})`
                      : tx.performedByRole
                        ? `Unknown user (${tx.performedByRole})`
                        : `User ${tx.performedBy.slice(0, 8)}...`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const addToast = useUIStore(s => s.addToast);
  const [items, setItems]           = useState<InventoryItem[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [scopeFilter, setScopeFilter]   = useState('');
  const [showCreate, setShowCreate]     = useState(false);
  const [actionModal, setActionModal]   = useState<{ item: InventoryItem; type: 'restock' | 'deduct' } | null>(null);
  const [historyItem, setHistoryItem]   = useState<InventoryItem | null>(null);
  const [quantity, setQuantity]         = useState('');
  const [reason, setReason]             = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '', sku: '', category: CATEGORIES[0], unit: '',
    currentStock: '', lowStockThreshold: '', businessScope: SCOPES[0], venueId: '',
  });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await apiClient.inventory.list({
        lowStockOnly,
        businessScope: scopeFilter as BusinessScope || undefined,
        limit: 100,
      }) as any;
      setItems(res.data?.data ?? res.data ?? []);
      setTotal(res.data?.total ?? res.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, [lowStockOnly, scopeFilter]);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await apiClient.inventory.create({
        ...createForm,
        currentStock:      Number(createForm.currentStock),
        lowStockThreshold: Number(createForm.lowStockThreshold),
        businessScope:     createForm.businessScope as BusinessScope,
        venueId:           createForm.venueId || undefined,
      } as any);
      setShowCreate(false);
      fetchItems();
      addToast('Inventory item created', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Failed to create item', 'error');
    } finally { setSubmitting(false); }
  };

  const handleStockAction = async () => {
    if (!actionModal || !quantity) return;
    setSubmitting(true);
    try {
      actionModal.type === 'restock'
        ? await apiClient.inventory.restock(actionModal.item.id, Number(quantity), reason)
        : await apiClient.inventory.deduct(actionModal.item.id, Number(quantity), reason);
      setActionModal(null);
      setQuantity('');
      setReason('');
      fetchItems();
      addToast(`Stock ${actionModal.type === 'restock' ? 'restocked' : 'deducted'} successfully`, 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.message ?? 'Action failed', 'error');
    } finally { setSubmitting(false); }
  };

  const lowStockCount = items.filter(i => i.currentStock <= i.lowStockThreshold).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 text-sm mt-1">{total} items · {lowStockCount} low stock alerts</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
          + Add Item
        </button>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <select className="px-3 py-2 border rounded-lg text-sm"
          value={scopeFilter} onChange={e => setScopeFilter(e.target.value)}>
          <option value="">All Scopes</option>
          {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm cursor-pointer hover:bg-gray-50">
          <input type="checkbox" checked={lowStockOnly}
            onChange={e => setLowStockOnly(e.target.checked)} className="rounded" />
          Low stock only
        </label>
        {lowStockCount > 0 && (
          <div className="flex items-center px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
            ⚠️ {lowStockCount} item{lowStockCount !== 1 ? 's' : ''} need restocking
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading inventory...</div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Item','SKU','Category','Scope','Stock','Threshold','Status',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No items found</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className={`hover:bg-gray-50 ${item.currentStock <= item.lowStockThreshold ? 'bg-orange-50/30' : ''}`}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{item.sku}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.category}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.businessScope}</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-800">
                    {item.currentStock} <span className="font-normal text-gray-400 text-xs">{item.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.lowStockThreshold}</td>
                  <td className="px-4 py-3"><StockBadge item={item} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      <button onClick={() => setActionModal({ item, type: 'restock' })}
                        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium">+</button>
                      <button onClick={() => setActionModal({ item, type: 'deduct' })}
                        className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium">−</button>
                      <button onClick={() => setHistoryItem(item)}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 font-medium">History</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Add Inventory Item</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-3">
              {([
                { label: 'Item Name',             key: 'name',              type: 'text'   },
                { label: 'SKU',                   key: 'sku',               type: 'text'   },
                { label: 'Unit (e.g. bottles)',   key: 'unit',              type: 'text'   },
                { label: 'Initial Stock',         key: 'currentStock',      type: 'number' },
                { label: 'Low Stock Threshold',   key: 'lowStockThreshold', type: 'number' },
                { label: 'Venue ID (optional)',   key: 'venueId',           type: 'text'   },
              ] as const).map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type={type}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={(createForm as any)[key]}
                    onChange={e => setCreateForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm"
                  value={createForm.category} onChange={e => setCreateForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Business Scope</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm"
                  value={createForm.businessScope} onChange={e => setCreateForm(f => ({ ...f, businessScope: e.target.value }))}>
                  {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600">Cancel</button>
                <button onClick={handleCreate} disabled={submitting}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {submitting ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock action modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                {actionModal.type === 'restock' ? '+ Restock' : '− Deduct'} · {actionModal.item.name}
              </h3>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-gray-500">Current: <strong>{actionModal.item.currentStock} {actionModal.item.unit}</strong></p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                <input type="number" min="1"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={quantity} onChange={e => setQuantity(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason (optional)</label>
                <input type="text"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={reason} onChange={e => setReason(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setActionModal(null); setQuantity(''); setReason(''); }}
                  className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-600">Cancel</button>
                <button onClick={handleStockAction} disabled={submitting || !quantity}
                  className={`flex-1 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 ${actionModal.type === 'restock' ? 'bg-green-600' : 'bg-red-500'}`}>
                  {submitting ? '...' : actionModal.type === 'restock' ? 'Restock' : 'Deduct'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {historyItem && <HistoryDrawer item={historyItem} onClose={() => setHistoryItem(null)} />}
    </div>
  );
}