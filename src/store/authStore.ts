import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  hasPermission: (permission: 'finance' | 'settings' | 'users' | 'delete' | 'export') => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),
      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        if (user.role === 'owner') return true;
        if (user.role === 'cashier') {
          return ['delete', 'finance', 'settings', 'users', 'export'].includes(permission) === false;
        }
        // employee
        const denied = ['finance', 'settings', 'users', 'delete', 'export'];
        return !denied.includes(permission);
      },
    }),
    { name: 'bridal-auth', partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }) }
  )
);
