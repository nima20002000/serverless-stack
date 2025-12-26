# Integration Testing Framework - Setup Complete ✅

## What Was Created

A comprehensive integration testing infrastructure for the Kitia e-commerce platform, designed to:
1. Test real service integrations (Supabase, Redis, Email/SMS, Storage, Payments)
2. Create frozen API contracts using MSW (Mock Service Worker)
3. Prevent AI reward hacking with strict anti-gaming guidelines
4. Maintain separation from main codebase with independent package

## Unit Test Kit (Task 001)

Unit test suites were added under `tests/unit/` to validate core logic without real network calls. External services are mocked at module boundaries (Supabase, Redis, Kavenegar, Resend, R2).

### Unit Suite Coverage

- `tests/unit/services/auth-service.test.ts` - Identifier validation, password checks, OTP login flows
- `tests/unit/services/user-service.test.ts` - UID generation, user creation, profile updates, password flows, orphaned linking
- `tests/unit/services/user-service-validation.test.ts` - Email/phone validation and uniqueness guards
- `tests/unit/services/user-service-password.test.ts` - Password hashing/verifying and guard rails
- `tests/unit/services/product-service.test.ts` - Stock updates, discount logic, media management, variant ordering
- `tests/unit/services/transaction-service.test.ts` - Transaction creation failures, status updates, stock verification
- `tests/unit/services/otp-service.test.ts` - Rate limits, delivery failures, verification attempts
- `tests/unit/services/category-service.test.ts` - Bulk delete/update constraints and cache invalidation
- `tests/unit/services/promo-service.test.ts` - Promo generation, expiration/use rules
- `tests/unit/services/sms-service.test.ts` - SMS validation and provider error handling
- `tests/unit/services/settings-service.test.ts` - Settings CRUD behaviors

- `tests/unit/lib/rate-limit.test.ts` - Client identifiers, limiter fail-open behavior
- `tests/unit/lib/redis-client.test.ts` - Cache hits/misses, fallback behavior, key clearing
- `tests/unit/lib/email-client.test.ts` - Resend/SMTP paths, buyer/admin notifications
- `tests/unit/lib/storage.test.ts` - Storage adapter selection and routing
- `tests/unit/lib/storage-r2-adapter.test.ts` - R2 upload path and error handling
- `tests/unit/lib/storage-validators.test.ts` - File validation and path generation
- `tests/unit/lib/logger.test.ts` - Log wrapper dispatch
- `tests/unit/lib/supabase.test.ts` - Server/client env validation

- `tests/unit/utils/format.test.ts` - Price formatting and discounts
- `tests/unit/utils/persian.test.ts` - Persian digit/name normalization
- `tests/unit/utils/url.test.ts` - Base URL and redirect creation
- `tests/unit/utils/password-validation.test.ts` - Password validation rules

## Directory Structure

```
tests/
├── integration/          # Integration test suites (12 to be implemented)
│   ├── auth-service.test.ts          (Authentication flows)
│   ├── product-service.test.ts       (Products, variants, media)
│   ├── transaction-service.test.ts   (Orders, payments, stock)
│   ├── otp-service.test.ts           (OTP generation, verification)
│   ├── user-service.test.ts          (User management, UID)
│   ├── category-service.test.ts      (Category hierarchy)
│   ├── promo-service.test.ts         (Promo codes)
│   ├── cache-invalidation.test.ts    (Redis caching)
│   ├── rate-limiting.test.ts         (Rate limiters)
│   ├── email-service.test.ts         (Resend integration)
│   ├── sms-service.test.ts           (Kavenegar integration)
│   └── storage-service.test.ts       (R2 file storage)
│
├── mocks/               # MSW handlers (future - after contracts recorded)
│   └── handlers/        # API mock implementations
│
├── fixtures/            # Test data (to be implemented)
│   ├── users.ts         # Sample users
│   ├── products.ts      # Sample products with variants
│   ├── transactions.ts  # Sample orders
│   ├── categories.ts    # Sample category hierarchy
│   └── tags.ts          # Sample tags
│
├── utils/               # Test utilities (to be implemented)
│   ├── test-client.ts   # Supabase/Redis client factories
│   ├── cleanup.ts       # Database cleanup functions
│   ├── assertions.ts    # Custom matchers
│   └── fixtures-loader.ts  # Test data generation
│
├── contracts/           # Recorded API contracts (future)
│   └── *.recorded.json  # Real API responses (sanitized)
│
├── tasks/               # AI agent task definitions
│   └── task000.md       # Comprehensive implementation guide
│
├── package.json         # Independent test package
├── tsconfig.json        # TypeScript configuration
├── vitest.config.ts     # Test runner configuration
├── setup.ts             # Global test setup
├── .env.example         # Environment variable template
├── .gitignore           # Test-specific gitignore
├── README.md            # User documentation
├── IMPLEMENTATION_GUIDE.md  # Implementation workflow
└── SUMMARY.md           # This file
```

## Key Features

### 1. Anti-Reward-Hacking Safeguards

The `tasks/task000.md` file includes extensive guidance to prevent AI agents from writing superficial tests:

**Prohibited Behaviors:**
- ❌ Trivial assertions (`toBeDefined()`, `toBeTruthy()`)
- ❌ Tautological tests (testing that mocks return mock data)
- ❌ Overwriting tests to make them pass
- ❌ Volume over quality (100 weak tests vs 50 strong tests)
- ❌ Ignoring error paths and edge cases

**Required Quality:**
- ✅ Meaningful assertions (check actual values, types, ranges)
- ✅ Edge case coverage (null, empty, boundary conditions)
- ✅ Error scenarios (at least 2 failure modes per function)
- ✅ Race condition testing (concurrent operations)
- ✅ Real service integration (no mocks in integration tests)
- ✅ Idempotent tests (can run multiple times safely)

### 2. Test Quality Checklist

Before marking any test complete, verify:
- [ ] Meaningful assertions that validate specific contracts
- [ ] Edge cases covered (boundary conditions, empty inputs, null values)
- [ ] Error scenarios tested (at least 2 per function)
- [ ] Race conditions tested (if applicable)
- [ ] Data validation (types, formats, ranges - not just "truthy")
- [ ] Side effects verified (database writes, cache invalidation)
- [ ] Idempotency tested (repeated calls produce consistent results)
- [ ] Real integration (calls actual services, not mocks)
- [ ] Contract validation (validates against frozen responses in future)

### 3. Separate Package Benefits

**Why independent from main codebase:**
- Clean separation of concerns
- Independent dependency versions
- No circular dependencies
- Different TypeScript configuration
- Isolated test environment
- Can use different Node version if needed
- Faster installs (don't need test deps in production)

### 4. Two-Phase Testing Strategy

**Phase 1: Integration Tests** (Current)
- Test against real services (Supabase, Redis, etc.)
- Validate end-to-end flows
- Catch actual integration bugs
- Record API responses for contracts
- Slower (network calls)
- Run in CI against staging

**Phase 2: Contract Tests** (Future)
- Use MSW to mock services with frozen responses
- Fast execution (no network calls)
- Deterministic results
- Catch breaking changes in API contracts
- Run on every PR
- No external service dependencies

### 5. Production Safety

Built-in safety checks prevent disasters:
```typescript
// In setup.ts
if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('production')) {
  throw new Error('⛔ Production credentials detected! Tests must use staging/test environment.');
}
```

## Test Coverage Requirements

### Service Layer (12 Test Suites)

| Service | Test File | Critical Coverage |
|---------|-----------|-------------------|
| Authentication | `auth-service.test.ts` | Password auth, OTP auth, registration, orphaned transactions |
| Products | `product-service.test.ts` | CRUD, variants, media, cache, stock calculation |
| Transactions | `transaction-service.test.ts` | Order creation, payment flow, stock reduction |
| OTP | `otp-service.test.ts` | Generation, delivery (SMS/email), rate limiting |
| Users | `user-service.test.ts` | User CRUD, UID generation, transaction linking |
| Categories | `category-service.test.ts` | Hierarchy, slug uniqueness, delete protection |
| Promo Codes | `promo-service.test.ts` | Validation, expiration, single-use enforcement |
| Cache | `cache-invalidation.test.ts` | Redis caching, invalidation patterns, graceful degradation |
| Rate Limiting | `rate-limiting.test.ts` | Sliding window, different limits per endpoint |
| Email | `email-service.test.ts` | Resend integration, OTP emails, order confirmations |
| SMS | `sms-service.test.ts` | Kavenegar integration, template-based SMS |
| Storage | `storage-service.test.ts` | R2 upload/delete, validation, IPv4 workaround |

### Success Criteria

Tests are complete when:
1. ✅ All 12 integration test suites implemented
2. ✅ Code coverage > 80% for service layer
3. ✅ All tests pass in CI
4. ✅ No reward hacking patterns detected (peer review)
5. ✅ Edge cases covered for each service
6. ✅ Error paths tested (at least 2 per function)
7. ✅ Documentation complete (comments, README updates)

## Installation & Setup

### Step 1: Navigate to Tests Folder
```bash
cd /home/dexter/Desktop/kitia/tests
```

### Step 2: Install Dependencies
```bash
npm install
```

This installs:
- Vitest (test runner)
- MSW (Mock Service Worker)
- @vitest/ui (browser test interface)
- @vitest/coverage-v8 (coverage reporting)
- Supabase, Redis, date-fns clients
- TypeScript, dotenv, undici

### Step 3: Configure Environment
```bash
cp .env.example .env
# Edit .env with test credentials
```

**CRITICAL**: Use test/staging credentials only! Never production!

Required environment variables:
- Supabase (preview environment: gozxjxtnrbuurmstjydo)
- Upstash Redis (test instance)
- Resend (test mode)
- Kavenegar (test template)
- Zarinpal (sandbox mode)
- R2 (test bucket)

### Step 4: Verify Setup
```bash
npm test
```

Should show "No test files found" (tests not implemented yet).

## Implementation Workflow

### Phase 1: Utilities (Week 1)
Implement helper modules:
1. `utils/test-client.ts` - Client factories
2. `utils/cleanup.ts` - Database cleanup
3. `utils/assertions.ts` - Custom matchers
4. `fixtures/*.ts` - Test data

### Phase 2: Core Integration Tests (Week 2-3)
Implement in order:
1. `auth-service.test.ts` (needed for protected endpoints)
2. `product-service.test.ts` (core business logic)
3. `transaction-service.test.ts` (payment flows)
4. `otp-service.test.ts` (authentication dependency)

### Phase 3: Supporting Tests (Week 4)
Implement:
5. `user-service.test.ts`
6. `category-service.test.ts`
7. `promo-service.test.ts`

### Phase 4: Infrastructure Tests (Week 5)
Implement:
8. `cache-invalidation.test.ts`
9. `rate-limiting.test.ts`

### Phase 5: External Service Tests (Week 6)
Implement:
10. `email-service.test.ts`
11. `sms-service.test.ts`
12. `storage-service.test.ts`

### Phase 6: Contract Recording (Future)
1. Enable `RECORD_CONTRACTS=true`
2. Run integration tests
3. Sanitize recorded responses
4. Create MSW handlers
5. Write contract validation tests

## Running Tests

### Basic Commands
```bash
npm test                # Run all tests
npm test:watch          # Watch mode for development
npm test:ui             # Browser UI (great for debugging)
npm test:coverage       # Generate coverage report
npm run test:integration  # Integration tests only
npm run test:contract    # Contract tests only (future)
```

### Watching Specific Tests
```bash
npm test:watch auth-service  # Watch auth tests
```

### Debugging
```bash
npm test:ui  # Opens browser interface at http://localhost:51204
```

## Important Notes

### Test Isolation
Each test must:
- Use unique identifiers (prefix with `TEST-` or `INTEGRATION-`)
- Clean up after itself (delete created data)
- Not depend on other tests
- Be idempotent (can run multiple times)

Example cleanup:
```typescript
afterEach(async () => {
  await supabase.from('users').delete().like('email', 'test-%@example.com');
  await supabase.from('products').delete().like('name', 'TEST-%');
});
```

### Rate Limiting Considerations
- Tests may hit rate limits on shared services
- Use dedicated test instances when possible
- Consider test execution timing
- Implement delays between tests if needed

### Data Persistence
- Use preview Supabase database (gozxjxtnrbuurmstjydo)
- Never test against production database
- Test data should have recognizable prefixes
- Cleanup functions should target test data only

### Contract Recording
When ready to record contracts:
```bash
export RECORD_CONTRACTS=true
npm run test:integration
```

Recorded responses will be saved to `contracts/*.recorded.json`.

**⚠️ Warning**: Never commit `.recorded.json` files as-is - they may contain sensitive data. Sanitize first!

## Documentation

### Key Files to Read

1. **README.md** - User-facing documentation, quick start guide
2. **IMPLEMENTATION_GUIDE.md** - Implementation workflow, success criteria
3. **tasks/task000.md** - Comprehensive implementation requirements, anti-reward-hacking guidelines
4. **SUMMARY.md** - This file, high-level overview

### For AI Agents Implementing Tests

**MUST READ**: `tasks/task000.md` contains critical guidance on:
- Anti-reward-hacking requirements
- Test quality standards
- Service-by-service test specifications
- Critical assertions for each service
- Edge cases to cover
- Success criteria

### For Code Reviewers

Check for:
1. Meaningful assertions (not just `toBeDefined()`)
2. Error path coverage (at least 2 per function)
3. Edge case handling (null, empty, boundary)
4. Real service integration (no mocks in integration tests)
5. Idempotent tests (proper cleanup)
6. Clear documentation (comments explaining complex scenarios)

## Next Steps

1. ✅ **Install dependencies**:
   ```bash
   cd /home/dexter/Desktop/kitia/tests
   npm install
   ```

2. ✅ **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with test credentials (USE STAGING ONLY!)
   ```

3. ⏳ **Read task000.md** - Contains critical implementation guidance

4. ⏳ **Implement utilities** - Start with test helpers and fixtures

5. ⏳ **Implement integration tests** - Follow the order in task000.md

6. ⏳ **Run tests and iterate** - Fix bugs, improve coverage

7. ⏳ **Record contracts** - After integration tests are stable

8. ⏳ **Create MSW handlers** - For fast contract validation tests

## Questions or Issues?

Refer to:
- Main project documentation: `/home/dexter/Desktop/kitia/CLAUDE.md`
- Test README: `/home/dexter/Desktop/kitia/tests/README.md`
- Implementation guide: `/home/dexter/Desktop/kitia/tests/IMPLEMENTATION_GUIDE.md`
- Task definition: `/home/dexter/Desktop/kitia/tests/tasks/task000.md`

---

**Created**: 2025-12-19
**Branch**: `integration/tests-framework`
**Status**: Framework complete, tests to be implemented
**Next**: Install dependencies, configure environment, implement tests
