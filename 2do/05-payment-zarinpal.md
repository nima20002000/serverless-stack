# Payment Integration (Zarinpal) Tasks

## Status: Not Started
**Priority**: High
**Estimated Complexity**: High

---

## Overview
Integrate Zarinpal payment gateway for processing transactions and handling payments.

---

## Tasks

### 1. Zarinpal Configuration
- [ ] Get Zarinpal merchant ID
- [ ] Add ZARINPAL_MERCHANT_ID to .env
- [ ] Create Zarinpal wrapper in `src/lib/zarinpal/client.ts`
- [ ] Configure sandbox mode for development
- [ ] Configure production mode settings
- [ ] Test API connectivity

### 2. Zarinpal Service Wrapper
- [ ] Create `src/lib/zarinpal/client.ts`
- [ ] Implement `createPayment(amount, description, callbackUrl)` function
- [ ] Implement `verifyPayment(authority)` function
- [ ] Handle API errors gracefully
- [ ] Add retry logic for failed requests
- [ ] Log all payment attempts

### 3. Transaction Service
- [ ] Create `src/services/transaction-service.ts`
- [ ] Implement `createTransaction(userId, items, amount)`
  - Generate unique transaction code
  - Create transaction record with PENDING status
  - Create transaction items
  - Return transaction ID
- [ ] Implement `updateTransactionStatus(id, status, authority)`
- [ ] Implement `verifyTransaction(authority, transactionId)`
- [ ] Implement `getTransactionByCode(code)`
- [ ] Implement `getUserTransactions(userId)`
- [ ] Implement `generateTransactionCode()` - unique alphanumeric

### 4. Payment API Endpoints
- [ ] POST `/api/transactions/create`
  - Validate cart items
  - Check stock availability
  - Create transaction in DB
  - Initiate Zarinpal payment
  - Return payment URL
- [ ] GET `/api/transactions/verify`
  - Verify payment with Zarinpal
  - Update transaction status
  - Reduce product stock
  - Generate invoice
  - Clear user's cart
  - Redirect to success/failure page
- [ ] GET `/api/transactions/[id]`
  - Get transaction details
  - Verify user owns transaction

### 5. Checkout Flow
- [ ] Create checkout page (`/app/(public)/checkout/page.tsx`)
- [ ] Display cart items summary
- [ ] Show total amount in Toman
- [ ] Add user information form (if needed)
- [ ] Validate stock before payment
- [ ] Create transaction on submit
- [ ] Redirect to Zarinpal
- [ ] Handle loading states

### 6. Payment Callback Handler
- [ ] Create callback/verify page (`/app/(public)/payment/verify/page.tsx`)
- [ ] Handle Zarinpal redirect with Authority & Status
- [ ] Verify payment with Zarinpal API
- [ ] Update transaction status
- [ ] Show success message with transaction code
- [ ] Show invoice download link
- [ ] Handle failed payments gracefully
- [ ] Redirect to appropriate page

### 7. Payment Success Page
- [ ] Create success page (`/app/(public)/payment/success/page.tsx`)
- [ ] Display transaction code
- [ ] Show order summary
- [ ] Display invoice download button
- [ ] Add "Continue Shopping" button
- [ ] Show estimated delivery info (optional)

### 8. Payment Failure Page
- [ ] Create failure page (`/app/(public)/payment/failure/page.tsx`)
- [ ] Display error message in Persian
- [ ] Show transaction code (if exists)
- [ ] Add "Try Again" button
- [ ] Add "Return to Cart" button
- [ ] Log failure reason

### 9. Transaction Code Generation
- [ ] Create unique code generator
- [ ] Format: `KT-XXXXXX` (e.g., KT-A1B2C3)
- [ ] Ensure uniqueness
- [ ] Add to transaction on creation

### 10. Stock Management
- [ ] Decrease stock after successful payment
- [ ] Handle concurrent stock updates
- [ ] Add transaction rollback if stock update fails
- [ ] Reserve stock during payment (optional)

### 11. Error Handling
- [ ] Handle Zarinpal API errors
- [ ] Handle network timeouts
- [ ] Handle insufficient stock during payment
- [ ] Handle duplicate payment attempts
- [ ] Log all errors for debugging

---

## Dependencies
- zarinpal-node-sdk (✅ Installed)
- Transaction model (✅ Done)
- Cart functionality (⏳ Pending)
- Product stock management (⏳ Pending)

---

## Zarinpal Flow
```
1. User clicks "Checkout"
2. Create transaction (PENDING)
3. Request payment from Zarinpal → Get Authority
4. Redirect user to Zarinpal payment page
5. User completes payment
6. Zarinpal redirects back with Authority & Status
7. Verify payment with Zarinpal
8. Update transaction (COMPLETED/FAILED)
9. Generate invoice if successful
10. Show success/failure page
```

---

## Environment Variables
```env
ZARINPAL_MERCHANT_ID=your-merchant-id
ZARINPAL_SANDBOX=true  # for development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## API Examples

### Create Payment Request
```typescript
POST /api/transactions/create
{
  "items": [
    { "productId": "...", "quantity": 2 }
  ]
}

Response:
{
  "success": true,
  "paymentUrl": "https://zarinpal.com/pg/StartPay/...",
  "transactionCode": "KT-ABC123"
}
```

### Verify Payment
```typescript
GET /api/transactions/verify?Authority=xxx&Status=OK

Response:
{
  "success": true,
  "transactionCode": "KT-ABC123",
  "refId": "123456789"
}
```

---

## Testing Checklist
- [ ] Can create transaction
- [ ] Zarinpal payment URL generated
- [ ] Redirect to Zarinpal works
- [ ] Sandbox payment completes
- [ ] Payment verification works
- [ ] Transaction status updates correctly
- [ ] Stock decreases after successful payment
- [ ] Invoice generated after payment
- [ ] Failed payment handled gracefully
- [ ] Transaction code is unique
- [ ] Concurrent purchases don't oversell stock
- [ ] User cannot pay twice for same transaction
- [ ] Callback URL works in production

---

## Notes
- Always use sandbox mode in development
- Test with Zarinpal test cards
- Keep transaction codes user-friendly
- Log all payment attempts for debugging
- Handle edge cases (duplicate callbacks, network failures)
- Add webhook support for async payment updates (future)
- Consider adding payment retry logic
- Store Zarinpal refID for reconciliation
