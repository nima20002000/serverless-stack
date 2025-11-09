# Shopping Cart Tasks

## Status: Not Started
**Priority**: High
**Estimated Complexity**: Medium

---

## Overview
Implement shopping cart functionality using Zustand for state management, with persistent storage.

---

## Tasks

### 1. Cart Store (Zustand)
- [ ] Create `src/store/cart-store.ts`
- [ ] Define cart state interface
  ```typescript
  {
    items: CartItem[]
    total: number
    itemCount: number
  }
  ```
- [ ] Implement `addItem(product, quantity)` action
- [ ] Implement `removeItem(productId)` action
- [ ] Implement `updateQuantity(productId, quantity)` action
- [ ] Implement `clearCart()` action
- [ ] Implement `calculateTotal()` helper
- [ ] Add localStorage persistence
- [ ] Handle stock validation

### 2. Cart Item Interface
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

### 3. Cart Components
- [ ] Create `CartIcon` component
  - Display cart item count badge
  - Show mini cart on hover/click
- [ ] Create `CartDrawer` component
  - Slide-in from right (RTL)
  - List cart items
  - Show subtotal
  - Remove item buttons
  - Quantity controls
  - Checkout button
  - Empty cart state
- [ ] Create `CartItem` component
  - Product thumbnail
  - Name and price
  - Quantity selector
  - Remove button
  - Subtotal per item
- [ ] Create `CartSummary` component
  - Items subtotal
  - Display in Toman
  - Item count
  - Proceed to checkout button

### 4. Cart Page
- [ ] Create full cart page (`/app/(public)/cart/page.tsx`)
- [ ] Display all cart items in table/list
- [ ] Show grand total
- [ ] Add promo code input field
- [ ] Update quantity controls
- [ ] Remove items functionality
- [ ] Continue shopping button
- [ ] Proceed to checkout button
- [ ] Empty cart message with CTA

### 5. Add to Cart Functionality
- [ ] Add "Add to Cart" button to ProductCard
- [ ] Add "Add to Cart" button to ProductDetail page
- [ ] Implement quantity selector before adding
- [ ] Show success toast/notification
- [ ] Update cart icon badge immediately
- [ ] Handle stock validation before adding
- [ ] Prevent adding more than available stock

### 6. Cart Validation
- [ ] Validate stock availability on cart update
- [ ] Show warning if item out of stock
- [ ] Auto-adjust quantity if stock decreased
- [ ] Validate on checkout button click
- [ ] Handle product price changes

### 7. Persistent Storage
- [ ] Save cart to localStorage on changes
- [ ] Load cart from localStorage on app mount
- [ ] Handle cart sync across browser tabs
- [ ] Clear cart after successful purchase
- [ ] Add cart expiration (optional, e.g., 7 days)

### 8. Cart UI/UX
- [ ] Add loading states
- [ ] Add animations (add/remove items)
- [ ] Implement responsive design
- [ ] Add confirmation for remove actions
- [ ] Show success messages
- [ ] Handle RTL layout properly

### 9. Integration with Header
- [ ] Add cart icon to site header
- [ ] Show badge with item count
- [ ] Open cart drawer on click
- [ ] Update in real-time

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
