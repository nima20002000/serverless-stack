# Integration Tests Implementation Guide

## Quick Start

```bash
# Navigate to tests directory
cd /home/dexter/Desktop/kitia/tests

# Install dependencies
npm install

# Copy environment template and configure
cp .env.example .env
# Edit .env with your test environment credentials

# Run tests
npm test
```

## What Has Been Created

### Directory Structure
```
tests/
├── integration/      # Integration test suites (to be implemented)
├── mocks/           # MSW handlers for contract testing (future)
├── fixtures/        # Test data and scenarios (to be implemented)
├── utils/           # Test utilities (to be implemented)
├── tasks/           # Task definitions for AI agents
│   └── task000.md   # Comprehensive implementation guide
├── contracts/       # Recorded API contracts (future)
├── package.json     # Separate npm package with test dependencies
├── tsconfig.json    # TypeScript configuration for tests
├── vitest.config.ts # Vitest test runner configuration
├── setup.ts         # Global test setup (env validation)
├── .env.example     # Environment variable template
├── .gitignore       # Test-specific gitignore
└── README.md        # Test suite documentation
```

### Test Infrastructure Components

1. **package.json** - Independent test package with:
   - Vitest (test runner)
   - MSW (Mock Service Worker for contract testing)
   - Supabase, Redis, date-fns clients
   - TypeScript, coverage tools

2. **vitest.config.ts** - Test configuration:
   - 30-second timeouts
   - Global test environment
   - Coverage reporting (v8)
   - Path aliases for clean imports

3. **setup.ts** - Global setup:
   - Environment variable loading
   - Credential validation
   - Production credential protection
   - Test logging

4. **.env.example** - Template with all required variables:
   - Supabase (preview environment)
   - Upstash Redis (test instance)
   - Email/SMS services (test mode)
   - Payment gateway (sandbox)
   - Storage (R2 test bucket)
   - Test user credentials
   - Contract recording flags

5. **tasks/task000.md** - Comprehensive implementation guide:
   - Anti-reward-hacking requirements
   - Test quality checklist
   - Service-by-service test requirements
   - Critical assertions for each service
   - Edge cases to cover
   - Implementation order
   - Success criteria

## Test Categories Required

### 12 Integration Test Suites

1. **auth-service.test.ts** - Authentication flows (password, OTP, registration)
2. **product-service.test.ts** - Products, variants, media, cache
3. **transaction-service.test.ts** - Orders, payments, stock management
4. **otp-service.test.ts** - OTP generation, delivery, verification, rate limiting
5. **user-service.test.ts** - User management, UID generation, orphaned transactions
6. **category-service.test.ts** - Hierarchical categories, slug uniqueness
7. **promo-service.test.ts** - Promo code validation, expiration
8. **cache-invalidation.test.ts** - Redis caching, invalidation patterns
9. **rate-limiting.test.ts** - Rate limiters, sliding window algorithm
10. **email-service.test.ts** - Resend integration, OTP emails, order confirmations
11. **sms-service.test.ts** - Kavenegar integration, SMS OTP
12. **storage-service.test.ts** - R2 file upload, deletion, validation

## Anti-Reward-Hacking Safeguards

The task file includes extensive guidance to prevent AI agents from writing superficial tests:

### Prohibited Behaviors
- ❌ Trivial assertions (`toBeDefined()`, `toBeTruthy()`)
- ❌ Tautological tests (testing mocks return mock data)
- ❌ Overwriting tests to make them pass
- ❌ Volume over quality (100 weak tests)
- ❌ Ignoring error paths
- ❌ Manipulating benchmarks

### Required Test Quality
- ✅ Meaningful assertions (check actual values, types, formats)
- ✅ Edge case coverage (boundary conditions, null values)
- ✅ Error scenarios (at least 2 failure modes per function)
- ✅ Race condition testing (concurrent operations)
- ✅ Real integration (actual service calls)
- ✅ Idempotency (tests can run multiple times)
- ✅ Data cleanup (no test pollution)

## Implementation Workflow

### Phase 1: Setup
1. Install dependencies in tests folder
2. Configure `.env` with test credentials (NEVER production!)
3. Verify service connectivity

### Phase 2: Utilities
Create helper modules:
- `utils/test-client.ts` - Supabase/Redis client factories
- `utils/cleanup.ts` - Database cleanup functions
- `utils/assertions.ts` - Custom matchers
- `utils/fixtures-loader.ts` - Test data generation
- `fixtures/*.ts` - Realistic sample data

### Phase 3: Integration Tests
Implement in this order:
1. Auth tests (needed for protected endpoints)
2. Core services (products, transactions, OTP)
3. Supporting services (users, categories, promos)
4. Infrastructure (cache, rate limiting)
5. External services (email, SMS, storage)

### Phase 4: Contract Recording (Future)
1. Enable `RECORD_CONTRACTS=true`
2. Run integration tests to capture real responses
3. Sanitize sensitive data from recordings
4. Create MSW handlers from contracts
5. Write contract validation tests

## Key Architectural Decisions

### Why Separate Package?
- Clean separation from main codebase
- Independent dependency versions
- No circular dependencies
- Can use different TypeScript config
- Isolated test environment

### Why Vitest?
- Fast (Vite-powered)
- Modern (native ESM support)
- Compatible with Jest API
- Built-in coverage
- UI mode for debugging

### Why MSW for Contracts?
- Intercepts requests at network level
- Works in both Node and browser
- Can record/replay real responses
- Creates deterministic test environment
- Catches breaking changes in external APIs

### Why Two Test Types?
**Integration Tests:**
- Validate real service communication
- Catch actual bugs in integrations
- Slower (network calls)
- Run in CI against staging

**Contract Tests:**
- Fast validation of API contracts
- No external dependencies
- Deterministic (frozen responses)
- Run on every PR

## Current Implementation Status

### ✅ Completed
- Test framework structure
- Configuration files
- Environment setup
- Anti-reward-hacking guidelines
- Comprehensive task documentation
- Test organization plan

### ⏳ To Be Implemented
- 12 integration test suites
- Test utilities and helpers
- Fixture data
- Contract recording scripts
- MSW handlers (after contracts recorded)
- CI/CD integration

## Important Notes

### Production Safety
The setup includes safety checks:
- Production credentials are detected and blocked
- Tests MUST use preview/staging/test environments
- Warning if production URLs detected

### Test Isolation
Each test must:
- Use unique identifiers (TEST- prefix)
- Clean up after itself
- Not depend on other tests
- Be idempotent (can run multiple times)

### Rate Limiting Considerations
- Tests may hit rate limits on shared services
- Use dedicated test instances when possible
- Implement test-specific rate limit bypasses (if needed)
- Consider test execution timing

### Data Persistence
- Use preview Supabase database (not production!)
- Test transactions should use `TEST-` prefix
- Cleanup functions should target test data only
- Never delete data without specific test prefixes

## Success Metrics

Tests are complete when:
1. ✅ All 12 test suites implemented
2. ✅ Code coverage > 80% for services
3. ✅ All tests pass in CI
4. ✅ No reward hacking patterns detected
5. ✅ Edge cases covered
6. ✅ Error paths tested
7. ✅ Documentation complete

## Next Steps

1. **Install dependencies**:
   ```bash
   cd /home/dexter/Desktop/kitia/tests
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with test credentials
   ```

3. **Read task000.md carefully** - This contains critical anti-reward-hacking guidance

4. **Implement tests** following the order in task000.md

5. **Run tests**:
   ```bash
   npm test
   ```

## Questions?

Refer to:
- `README.md` - User-facing documentation
- `tasks/task000.md` - Implementation requirements
- Main project `CLAUDE.md` - Architecture reference
