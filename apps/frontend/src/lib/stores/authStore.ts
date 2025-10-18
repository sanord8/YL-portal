import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: Date | null;
  twoFactorEnabled: boolean;
  createdAt: Date;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,

    /**
     * Check if user is authenticated by calling /api/auth/me
     */
    async checkAuth() {
      if (!browser) return;

      update((state) => ({ ...state, isLoading: true }));

      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    },

    /**
     * Login user with email and password
     */
    async login(email: string, password: string, rememberMe: boolean = false) {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password, rememberMe }),
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
          return { success: false, error: data.message || 'Login failed' };
        }
      } catch (error) {
        console.error('Login error:', error);
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
     */
    async logout() {
      try {
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
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    },

    /**
     * Update user data in store
     */
    updateUser(user: User) {
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
