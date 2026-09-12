import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Business } from '@/types';
import { apiClient, setActiveBusinessIdForRequests } from '@/services/api';

interface BusinessState {
  businesses: Business[];
  activeBusinessId: string | null;
  isLoading: boolean;
  loaded: boolean;

  fetchBusinesses: () => Promise<void>;
  setActiveBusiness: (id: string) => void;
  clear: () => void;
}

const useBusinessStore = create<BusinessState>()(
  persist(
    (set, get) => ({
      businesses: [],
      activeBusinessId: null,
      isLoading: false,
      loaded: false,

      fetchBusinesses: async () => {
        set({ isLoading: true });
        try {
          const res = await apiClient.businesses.list() as any;
          const businesses: Business[] = res.data ?? res ?? [];
          const { activeBusinessId } = get();

          // Keep the persisted selection if it's still valid; otherwise
          // default to the caller's sole business (the common case — no
          // picker needed), or leave unset if they have several and
          // nothing was previously chosen (the switcher will prompt).
          const stillValid = activeBusinessId && businesses.some((b) => b.id === activeBusinessId);
          const nextActiveId = stillValid
            ? activeBusinessId
            : (businesses.length === 1 ? businesses[0].id : null);

          set({ businesses, activeBusinessId: nextActiveId, isLoading: false, loaded: true });
          setActiveBusinessIdForRequests(nextActiveId);
        } catch {
          set({ isLoading: false, loaded: true });
        }
      },

      setActiveBusiness: (id: string) => {
        set({ activeBusinessId: id });
        setActiveBusinessIdForRequests(id);
      },

      clear: () => {
        set({ businesses: [], activeBusinessId: null, loaded: false });
        setActiveBusinessIdForRequests(null);
      },
    }),
    {
      name: 'dlifestyle-admin-business',
      storage: createJSONStorage(() => localStorage),
      // Only the selection needs to survive a refresh — the business list
      // itself is always re-fetched fresh so it can't go stale (e.g. after
      // a share is granted/revoked or a new business is onboarded).
      partialize: (state) => ({ activeBusinessId: state.activeBusinessId }),
      // Rehydration sets zustand state directly, bypassing setActiveBusiness
      // — sync the api client's module-level copy here too, so the
      // X-Business-Id header is correct from the very first request after
      // a page refresh, not just once fetchBusinesses() has resolved.
      onRehydrateStorage: () => (state) => {
        if (state?.activeBusinessId) setActiveBusinessIdForRequests(state.activeBusinessId);
      },
    },
  ),
);

export default useBusinessStore;
