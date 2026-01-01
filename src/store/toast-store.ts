import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },
}));

// Helper functions for easy toast creation
export const toast = {
  success: (
    message: string,
    options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>
  ) => {
    return useToastStore
      .getState()
      .addToast({ type: 'success', message, ...options });
  },
  error: (
    message: string,
    options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>
  ) => {
    return useToastStore
      .getState()
      .addToast({ type: 'error', message, ...options });
  },
  warning: (
    message: string,
    options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>
  ) => {
    return useToastStore
      .getState()
      .addToast({ type: 'warning', message, ...options });
  },
  info: (
    message: string,
    options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>
  ) => {
    return useToastStore
      .getState()
      .addToast({ type: 'info', message, ...options });
  },
};
