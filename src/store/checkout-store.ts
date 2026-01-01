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

export interface AppliedPromoCode {
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  discountAmount: number;
}

interface CheckoutStore {
  formData: CheckoutFormData;
  promoCode: AppliedPromoCode | null;
  _hasHydrated: boolean;
  setFormData: (data: Partial<CheckoutFormData>) => void;
  clearFormData: () => void;
  setPromoCode: (promo: AppliedPromoCode | null) => void;
  clearPromoCode: () => void;
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
      promoCode: null,
      _hasHydrated: false,

      setFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),

      clearFormData: () => set({ formData: initialFormData }),

      setPromoCode: (promo) => set({ promoCode: promo }),

      clearPromoCode: () => set({ promoCode: null }),

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'checkout-storage',
      storage: createBrowserStorage(),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      // Don't persist promo code - it should be validated fresh each session
      partialize: (state) => ({
        formData: state.formData,
        _hasHydrated: state._hasHydrated,
      }),
    }
  )
);
