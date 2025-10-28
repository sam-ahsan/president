import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  setUser: (user) => {
    set({ user });
    if (user.token) {
      localStorage.setItem('auth_token', user.token);
    }
  },
  clearUser: () => {
    set({ user: null });
    localStorage.removeItem('auth_token');
  },
  isAuthenticated: () => {
    const { user } = get();
    return user !== null && user.token !== undefined;
  }
}));
