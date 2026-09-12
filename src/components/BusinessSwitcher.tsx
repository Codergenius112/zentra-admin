'use client';

import { useState, useRef, useEffect } from 'react';
import useBusinessStore from '@/store/business.store';

// Shown in the dashboard sidebar. Hidden entirely when the caller only has
// one business (the common case) — no picker needed, nothing to switch
// between. Appears once a second business (owned or assigned-to) exists.
export function BusinessSwitcher() {
  const { businesses, activeBusinessId, setActiveBusiness } = useBusinessStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (businesses.length <= 1) return null;

  const active = businesses.find((b) => b.id === activeBusinessId);

  return (
    <div className="relative px-4 pb-3" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-blue-800/60 hover:bg-blue-800 text-left text-sm transition"
      >
        <div className="min-w-0">
          <div className="text-blue-200 text-[10px] uppercase tracking-wide">Business</div>
          <div className="truncate font-medium">{active?.name ?? 'Select a business'}</div>
        </div>
        <span className="text-blue-300 text-xs ml-2">▾</span>
      </button>

      {open && (
        <div className="absolute left-4 right-4 mt-1 bg-white rounded-lg shadow-xl border overflow-hidden z-50">
          {businesses.map((b) => (
            <button
              key={b.id}
              onClick={() => { setActiveBusiness(b.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${
                b.id === activeBusinessId ? 'bg-blue-50' : ''
              }`}
            >
              <span className="truncate text-gray-800">{b.name}</span>
              <span className={`ml-2 shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                b.isOwner ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {b.isOwner ? 'Owner' : 'Staff'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
