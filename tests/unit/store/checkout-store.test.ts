import { describe, it, expect, beforeEach } from 'vitest';
import { useCheckoutStore } from '@/store/checkout-store';

describe('checkout-store', () => {
  beforeEach(() => {
    useCheckoutStore.setState({
      formData: {
        fullName: '',
        phone: '',
        email: '',
        shippingAddress: '',
        postalCode: '',
      },
      promoCode: null,
      _hasHydrated: false,
    });
  });

  it('merges form data updates', () => {
    useCheckoutStore.getState().setFormData({ fullName: 'User' });
    useCheckoutStore.getState().setFormData({ phone: '+1202555' });

    const formData = useCheckoutStore.getState().formData;
    expect(formData.fullName).toBe('User');
    expect(formData.phone).toBe('+1202555');
  });

  it('clears form data', () => {
    useCheckoutStore.getState().setFormData({ fullName: 'User' });
    useCheckoutStore.getState().clearFormData();

    const formData = useCheckoutStore.getState().formData;
    expect(formData.fullName).toBe('');
    expect(formData.phone).toBe('');
  });

  it('sets and clears promo code', () => {
    useCheckoutStore.getState().setPromoCode({
      code: 'SAVE10',
      discountType: 'PERCENT',
      discountValue: 10,
      discountAmount: 1000,
    });

    expect(useCheckoutStore.getState().promoCode?.code).toBe('SAVE10');

    useCheckoutStore.getState().clearPromoCode();
    expect(useCheckoutStore.getState().promoCode).toBeNull();
  });

  it('updates hydration flag', () => {
    useCheckoutStore.getState().setHasHydrated(true);
    expect(useCheckoutStore.getState()._hasHydrated).toBe(true);
  });
});
