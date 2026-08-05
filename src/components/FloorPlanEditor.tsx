'use client';

import { useState, useRef, useEffect } from 'react';
import type { Venue, TableListing } from '@/types';
import { apiClient } from '@/services/api';
import useUIStore from '@/store/ui.store';

interface FloorPlanEditorProps {
  venue: Venue;
  tables: TableListing[];
  onSaved: () => void;
  readOnly?: boolean;
}

export default function FloorPlanEditor({ venue, tables, onSaved, readOnly = false }: FloorPlanEditorProps) {
  const addToast = useUIStore(s => s.addToast);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const [tablePositions, setTablePositions] = useState<Record<string, { x: number; y: number; rotation: number; width: number; height: number }>>({});
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [hasFloorPlan, setHasFloorPlan] = useState(venue.hasFloorPlan || false);

  // Initialize table positions from venue floorPlanData or defaults
  useEffect(() => {
    const positions: Record<string, any> = {};
    if (venue.floorPlanData?.tables) {
      venue.floorPlanData.tables.forEach((t) => {
        positions[t.tableId] = {
          x: t.x,
          y: t.y,
          rotation: t.rotation,
          width: t.width,
          height: t.height,
        };
      });
    } else {
      // Auto-layout tables in a grid
      tables.forEach((table, index) => {
        const cols = Math.floor(canvasSize.width / 150);
        const row = Math.floor(index / cols);
        const col = index % cols;
        positions[table.id] = {
          x: 50 + col * 150,
          y: 50 + row * 120,
          rotation: 0,
          width: 120,
          height: 80,
        };
      });
    }
    setTablePositions(positions);
  }, [venue, tables, canvasSize.width]);

  const handleMouseDown = (tableId: string, e: React.MouseEvent) => {
    if (readOnly) return;
    e.preventDefault();
    setSelectedTable(tableId);
    setIsDragging(true);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedTable || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left - dragOffset.x;
    const y = e.clientY - canvasRect.top - dragOffset.y;

    setTablePositions((prev) => ({
      ...prev,
      [selectedTable]: {
        ...prev[selectedTable],
        x: Math.max(0, Math.min(x, canvasSize.width - 120)),
        y: Math.max(0, Math.min(y, canvasSize.height - 80)),
      },
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleRotate = () => {
    if (!selectedTable) return;
    setTablePositions((prev) => ({
      ...prev,
      [selectedTable]: {
        ...prev[selectedTable],
        rotation: ((prev[selectedTable]?.rotation || 0) + 45) % 360,
      },
    }));
  };

  const handleResize = (direction: 'larger' | 'smaller') => {
    if (!selectedTable) return;
    setTablePositions((prev) => {
      const pos = prev[selectedTable];
      const scale = direction === 'larger' ? 1.1 : 0.9;
      return {
        ...prev,
        [selectedTable]: {
          ...pos,
          width: Math.max(60, Math.min(300, pos.width * scale)),
          height: Math.max(40, Math.min(200, pos.height * scale)),
        },
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save venue floor plan data
      await apiClient.venues.updateFloorPlan(venue.id, {
        hasFloorPlan,
        floorPlanData: {
          width: canvasSize.width,
          height: canvasSize.height,
          tables: Object.entries(tablePositions).map(([tableId, pos]) => ({
            tableId,
            x: pos.x,
            y: pos.y,
            rotation: pos.rotation,
            width: pos.width,
            height: pos.height,
          })),
        },
      });

      // Save individual table positions. Use allSettled so one failing
      // table doesn't silently swallow the rest of the save.
      const results = await Promise.allSettled(
        Object.entries(tablePositions).map(([tableId, pos]) =>
          apiClient.tables.updatePosition(tableId, pos as any),
        ),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;

      if (failed > 0) {
        addToast(
          `Floor plan saved, but ${failed} table position${failed > 1 ? 's' : ''} failed to save. Try again.`,
          'warning',
        );
      } else {
        addToast('Floor plan saved', 'success');
      }
      onSaved();
    } catch (error: any) {
      addToast(error?.response?.data?.message ?? 'Failed to save floor plan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      standard: 'bg-blue-200 border-blue-400',
      vip: 'bg-purple-200 border-purple-400',
      vvip: 'bg-yellow-200 border-yellow-400',
      booth: 'bg-green-200 border-green-400',
      private: 'bg-red-200 border-red-400',
    };
    return colors[category] || 'bg-gray-200 border-gray-400';
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
        <div className="flex items-center gap-3">
          {!readOnly && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasFloorPlan}
                onChange={(e) => setHasFloorPlan(e.target.checked)}
                className="rounded"
              />
              Enable Floor Plan
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="rounded"
            />
            Show Grid
          </label>
        </div>

        <div className="flex items-center gap-2">
          {readOnly ? (
            <span className="text-xs text-gray-400 italic">Read-only — view only</span>
          ) : (
            <>
              {selectedTable && (
                <>
                  <button
                    onClick={handleRotate}
                    className="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200"
                  >
                    ↻ Rotate
                  </button>
                  <button
                    onClick={() => handleResize('larger')}
                    className="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200"
                  >
                    + Resize
                  </button>
                  <button
                    onClick={() => handleResize('smaller')}
                    className="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200"
                  >
                    - Resize
                  </button>
                </>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Floor Plan'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative bg-white border-2 border-gray-300 rounded-lg overflow-hidden"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          maxWidth: '100%',
          backgroundImage: showGrid
            ? 'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)'
            : 'none',
          backgroundSize: '50px 50px',
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Tables */}
        {tables.map((table) => {
          const pos = tablePositions[table.id];
          if (!pos) return null;

          return (
            <div
              key={table.id}
              className={`absolute ${readOnly ? 'cursor-default' : 'cursor-move'} border-2 rounded-lg shadow-md hover:shadow-lg transition-shadow ${getCategoryColor(table.category)} ${
                selectedTable === table.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''
              }`}
              style={{
                left: pos.x,
                top: pos.y,
                width: pos.width,
                height: pos.height,
                transform: `rotate(${pos.rotation}deg)`,
              }}
              onMouseDown={(e) => handleMouseDown(table.id, e)}
            >
              <div className="p-2 text-center">
                <div className="text-xs font-semibold truncate">{table.name}</div>
                <div className="text-xs opacity-75">{table.capacity} ppl</div>
              </div>
            </div>
          );
        })}

        {tables.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            No tables available. Create tables first.
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm bg-white p-3 rounded-lg border">
        <span className="font-medium">Legend:</span>
        {['standard', 'vip', 'vvip', 'booth', 'private'].map((cat) => (
          <div key={cat} className="flex items-center gap-1">
            <div className={`w-4 h-3 rounded ${getCategoryColor(cat)}`} />
            <span className="capitalize">{cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
