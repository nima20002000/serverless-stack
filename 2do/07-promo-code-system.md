# Promo Code System (First-Time Users) Tasks

## Status: Not Started
**Priority**: Medium
**Estimated Complexity**: Medium

---

## Overview
Implement first-time user promo code system with 24-hour timer and unique redemption codes.

---

## Tasks

### 1. Promo Service
- [ ] Create `src/services/promo-service.ts`
- [ ] Implement `generatePromoCode(userId)`
  - Generate unique promo code
  - Set 24-hour expiration
  - Create PromoCode record in DB
  - Return promo code data
- [ ] Implement `getActivePromoCode(userId)`
  - Check if user has active (unexpired, unused) promo
  - Return promo code or null
- [ ] Implement `validatePromoCode(code, userId)`
  - Check if code exists
  - Check if not expired
  - Check if not used
  - Check if belongs to user
- [ ] Implement `redeemPromoCode(code, userId)`
  - Mark code as used
  - Apply discount to transaction
  - Return discount amount
- [ ] Implement `generateUniqueCode()`
  - Format: `KITIA-XXXX` (e.g., KITIA-A1B2)
  - Ensure uniqueness
- [ ] Implement `checkPromoExpiration(userId)`
  - Return time remaining until expiration

### 2. Integration with Registration
- [ ] Update registration API endpoint
- [ ] After successful user creation, generate promo code
- [ ] Trigger promo code generation in background
- [ ] Handle errors gracefully

### 3. Promo Code Header Component
- [ ] Create `PromoHeader` component
- [ ] Display for users with active promo
- [ ] Show promo code prominently
- [ ] Add countdown timer (24 hours)
- [ ] Display in Persian
- [ ] Auto-hide when expired
- [ ] Add copy-to-clipboard button
- [ ] Show discount percentage/amount
- [ ] Style with attention-grabbing design

### 4. Countdown Timer Component
- [ ] Create `CountdownTimer` component
- [ ] Calculate time remaining
- [ ] Display: "XX ساعت و XX دقیقه باقی‌مانده"
- [ ] Update every minute
- [ ] Auto-hide when expired
- [ ] Use Persian numerals
- [ ] Show urgent state when < 1 hour remaining

### 5. Promo Banner/Header
- [ ] Add PromoHeader to root layout
- [ ] Position at top of page (sticky)
- [ ] Only show when user has active promo
- [ ] Fetch promo status on app load
- [ ] Update in real-time
- [ ] Add dismiss button (temporary hide)
- [ ] Persist dismiss state in sessionStorage

### 6. Promo Code Application
- [ ] Add promo code input to checkout page
- [ ] Validate promo code on submit
- [ ] Apply discount to total
- [ ] Show discount amount
- [ ] Update total dynamically
- [ ] Handle invalid/expired codes
- [ ] Show error messages in Persian

### 7. User Store Integration
- [ ] Add promo code state to user store
- [ ] Store active promo code
- [ ] Store expiration time
- [ ] Update on login/logout
- [ ] Clear on logout

### 8. Promo Code API Endpoints
- [ ] GET `/api/promo/active`
  - Get user's active promo code
  - Return code and expiration
- [ ] POST `/api/promo/validate`
  - Validate promo code
  - Return discount info
- [ ] POST `/api/promo/redeem`
  - Mark promo as used
  - Apply to transaction

### 9. Admin Promo Management
- [ ] View all promo codes in admin panel
- [ ] Filter: active, expired, used, unused
- [ ] Search by user email/code
- [ ] View promo code details
- [ ] See usage statistics
- [ ] Option to extend expiration (optional)
- [ ] Option to manually create promo codes (optional)

### 10. Promo Code Business Logic
- [ ] Define discount type (percentage/fixed amount)
  - Example: 10% off or 50,000 Toman off
- [ ] Set minimum purchase amount (optional)
- [ ] Prevent stacking with other promos (for now)
- [ ] Log all redemptions

---

## Dependencies
- PromoCode model (✅ Done)
- User registration (⏳ Pending)
- Checkout flow (⏳ Pending)
- User store (❌ Not created)

---

## Promo Code Format
```
KITIA-XXXX
Examples:
- KITIA-A1B2
- KITIA-X9Y3
- KITIA-M4N7
```
- 4 alphanumeric characters
- Easy to type and remember
- Unique per user

---

## Promo Header Design
```
┌─────────────────────────────────────────────┐
│ 🎉 کد تخفیف ویژه شما: KITIA-A1B2           │
│ ⏰ ۱۲ ساعت و ۳۰ دقیقه باقی‌مانده            │
│ 🔥 ۱۰٪ تخفیف برای اولین خرید               │
│ [کپی کردن] [استفاده در خرید]         [×]  │
└─────────────────────────────────────────────┘
```

---

## Discount Configuration
- First-time user discount: 10% or 50,000 Toman
- Valid for: 24 hours from registration
- One-time use only
- Applies to entire cart
- Minimum purchase: No minimum (or set minimum like 100,000 Toman)

---

## API Examples

### Get Active Promo
```typescript
GET /api/promo/active

Response:
{
  "hasPromo": true,
  "code": "KITIA-A1B2",
  "expiresAt": "2025-01-10T12:00:00Z",
  "discountType": "PERCENTAGE",
  "discountValue": 10,
  "isUsed": false
}
```

### Validate Promo
```typescript
POST /api/promo/validate
{
  "code": "KITIA-A1B2",
  "cartTotal": 200000
}

Response:
{
  "valid": true,
  "discountAmount": 20000,
  "finalTotal": 180000
}
```

---

## Testing Checklist
- [ ] Promo generated on user registration
- [ ] Promo code is unique
- [ ] Header displays for new users
- [ ] Countdown timer counts down correctly
- [ ] Timer shows Persian numerals
- [ ] Header hides when expired
- [ ] Can copy promo code to clipboard
- [ ] Can apply promo code at checkout
- [ ] Discount calculates correctly
- [ ] Cannot use expired promo
- [ ] Cannot use already-used promo
- [ ] Cannot use someone else's promo
- [ ] Header dismisses temporarily
- [ ] Promo marked as used after redemption
- [ ] Admin can view all promos
- [ ] Persian text displays correctly

---

## Notes
- Promo code is auto-generated, not user-chosen
- One promo per user (first-time only)
- Timer must be accurate (use server time)
- Consider timezone handling (use UTC, display in local)
- Show clear messaging about expiration
- Make header visually prominent but not annoying
- Add analytics to track promo usage
- Consider email reminder before expiration (future)
- Keep discount amount configurable for future changes
