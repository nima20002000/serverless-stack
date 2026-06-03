import { create } from 'zustand';
import { browserPersist, createBrowserStorage } from '@/lib/browser-storage';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
}

interface UserStore {
  user: User | null;
  setUser: (user: User | null) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>()(
  browserPersist<UserStore>(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: 'user-storage',
      // Use browser-safe storage to prevent SSR errors
      storage: createBrowserStorage(),
    }
  )
);
