# Task 000: Integration Testing Framework - Test Implementation

## ✅ CURRENT STATUS

### Completed Tests (11/12):
- ✅ **auth-service.test.ts** - 16/16 tests passing
  - User Registration (4 tests)
  - Password Authentication (5 tests)
  - OTP Authentication (2 tests)
  - Orphaned Transaction Linking (1 test)
  - Edge Cases and Error Scenarios (4 tests)
- ✅ **product-service.test.ts** - 28/28 tests passing
  - Product CRUD Operations (5 tests)
  - Product Queries and Filtering (6 tests)
  - Product Variants (6 tests)
  - Product Media (4 tests)
  - Edge Cases and Error Scenarios (4 tests)
  - Pagination and Ordering (2 tests)
  - **FIXED**: Resolved cleanup hang issue (Supabase subquery incompatibility)
  - **FIXED**: Corrected field name in test (amount vs totalAmount)
- ✅ **otp-service.test.ts** - 9/9 tests passing
  - Email OTP Sending and Storage (1 test)
  - SMS OTP Delivery (success or provider failure cleanup) (1 test)
  - Invalid Identifier Handling (1 test)
  - Delivery Failure Handling (1 test)
  - Rate Limiting (1 test)
  - OTP Verification Success (1 test)
  - Attempt Tracking (1 test)
  - Max Attempts Enforcement (1 test)
  - Expiration Handling (1 test)
  - Note: Provider failure paths are simulated via `TEST_OTP_FORCE_SEND_FAIL` in test env.
  - Note: SMS delivery must succeed unless `TEST_SMS_ALLOW_FAIL=true`.
  - Note: Latest run did not use `TEST_SMS_ALLOW_FAIL` (SMS delivery succeeded).
- ✅ **user-service.test.ts** - 11/11 tests passing
  - User Creation (2 tests)
  - User Retrieval (1 test)
  - Duplicate User Rejection (1 test)
  - Profile Update Success (1 test)
  - Profile Update Uniqueness Failure (1 test)
  - Password Change (2 tests)
  - Set Password for OTP Users (1 test)
  - Reset Password via OTP (1 test)
  - Orphaned Transaction Linking (1 test)
- ✅ **category-service.test.ts** - 8/8 tests passing
  - Root Category Creation (1 test)
  - Parent/Child Linking (1 test)
  - Slug Uniqueness Enforcement (1 test)
  - Category Updates (1 test)
  - Active Category Lookup (1 test)
  - Delete Protection: Products (1 test)
  - Delete Protection: Children (1 test)
  - Deletion Success (1 test)
  - Note: Parent relation join is flaky; this suite may fail intermittently until fixed.
- ✅ **promo-service.test.ts** - 4/4 tests passing
  - Promo Code Format (1 test)
  - First-Time Promo Creation (1 test)
  - Active Promo Retrieval Ordering (1 test)
  - Usage, Reuse, and Expiration Handling (1 test)
- ✅ **cache-invalidation.test.ts** - 4/4 tests passing
  - Cache hit/miss behavior (1 test)
  - Explicit key clearing (1 test)
  - Batch clearing (1 test)
  - Invalidate-by-key behavior (1 test)
- ✅ **rate-limiting.test.ts** - 3/3 tests passing
  - User/IP client ID derivation (1 test)
  - Strict limiter enforcement (1 test)
  - Endpoint bucket isolation (1 test)
- ✅ **email-service.test.ts** - 2/2 tests passing
  - OTP email delivery (1 test)
  - Buyer order confirmation email delivery (1 test)
- ✅ **sms-service.test.ts** - 2/2 tests passing
  - Invalid phone rejection (1 test)
  - Order confirmation SMS delivery (1 test)
  - Note: If `TEST_SMS_ALLOW_FAIL=true` is used, record that in this task file.
- ✅ **storage-service.test.ts** - 1/1 tests passing
  - R2 upload/list/delete lifecycle (1 test)

### Remaining Tests (1/12):
- ⏳ **transaction-service.test.ts** - 22 tests (NOT TESTED YET)
  - Transaction Creation (5 tests)
  - Transaction Status Updates (3 tests)
  - Stock Management (5 tests)
  - Transaction Retrieval (4 tests)
  - Guest Transaction Linking (2 tests)
  - Edge Cases and Error Scenarios (3 tests)
  - **⚠️ IMPORTANT**: Tests written but NOT run yet. Next agent must verify all tests pass.

### Recent Work (Session Summary):
1. **Fixed product-service tests** - Resolved cleanup function hang caused by Supabase PostgREST not supporting SQL subqueries in filters. Rewrote cleanup to use two-step approach (query IDs → filter with .in()).
2. **Fixed test field name bug** - Corrected `totalAmount` to `amount` in transaction test (database field mismatch).
3. **Created transaction-service.test.ts** - Comprehensive 22-test suite covering all transaction flows, stock management, payment tracking, and edge cases.
4. **All cleanup functions optimized** - Added logging, error handling, and batch operations for Redis cleanup.
5. **Created otp-service.test.ts** - Added 9-test suite covering OTP sending, invalid identifiers, delivery failures, rate limiting, verification, attempt limits, and expiration handling (passing).
6. **Created user-service.test.ts** - Added 11-test suite covering user creation, profile updates, password flows, and orphaned transaction linking (passing).
7. **Created category-service.test.ts** - Added 8-test suite covering category creation, hierarchy, slug uniqueness, updates, and deletion constraints (passing).
8. **Updated OTP tests and configs** - Added SMS delivery handling, timestamp parsing fixes, and test-time `server-only`/`@` alias support; OTP suite now passing.
9. **Reverted category parent hydration** - Test suite now surfaces intermittent parent join bug (see category note).
10. **Created promo-service.test.ts** - Added 4-test suite covering promo format, creation, retrieval/used behavior, and use/expiration flows (passing).
11. **Created cache-invalidation.test.ts** - Added 4-test suite covering cache hit/miss, key clearing, and invalidation (passing).
12. **Created rate-limiting.test.ts** - Added 3-test suite covering strict limiter enforcement and endpoint isolation (passing).
13. **Created email-service.test.ts** - Added 2-test suite covering OTP and buyer order confirmation delivery (passing).
14. **Created sms-service.test.ts** - Added 2-test suite covering invalid phone rejection and SMS delivery (passing).
15. **Created storage-service.test.ts** - Added R2 upload/list/delete lifecycle test (passing).

---

# Task 000: Integration Testing Framework - Test Implementation

## ⚠️ CRITICAL: Anti-Reward-Hacking Requirements

**READ THIS SECTION CAREFULLY BEFORE WRITING ANY TESTS**

AI agents are prone to "reward hacking" - writing tests that pass without actually validating functionality. This wastes time, resources, and provides false confidence. You MUST avoid these anti-patterns:

### Prohibited Test Gaming Behaviors

1. **Trivial Assertions**
   - ❌ `expect(result).toBeDefined()`
   - ❌ `expect(response).toBeTruthy()`
   - ❌ `expect(data).not.toBeNull()`
   - ✅ `expect(user.email).toBe('test@example.com')`
   - ✅ `expect(products.length).toBeGreaterThan(0) && expect(products[0]).toHaveProperty('price')`

2. **Tautological Tests**
   - ❌ Testing that a mock returns what the mock was programmed to return
   - ❌ `expect(mockFunction()).toBe(mockFunction())` patterns
   - ✅ Test real behavior against real or realistic data

3. **Overwriting Tests or Evaluation Code**
   - ❌ Modifying test files to make them pass
   - ❌ Changing expected values to match actual output
   - ✅ Fix the implementation or investigate why tests fail legitimately

4. **Volume Over Quality**
   - ❌ Writing 100 tests that all check `toBeDefined()`
   - ❌ Copy-pasting test blocks with minor variations
   - ✅ Write fewer, comprehensive tests that cover edge cases

5. **Ignoring Error Paths**
   - ❌ Only testing happy paths
   - ❌ Skipping validation of error messages
   - ✅ Test failure scenarios extensively (invalid inputs, network errors, race conditions)

6. **Manipulating Benchmarks**
   - ❌ Hardcoding expected outputs based on current implementation bugs
   - ❌ Skipping flaky tests instead of fixing them
   - ✅ Investigate failures, fix root causes

7. **Persuasion Over Correctness**
   - ❌ Writing elaborate comments explaining why a bad test is "actually good"
   - ❌ Arguing that comprehensive testing "isn't necessary for this codebase"
   - ✅ Write tests that objectively validate contracts and behavior

### Test Quality Checklist

Before marking any test as complete, verify:

- [ ] **Meaningful Assertions**: Each assertion validates a specific contract requirement
- [ ] **Edge Cases Covered**: Test boundary conditions, empty inputs, null values
- [ ] **Error Scenarios**: Test at least 2 failure modes per function
- [ ] **Race Conditions**: If function has timing dependencies, test concurrent calls
- [ ] **Data Validation**: Check types, formats, ranges - not just "truthy"
- [ ] **Side Effects**: Verify state changes (database writes, cache invalidation)
- [ ] **Idempotency**: Where applicable, test that repeated calls produce consistent results
- [ ] **Real Integration**: Integration tests must call actual services (not mocks)
- [ ] **Contract Validation**: Contract tests must validate against frozen real responses

### Red Flags That Indicate Reward Hacking

If you find yourself:
- Writing tests that take < 30 seconds each to write
- Using `expect(true).toBe(true)` patterns
- Commenting out failing assertions
- Changing test data to match bugs instead of fixing bugs
- Writing tests that "look comprehensive" but don't actually validate behavior
- Skipping tests because "they're flaky" without investigation
- Testing implementation details instead of contracts

**STOP IMMEDIATELY** and reconsider your approach.

---

## Project Context

### Current Architecture

Kitia is a Persian e-commerce platform with:
- **Backend**: Next.js 14 App Router (API routes)
- **Database**: Supabase (PostgreSQL with RLS)
- **Cache/Rate Limiting**: Upstash Redis
- **File Storage**: Cloudflare R2
- **Email**: Resend
- **SMS**: Kavenegar
- **Payments**: Zarinpal (Digipay integration removed)
- **Auth**: NextAuth.js with JWT + OTP

### Service Layer Architecture

**CRITICAL**: Business logic lives in `/src/services/*.ts`, NOT in API routes.

Services:
1. `auth-service.ts` - Authentication (password, OTP)
2. `product-service.ts` - Product CRUD, variants, media
3. `transaction-service.ts` - Orders, payments, stock reduction
4. `otp-service.ts` - OTP generation, rate limiting, verification
5. `user-service.ts` - User management, UID generation
6. `category-service.ts` - Category hierarchy
7. `tag-service.ts` - Tag management
8. `promo-service.ts` - Promo code validation
9. `admin-service.ts` - Admin operations, stats
10. `sms-service.ts` - SMS delivery via Kavenegar
11. `settings-service.ts` - App settings

### External Dependencies

**Supabase**:
- Tables: `users`, `products`, `product_variants`, `product_media`, `categories`, `tags`, `transactions`, `transaction_items`, `otp_verifications`, `promo_codes`, `invoices`, `settings`
- Junction tables: `_ProductToTag`
- RLS policies enabled

**Upstash Redis**:
- Cache keys pattern: `{entity}:{filter}:page:{n}:limit:{n}`
- Rate limiting: Sliding window algorithm
- No pattern matching (`KEYS *` not supported) - invalidation clears specific known keys

**Kavenegar SMS**:
- Template-based SMS for Iranian phone numbers
- OTP delivery

**Resend Email**:
- Transactional emails (OTP, order confirmations)
- Domain: `kitia.ir`

**Cloudflare R2**:
- Product images/videos
- S3-compatible API
- Public URL: `cdn.kitia.ir`

**Zarinpal Payment**:
- Payment gateway integration
- Sandbox mode for testing
- Callback verification flow

---

## Test Requirements

You need to create comprehensive integration tests for ALL services listed above. Tests must be organized into two categories:

### 1. Integration Tests (`integration/*.test.ts`)

These tests **MUST**:
- Call real services (Supabase, Redis, etc.)
- Use test/preview environment credentials (NEVER production)
- Verify end-to-end flows
- Test error handling and edge cases
- Clean up after themselves (delete test data)
- Be idempotent (can run multiple times safely)
- Record API responses for contract creation (when `RECORD_CONTRACTS=true`)

### 2. Contract Tests (Future Phase)

After integration tests pass and contracts are recorded:
- Use MSW to mock external services with frozen responses
- Fast execution (no network calls)
- Validate that code still conforms to recorded contracts
- Catch breaking changes in API integrations

---

## Required Test Suites

Create integration tests for each service:

### 1. `integration/auth-service.test.ts`

**What it tests:**
- User authentication with email/password
- User authentication with phone/password
- OTP-based authentication (email & phone)
- User registration with password
- Orphaned transaction linking during phone login
- Error handling for invalid credentials
- Error handling for users without passwords
- Error handling for missing fields

**What it proves:**
- Authentication flows work end-to-end
- Bcrypt password hashing/verification works
- OTP verification integrates correctly
- Guest transaction linking works after authentication
- Error messages are localized (Persian) and meaningful

**Critical assertions:**
- Authenticated user object has correct shape: `{ id, email, phone, name, role }`
- Password validation uses bcrypt correctly
- Invalid credentials throw errors with correct messages
- Phone-only users cannot authenticate with password
- Orphaned transactions are linked when guest logs in

**Edge cases:**
- Non-existent users
- Empty passwords
- Invalid identifier formats
- Race conditions in UID generation during registration

### 2. `integration/product-service.test.ts`

**What it tests:**
- Product CRUD operations (create, read, update, delete)
- Product pagination
- Product search
- Featured products filtering
- Discounted products filtering
- Product variants (create, update, delete, reorder)
- Product media (add, update, delete, default handling)
- Automatic stock calculation from variants
- Bulk operations (delete, update)
- Cache invalidation after mutations

**What it proves:**
- Products are correctly stored with all relations (category, tags, variants, media)
- Variant stock automatically updates parent product stock
- Featured/discounted product queries work at database level
- Image fallback logic works (product → variant media)
- Delete protection works (products with transactions cannot be deleted)
- Cache is invalidated after mutations
- Product ordering (`displayOrder`) works correctly

**Critical assertions:**
- Created products have all fields correctly set
- Variants update parent product stock accurately
- Media default handling works (first media becomes default)
- Product deletion fails if transaction items exist
- Fetching product by ID includes all relations
- Pagination returns correct total/page counts
- Search matches name/description with partial strings

**Edge cases:**
- Products with no variants
- Products with multiple variants
- Deleting a variant updates stock correctly
- Setting new default media unsets old default
- Products with no images fall back to variant media
- Out of stock products

### 3. `integration/transaction-service.test.ts`

**What it tests:**
- Transaction creation with items and shipping info
- Guest checkout transactions
- Authenticated user transactions
- Transaction status updates (PENDING → COMPLETED → FAILED)
- Stock reduction after successful payment
- Stock verification before checkout
- Zarinpal authority/refId tracking
- Transaction retrieval (by ID, by code, by authority)
- User transaction history with pagination
- Transaction linking to user (guest → registered)

**What it proves:**
- Transactions are created atomically (with rollback on failure)
- Stock is reduced correctly for products and variants
- Product stock is recalculated from variants after reduction
- Stock verification catches insufficient inventory
- Transaction codes are unique (KT-XXXXXX format)
- Transaction history is correctly paginated
- Guest transactions can be linked to users after registration

**Critical assertions:**
- Transaction creation succeeds with all items
- Transaction code is unique and follows format
- Stock verification returns errors for insufficient stock
- Stock reduction happens only for COMPLETED transactions
- Variant stock reduction updates parent product stock
- Failed transactions do not reduce stock
- Transaction retrieval includes all relations (items, products, invoice)

**Edge cases:**
- Empty cart (no items)
- Insufficient stock during checkout
- Concurrent stock reduction (race conditions)
- Guest transaction with `createAccount=true`
- Transactions with variants vs without
- Product with variants but no variantId selected

### 4. `integration/otp-service.test.ts`

**What it tests:**
- OTP generation and storage
- OTP sending via SMS (Kavenegar)
- OTP sending via email (Resend)
- OTP verification with correct code
- OTP verification with incorrect code
- OTP expiration (5 minutes)
- Rate limiting (1 OTP per 2 minutes)
- Attempt limiting (max 3 attempts)
- Automatic cleanup of expired OTPs

**What it proves:**
- OTP codes are 6 digits
- OTPs expire after 5 minutes
- Rate limiting prevents spam
- Verification fails after max attempts
- SMS/Email integration works
- Multiple purposes (login, register, checkout) are isolated

**Critical assertions:**
- Generated OTP is 6 digits
- OTP record has correct expiration timestamp
- Rate limiting returns correct wait time
- Verification increments attempt counter
- Successful verification deletes OTP record
- Expired OTPs are cleaned up automatically
- SMS sends to Iranian phone numbers (09xxxxxxxxx)
- Email sends to valid email addresses

**Edge cases:**
- Requesting OTP within 2-minute window (rate limit)
- Verifying expired OTP
- Exceeding max attempts
- Invalid identifier formats
- OTP for non-existent user
- Concurrent OTP requests

### 5. `integration/user-service.test.ts`

**What it tests:**
- User creation
- UID generation (sequential, unique)
- User retrieval (by ID, by email, by phone)
- User password updates
- User profile updates
- Orphaned transaction linking
- Identifier type detection (email vs phone)
- Race condition handling in UID generation

**What it proves:**
- UIDs are sequential and unique
- UID conflicts are handled with retries
- Password updates use bcrypt
- Identifier detection works for email/phone
- Orphaned transactions are correctly linked by phone

**Critical assertions:**
- Created user has unique UID
- UID follows sequential pattern
- Password is hashed with bcrypt
- User retrieval returns correct user object
- Orphaned transactions are linked when phone matches

**Edge cases:**
- UID conflict during registration (concurrent registrations)
- User with email only
- User with phone only
- User with both email and phone
- Guest transactions with matching phone

### 6. `integration/category-service.test.ts`

**What it tests:**
- Category CRUD operations
- Hierarchical categories (parent/child)
- Slug uniqueness
- Category with products
- Category deletion protection (has products)

**What it proves:**
- Categories support parent-child relationships
- Slugs are unique and URL-safe
- Categories cannot be deleted if they have products

**Critical assertions:**
- Created category has correct slug
- Child categories reference correct parent
- Category deletion fails if products exist

**Edge cases:**
- Root categories (no parent)
- Nested categories (multiple levels)
- Category with no products

### 7. `integration/promo-service.test.ts`

**What it tests:**
- Active promo code retrieval
- Promo code validation (single-use, expiration, user-specific)
- Promo code application to transaction

**What it proves:**
- Promo codes expire after 24 hours
- Promo codes are one-time use per user
- Expired promo codes are not returned

**Critical assertions:**
- Valid promo code returns correct discount
- Expired promo code is not valid
- Used promo code cannot be reused
- Promo code validation returns appropriate errors

**Edge cases:**
- Promo code used by another user
- Promo code expired
- Non-existent promo code

### 8. `integration/cache-invalidation.test.ts`

**What it tests:**
- Product cache invalidation after create/update/delete
- Cache key pattern clearing
- Redis connection handling
- Graceful degradation when Redis is unavailable

**What it proves:**
- Cache is invalidated after product mutations
- Application continues working if Redis fails
- Cache keys follow documented pattern

**Critical assertions:**
- Cache miss after invalidation
- Specific cache keys are cleared (pages 1-10)
- Application doesn't crash if Redis is down

**Edge cases:**
- Redis connection failure
- Multiple concurrent invalidations

### 9. `integration/rate-limiting.test.ts`

**What it tests:**
- API rate limiting (100 req/min)
- Public endpoint rate limiting (1000 req/min)
- Auth endpoint strict rate limiting (5 req/15min)
- Sliding window algorithm
- Client identification (user ID vs IP)

**What it proves:**
- Rate limiters prevent abuse
- Different endpoints have different limits
- Authenticated users have separate limits from guests

**Critical assertions:**
- Requests are blocked after exceeding limit
- Rate limit resets after window expires
- Authenticated requests use user ID as identifier
- Guest requests use IP address

**Edge cases:**
- Concurrent requests at limit boundary
- Rate limit reset timing

### 10. `integration/email-service.test.ts`

**What it tests:**
- OTP email sending via Resend
- Admin order confirmation emails
- Email formatting (Persian text, RTL)
- Email delivery status

**What it proves:**
- Resend integration works
- Emails are sent successfully
- Email content is correctly formatted

**Critical assertions:**
- OTP email contains correct code
- Order confirmation email has transaction details
- Emails are sent from configured domain

**Edge cases:**
- Invalid email addresses
- Resend API failure
- Email bounces

### 11. `integration/sms-service.test.ts`

**What it tests:**
- SMS OTP sending via Kavenegar
- Template-based SMS
- Iranian phone number validation

**What it proves:**
- Kavenegar integration works
- SMS templates are correctly applied
- Phone number format validation works

**Critical assertions:**
- SMS is sent successfully
- OTP code is included in SMS
- Only Iranian phone numbers (09xxxxxxxxx) are accepted

**Edge cases:**
- Invalid phone number formats
- Kavenegar API failure
- Non-Iranian phone numbers

### 12. `integration/storage-service.test.ts`

**What it tests:**
- R2 file upload
- R2 file deletion
- Public URL generation
- File validation (type, size)
- IPv4 connectivity workaround

**What it proves:**
- R2 storage integration works
- Files are publicly accessible
- Cloudflare custom domain works

**Critical assertions:**
- Uploaded files are accessible at public URL
- File deletion removes file from R2
- File validation rejects invalid types/sizes

**Edge cases:**
- Large file uploads (>5MB for images, >50MB for videos)
- Invalid file types
- R2 connection failures
- IPv6 vs IPv4 connectivity issues

---

## Test Data Management

### Fixtures

Create realistic test data in `fixtures/`:
- `users.ts` - Sample users (admin, regular, guest)
- `products.ts` - Sample products with variants
- `transactions.ts` - Sample orders
- `categories.ts` - Sample category hierarchy
- `tags.ts` - Sample tags

### Test Database Cleanup

**IMPORTANT**: All tests must clean up after themselves:

```typescript
afterEach(async () => {
  // Delete test data
  await supabase.from('transactions').delete().like('transactionCode', 'TEST-%');
  await supabase.from('users').delete().like('email', 'test-%@example.com');
  await supabase.from('products').delete().like('name', 'TEST-%');
  // etc.
});
```

Use a test-specific prefix (e.g., `TEST-`, `INTEGRATION-`) to avoid deleting real data.

---

## Contract Recording & Validation

### Recording Phase

When `RECORD_CONTRACTS=true`:
1. Integration tests run against real services
2. All external API requests/responses are captured
3. Responses are saved to `contracts/*.recorded.json`
4. Sensitive data (API keys, emails) must be sanitized

### Validation Phase

After contracts are recorded:
1. Create MSW handlers in `mocks/handlers/`
2. Import recorded contracts as mock responses
3. Contract tests validate that code still expects same response structure
4. Any deviation from contract indicates breaking change

---

## Utilities

Create helper utilities in `utils/`:

### `test-client.ts`
- Supabase client factory for tests
- Redis client factory for tests
- Clean environment variable loading

### `assertions.ts`
- Custom matchers for common patterns
- Persian text validation
- Date/time assertions (Jalali calendar)

### `cleanup.ts`
- Database cleanup functions
- Redis cache clearing
- Test data teardown

### `fixtures-loader.ts`
- Load and seed test fixtures
- Generate realistic fake data

---

## Success Criteria

Tests are considered complete when:

1. **All services have integration tests** covering:
   - Happy paths
   - At least 2 error scenarios per function
   - Edge cases (empty inputs, null values, race conditions)

2. **All tests pass** against preview environment

3. **Code coverage** > 80% for service layer

4. **No reward hacking patterns** detected:
   - No trivial assertions
   - No tautological tests
   - No skipped tests without justification
   - All tests validate meaningful contracts

5. **Contracts are recorded** (when ready):
   - Real API responses saved
   - Sensitive data sanitized
   - MSW handlers created

6. **Documentation is complete**:
   - Each test file has header comment explaining purpose
   - Complex test scenarios have explanatory comments
   - README is updated with test instructions

---

## Implementation Order

1. **Setup Phase**:
   - Install dependencies: `cd tests && npm install`
   - Configure `.env` with test credentials
   - Verify connection to all services

2. **Utilities First**:
   - Create `utils/test-client.ts`
   - Create `utils/cleanup.ts`
   - Create `fixtures/*.ts`

3. **Start with Auth**:
   - `integration/auth-service.test.ts`
   - Validates authentication flows work
   - Needed for testing protected endpoints

4. **Core Services**:
   - `integration/product-service.test.ts`
   - `integration/transaction-service.test.ts`
   - `integration/otp-service.test.ts`

5. **Supporting Services**:
   - `integration/user-service.test.ts`
   - `integration/category-service.test.ts`
   - `integration/promo-service.test.ts`

6. **Infrastructure**:
   - `integration/cache-invalidation.test.ts`
   - `integration/rate-limiting.test.ts`

7. **External Services**:
   - `integration/email-service.test.ts`
   - `integration/sms-service.test.ts`
   - `integration/storage-service.test.ts`

8. **Contract Recording** (future):
   - Enable `RECORD_CONTRACTS=true`
   - Run all integration tests
   - Create MSW handlers from recordings

---

## Anti-Patterns to Avoid (Reminder)

Before submitting, review your tests for these red flags:

- ❌ Tests that only check `toBeDefined()` or `toBeTruthy()`
- ❌ Tests that pass by mocking everything (integration tests should call REAL services)
- ❌ Tests that don't clean up data (leaves database dirty)
- ❌ Tests with hardcoded IDs that break on re-run
- ❌ Tests that skip error scenarios
- ❌ Tests that take shortcuts instead of validating contracts
- ❌ Tests with vague assertions like `expect(result).toHaveLength(1)` without checking the actual content

---

## Questions to Ask Yourself

Before marking each test suite complete:

1. **Does this test fail if the implementation is broken?**
   - If you introduce a bug, will this test catch it?
   - Or will it pass anyway because assertions are weak?

2. **Am I testing the contract, or the implementation?**
   - Contract: "User authentication returns { id, email, name, role }"
   - Implementation: "User authentication calls bcrypt.compare"

3. **Have I tested error paths as thoroughly as happy paths?**
   - For each function, have I tested at least 2 failure modes?

4. **Can this test run multiple times without failing?**
   - Does it clean up after itself?
   - Does it use unique identifiers?

5. **Am I testing real integration or just mocks?**
   - Integration tests MUST call real Supabase, Redis, etc.
   - Only contract tests (future phase) should use mocks

6. **Would a code reviewer approve this test?**
   - Is it readable?
   - Does it have a clear purpose?
   - Are assertions meaningful?

---

## Final Note

**Quality over quantity.** It's better to have 50 excellent, comprehensive tests that catch real bugs than 500 superficial tests that give false confidence.

Your tests will be reviewed for:
1. Meaningful assertions
2. Error path coverage
3. Edge case handling
4. Real integration (not just mocks)
5. Idempotency and cleanup
6. Clear documentation

Good luck, and remember: **No reward hacking!** 🎯
