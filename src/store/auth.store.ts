import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/types';
import { apiClient } from '@/services/api';
import { queryClient } from '@/components/providers/query-provider';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  sessionRestored: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  restoreSession: () => Promise<void>;
  clearSession: () => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
      sessionRestored: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await apiClient.login(email, password);
          // Defense-in-depth: also clear here, not just on logout, in case
          // the previous session ended without a clean logout (browser
          // closed, token expired) and stale cache is still sitting around.
          queryClient.clear();
          set({
            user: res.user,
            isAuthenticated: true,
            isLoading: false,
            sessionRestored: true,
          });
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.message ||
            error?.message ||
            'Login failed';
          set({
            error: errorMessage,
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await apiClient.logout();
        } catch {
          // ignore
        } finally {
          // Wipe every cached query — otherwise the next user to log in on
          // this same browser tab can briefly see the previous user's
          // cached dashboard/orders/etc. data before the fresh fetch lands.
          queryClient.clear();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            sessionRestored: false,
          });
        }
      },

      clearError: () => set({ error: null }),

      // Wipes persisted auth state. Called when the accessToken cookie is
      // missing so a stale localStorage copy of isAuthenticated/user can't
      // fight the route-guard logic and cause a login/dashboard redirect loop.
      clearSession: () =>
        set({
          user: null,
          isAuthenticated: false,
          sessionRestored: false,
        }),

      restoreSession: async () => {
        const { sessionRestored, user } = get();
        if (sessionRestored && user) return; // already restored

        set({ isLoading: true });
        try {
          const profile = await apiClient.getMe();
          set({
            user: profile,
            isAuthenticated: true,
            isLoading: false,
            sessionRestored: true,
          });
        } catch {
          // Token invalid/expired — clear auth state
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            sessionRestored: true,
          });
        }
      },
    }),
    {
      name: 'dlifestyle-admin-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export default useAuthStore;