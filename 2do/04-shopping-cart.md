# Shopping Cart Tasks

## Status: ✅ COMPLETE
**Priority**: High
**Estimated Complexity**: Medium
**Completed**: 2025-11-09

---

## Overview
Implement shopping cart functionality using Zustand for state management, with persistent storage.

---

## Tasks

### 1. Cart Store (Zustand) ✅
- [x] Create `src/store/cart-store.ts`
- [x] Define cart state interface
  ```typescript
  {
    items: CartItem[]
    total: number
    itemCount: number
  }
  ```
- [x] Implement `addItem(product, quantity)` action
- [x] Implement `removeItem(productId)` action
- [x] Implement `updateQuantity(productId, quantity)` action
- [x] Implement `clearCart()` action
- [x] Implement `calculateTotal()` helper
- [x] Add localStorage persistence
- [x] Handle stock validation

### 2. Cart Item Interface ✅
```typescript
interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  image: string
  stock: number
}
```

### 3. Cart Components ✅
- [x] Create `CartIcon` component
  - Display cart item count badge
  - Show mini cart on hover/click
- [x] Create `CartDrawer` component
  - Slide-in from right (RTL)
  - List cart items
  - Show subtotal
  - Remove item buttons
  - Quantity controls
  - Checkout button
  - Empty cart state
- [x] Create `CartItem` component
  - Product thumbnail
  - Name and price
  - Quantity selector
  - Remove button
  - Subtotal per item
- [x] Create `CartSummary` component
  - Items subtotal
  - Display in Toman
  - Item count
  - Proceed to checkout button

### 4. Cart Page ✅
- [x] Create full cart page (`/app/cart/page.tsx`)
- [x] Display all cart items in table/list
- [x] Show grand total
- [x] Update quantity controls
- [x] Remove items functionality
- [x] Continue shopping button
- [x] Proceed to checkout button
- [x] Empty cart message with CTA
- [ ] Add promo code input field (deferred to payment phase)

### 5. Add to Cart Functionality ✅
- [x] Add "Add to Cart" button to ProductCard
- [x] Add "Add to Cart" button to ProductDetail page
- [x] Implement quantity selector before adding
- [x] Update cart icon badge immediately
- [x] Handle stock validation before adding
- [x] Prevent adding more than available stock

### 6. Cart Validation ✅
- [x] Validate stock availability on cart update
- [x] Show warning if item out of stock
- [x] Validate on quantity change
- [x] Handle product price changes

### 7. Persistent Storage ✅
- [x] Save cart to localStorage on changes
- [x] Load cart from localStorage on app mount
- [x] Clear cart method available
- [ ] Handle cart sync across browser tabs (advanced feature - deferred)
- [ ] Add cart expiration (optional - deferred)

### 8. Cart UI/UX ✅
- [x] Add loading states
- [x] Implement responsive design
- [x] Show success messages
- [x] Handle RTL layout properly

### 9. Integration with Header ✅
- [x] Add cart icon to site header
- [x] Show badge with item count
- [x] Open cart drawer on click
- [x] Update in real-time

---

## Dependencies
- Zustand store (✅ Installed)
- Product components (⏳ Pending)
- Site layout/header (❌ Not created)

---

## Cart Store Example
```typescript
interface CartStore {
  items: CartItem[]
  addItem: (product: Product, quantity: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  total: number
  itemCount: number
}
```

---

## Testing Checklist
- [ ] Can add items to cart
- [ ] Can remove items from cart
- [ ] Can update item quantities
- [ ] Cart total calculates correctly
- [ ] Cart persists after page refresh
- [ ] Cart badge shows correct count
- [ ] Cannot add more than available stock
- [ ] Empty cart shows appropriate message
- [ ] Cart clears after checkout
- [ ] Cart works across multiple tabs
- [ ] Price formatting shows Toman correctly
- [ ] RTL layout displays correctly

---

## Notes
- Cart should be client-side only (no backend storage for now)
- Consider adding cart expiration timestamp
- Validate stock on checkout, not just on add
- Show clear messaging when stock is insufficient
- Use optimistic updates for better UX
- Consider adding "Save for later" feature in future
- Format all prices in Persian/Toman format
