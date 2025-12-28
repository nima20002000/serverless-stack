import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createBrowserStorage } from '@/lib/browser-storage';

/**
 * Checkout form data to persist across sessions
 * Only stores guest user form data - logged in users load from their profile
 */
export interface CheckoutFormData {
  fullName: string;
  phone: string;
  email: string;
  shippingAddress: string;
  postalCode: string;
}

interface CheckoutStore {
  formData: CheckoutFormData;
  _hasHydrated: boolean;
  setFormData: (data: Partial<CheckoutFormData>) => void;
  clearFormData: () => void;
  setHasHydrated: (state: boolean) => void;
}

const initialFormData: CheckoutFormData = {
  fullName: '',
  phone: '',
  email: '',
  shippingAddress: '',
  postalCode: '',
};

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set) => ({
      formData: initialFormData,
      _hasHydrated: false,

      setFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),

      clearFormData: () => set({ formData: initialFormData }),

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'checkout-storage',
      storage: createBrowserStorage(),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
