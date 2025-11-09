# Payment Integration (Zarinpal) Tasks

## Status: ✅ COMPLETE
**Priority**: High
**Estimated Complexity**: High
**Completed**: 2025-11-09

---

## Overview
Integrate Zarinpal payment gateway for processing transactions and handling payments.

---

## Tasks

### 1. Zarinpal Configuration
- [x] Get Zarinpal merchant ID
- [x] Add ZARINPAL_MERCHANT_ID to .env
- [x] Create Zarinpal wrapper in `src/lib/zarinpal/client.ts`
- [x] Configure sandbox mode for development
- [x] Configure production mode settings
- [x] Test API connectivity

### 2. Zarinpal Service Wrapper
- [x] Create `src/lib/zarinpal/client.ts`
- [x] Implement `createPayment(amount, description, callbackUrl)` function
- [x] Implement `verifyPayment(authority)` function
- [x] Handle API errors gracefully
- [x] Add retry logic for failed requests
- [x] Log all payment attempts

### 3. Transaction Service
- [x] Create `src/services/transaction-service.ts`
- [x] Implement `createTransaction(userId, items, amount)`
  - Generate unique transaction code
  - Create transaction record with PENDING status
  - Create transaction items
  - Return transaction ID
- [x] Implement `updateTransactionStatus(id, status, authority)`
- [x] Implement `verifyTransaction(authority, transactionId)`
- [x] Implement `getTransactionByCode(code)`
- [x] Implement `getUserTransactions(userId)`
- [x] Implement `generateTransactionCode()` - unique alphanumeric

### 4. Payment API Endpoints
- [x] POST `/api/transactions/create`
  - Validate cart items
  - Check stock availability
  - Create transaction in DB
  - Initiate Zarinpal payment
  - Return payment URL
- [x] GET `/api/transactions/verify`
  - Verify payment with Zarinpal
  - Update transaction status
  - Reduce product stock
  - Generate invoice
  - Clear user's cart
  - Redirect to success/failure page
- [x] GET `/api/transactions/[id]`
  - Get transaction details
  - Verify user owns transaction

### 5. Checkout Flow
- [x] Create checkout page (`/app/checkout/page.tsx`)
- [x] Display cart items summary
- [x] Show total amount in Toman
- [x] Add user information form (if needed)
- [x] Validate stock before payment
- [x] Create transaction on submit
- [x] Redirect to Zarinpal
- [x] Handle loading states

### 6. Payment Callback Handler
- [x] Create callback/verify page (`/app/payment/verify/page.tsx`)
- [x] Handle Zarinpal redirect with Authority & Status
- [x] Verify payment with Zarinpal API
- [x] Update transaction status
- [x] Show success message with transaction code
- [x] Show invoice download link
- [x] Handle failed payments gracefully
- [x] Redirect to appropriate page

### 7. Payment Success Page
- [x] Create success page (`/app/payment/success/page.tsx`)
- [x] Display transaction code
- [x] Show order summary
- [x] Display invoice download button
- [x] Add "Continue Shopping" button
- [x] Show estimated delivery info (optional)

### 8. Payment Failure Page
- [x] Create failure page (`/app/payment/failure/page.tsx`)
- [x] Display error message in Persian
- [x] Show transaction code (if exists)
- [x] Add "Try Again" button
- [x] Add "Return to Cart" button
- [x] Log failure reason

### 9. Transaction Code Generation
- [x] Create unique code generator
- [x] Format: `KT-XXXXXX` (e.g., KT-A1B2C3)
- [x] Ensure uniqueness
- [x] Add to transaction on creation

### 10. Stock Management
- [x] Decrease stock after successful payment
- [x] Handle concurrent stock updates
- [x] Add transaction rollback if stock update fails
- [x] Reserve stock during payment (optional)

### 11. Error Handling
- [x] Handle Zarinpal API errors
- [x] Handle network timeouts
- [x] Handle insufficient stock during payment
- [x] Handle duplicate payment attempts
- [x] Log all errors for debugging

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
- [x] Can create transaction
- [x] Zarinpal payment URL generated
- [x] Redirect to Zarinpal works
- [x] Sandbox payment completes
- [x] Payment verification works
- [x] Transaction status updates correctly
- [x] Stock decreases after successful payment
- [x] Invoice generated after payment
- [x] Failed payment handled gracefully
- [x] Transaction code is unique
- [x] Concurrent purchases don't oversell stock
- [x] User cannot pay twice for same transaction
- [x] Callback URL works in production

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
