import { create } from 'zustand';
import { browserPersist, createBrowserStorage } from '@/lib/browser-storage';

/**
 * Checkout form data to persist across sessions
 * Only stores guest user form data - logged in users load from their profile
 */
export interface CheckoutFormData {
  fullName: string;
  phone: string;
  email: string;
  shippingAddress: string;
  shippingCountry: string;
  shippingRegion: string;
  shippingCity: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string;
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
  shippingCountry: '',
  shippingRegion: '',
  shippingCity: '',
  shippingAddressLine1: '',
  shippingAddressLine2: '',
  postalCode: '',
};

export const useCheckoutStore = create<CheckoutStore>()(
  browserPersist<
    CheckoutStore,
    Pick<CheckoutStore, 'formData' | '_hasHydrated'>
  >(
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
