/**
 * Auth Store — Zustand
 *
 * Manages authenticated user state.
 * Tokens are stored in expo-secure-store (see services/api.ts).
 * This store holds the in-memory user state for the current session.
 */
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEYS, clearTokens, setAuthCallbacks } from '../services/api';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  rehydrate: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => {
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    await clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (updates) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...updates } });
    }
  },

  /**
   * Called on app start to check if there's a valid stored token.
   * If so, mark as authenticated. The app will then fetch user profile.
   */
  rehydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
      if (token) {
        // We have a token — consider authenticated. Let the profile fetch
        // confirm validity and handle 401 via the interceptor if expired.
        set({ isAuthenticated: true });
      }
    } catch {
      // Secure store unavailable — stay logged out
    } finally {
      set({ isLoading: false });
    }
  },
}));

// Wire up auth callbacks so the API client can trigger logout on token expiry
// This is called once during app initialization (_layout.tsx)
export function initAuthCallbacks(): void {
  const store = useAuthStore.getState();
  setAuthCallbacks(
    () => store.logout(),
    (_newToken: string) => {
      // Token was refreshed — no state change needed, new token is in SecureStore
    },
  );
}
