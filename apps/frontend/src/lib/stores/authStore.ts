import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: Date | null;
  twoFactorEnabled: boolean;
  isAdmin: boolean;
  createdAt: Date;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface CachedAuthData {
  user: User;
  timestamp: number;
}

// localStorage keys
const AUTH_CACHE_KEY = 'yl_auth_state';
const AUTH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Check for session cookie on initialization for faster state detection
function hasSessionCookie(): boolean {
  if (!browser) return false;
  const cookies = document.cookie.split(';');
  return cookies.some((c) => c.trim().startsWith('yl_session='));
}

// Load auth state from localStorage cache
function loadCachedAuthState(): AuthState {
  if (!browser) {
    return { user: null, isAuthenticated: false, isLoading: false };
  }

  try {
    const cached = localStorage.getItem(AUTH_CACHE_KEY);
    if (cached) {
      const { user, timestamp }: CachedAuthData = JSON.parse(cached);

      // Use cached state if < 5 minutes old AND session cookie exists
      if (Date.now() - timestamp < AUTH_CACHE_TTL && hasSessionCookie()) {
        return {
          user,
          isAuthenticated: true,
          isLoading: false,
        };
      }
    }
  } catch (error) {
    console.error('Failed to load cached auth state:', error);
  }

  // No valid cache - start with loading state if session cookie exists
  return {
    user: null,
    isAuthenticated: false,
    isLoading: hasSessionCookie(),
  };
}

const initialState: AuthState = loadCachedAuthState();

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,

    /**
     * Check if user is authenticated by calling /api/auth/me
     * Uses localStorage cache for instant auth restoration (5x faster initial load)
     */
    async checkAuth() {
      if (!browser) return;

      // Quick check: if no session cookie, immediately set not authenticated
      if (!hasSessionCookie()) {
        localStorage.removeItem(AUTH_CACHE_KEY);
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      // Check cache first
      try {
        const cached = localStorage.getItem(AUTH_CACHE_KEY);
        if (cached) {
          const { user, timestamp }: CachedAuthData = JSON.parse(cached);

          // Use cache if < 5 minutes old
          if (Date.now() - timestamp < AUTH_CACHE_TTL) {
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
            });
            return; // Skip API call
          }
        }
      } catch (error) {
        console.error('Cache read error:', error);
      }

      // Cache miss or expired - validate with server
      update((state) => ({ ...state, isLoading: true }));

      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const user = data.user;

          // Cache the result
          try {
            localStorage.setItem(
              AUTH_CACHE_KEY,
              JSON.stringify({
                user,
                timestamp: Date.now(),
              } as CachedAuthData)
            );
          } catch (error) {
            console.error('Cache write error:', error);
          }

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          localStorage.removeItem(AUTH_CACHE_KEY);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem(AUTH_CACHE_KEY);
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    },

    /**
     * Login user with email and password
     * Caches auth state for instant subsequent loads
     */
    async login(email: string, password: string, rememberMe: boolean = false) {
      try {
        console.log('[AuthStore] Initiating login request for:', email);
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password, rememberMe }),
        });

        console.log('[AuthStore] Response status:', response.status, response.statusText);
        const data = await response.json();
        console.log('[AuthStore] Response data:', data);

        if (response.ok) {
          const user = data.user;
          console.log('[AuthStore] Login successful, user:', user);

          // Cache auth state
          try {
            localStorage.setItem(
              AUTH_CACHE_KEY,
              JSON.stringify({
                user,
                timestamp: Date.now(),
              } as CachedAuthData)
            );
            console.log('[AuthStore] Auth state cached in localStorage');
          } catch (error) {
            console.error('[AuthStore] Cache write error:', error);
          }

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
          console.log('[AuthStore] Auth store updated, isAuthenticated = true');
          return { success: true, data };
        } else {
          console.error('[AuthStore] Login failed, status:', response.status, 'message:', data.message);
          return { success: false, error: data.message || 'Login failed' };
        }
      } catch (error) {
        console.error('[AuthStore] Login error (exception):', error);
        return { success: false, error: 'An error occurred during login' };
      }
    },

    /**
     * Register new user
     */
    async register(name: string, email: string, password: string) {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json();

        if (response.ok) {
          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true, data };
        } else {
          return { success: false, error: data.message || 'Registration failed' };
        }
      } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error: 'An error occurred during registration' };
      }
    },

    /**
     * Logout current user
     * Clears cache for instant logout effect
     */
    async logout() {
      try {
        // Clear cache immediately for instant logout
        localStorage.removeItem(AUTH_CACHE_KEY);

        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });

        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      } catch (error) {
        console.error('Logout error:', error);
        // Still clear local state even if API call fails
        localStorage.removeItem(AUTH_CACHE_KEY);
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    },

    /**
     * Update user data in store
     * Updates cache to keep it in sync
     */
    updateUser(user: User) {
      // Update cache
      try {
        localStorage.setItem(
          AUTH_CACHE_KEY,
          JSON.stringify({
            user,
            timestamp: Date.now(),
          } as CachedAuthData)
        );
      } catch (error) {
        console.error('Cache write error:', error);
      }

      update((state) => ({
        ...state,
        user,
      }));
    },

    /**
     * Reset store to initial state
     */
    reset() {
      set(initialState);
    },
  };
}

export const authStore = createAuthStore();
