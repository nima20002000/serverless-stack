# E2E Testing - Quick Start Guide

## 📂 Task Files Created

| File              | Purpose                                                     | Tests | Lines |
| ----------------- | ----------------------------------------------------------- | ----- | ----- |
| `e2e-0-master.md` | Overview, validation protocol, anti-reward hacking measures | -     | 571   |
| `e2e-1.md`        | Phase 1: Playwright setup & infrastructure                  | 3     | 927   |
| `e2e-2.md`        | Phase 2: Guest checkout journey                             | 8     | 716   |
| `e2e-3.md`        | Phase 3: User auth & authenticated checkout                 | 16    | 812   |
| `e2e-4.md`        | Phase 4: Admin panel, promos, final integration             | 16    | 959   |

**Total:** ~4,000 lines of comprehensive task documentation covering 43+ E2E tests.

---

## 🚀 Implementation Order

**MUST be completed in this exact order:**

1. **Start Here:** Read `e2e-0-master.md` completely
2. **Phase 1:** `e2e-1.md` - Infrastructure setup (3 smoke tests)
3. **Phase 2:** `e2e-2.md` - Guest checkout (8 tests)
4. **Phase 3:** `e2e-3.md` - Authentication (16 tests)
5. **Phase 4:** `e2e-4.md` - Admin & final (16 tests)

**Do NOT skip phases. Each phase must be validator-approved before proceeding.**

---

## 📋 What Each Phase Delivers

### Phase 1: Infrastructure (4-6 hours)

✅ Playwright installed and configured
✅ Test directory structure created
✅ Database utilities with production guards
✅ Payment gateway mocking helpers
✅ Seed/cleanup utilities
✅ 3 smoke tests passing

### Phase 2: Guest Checkout (8-12 hours)

✅ Complete checkout flow (browse → cart → OTP → payment → success)
✅ Error handling (invalid OTP, payment failure, out of stock)
✅ Form validation and rate limiting
✅ Mobile viewport testing
✅ Database verification (transactions created, stock updated)

### Phase 3: Authentication (10-14 hours)

✅ User registration (email + phone, OTP verification)
✅ User login (password + OTP methods)
✅ Session management (persistence, logout)
✅ Authenticated checkout (auto-fill, order history)
✅ Password validation and security

### Phase 4: Final Integration (12-16 hours)

✅ Admin panel (role enforcement, CRUD operations)
✅ Promo codes (apply, validate, limits, expiration)
✅ Multi-product cart (quantity, total calculation, concurrent purchases)
✅ Error recovery (network failures, race conditions)
✅ CI/CD integration (GitHub Actions)

---

## ⚠️ Critical Anti-Reward Hacking Rules

**Each task file enforces these rules to prevent superficial implementation:**

### ❌ FORBIDDEN (will cause rejection):

- Trivial assertions (`.toBeDefined()`, `.toBeTruthy()` alone)
- Mocking Supabase/Redis (must use REAL test instances)
- Hardcoded test data (phone numbers, emails, IDs)
- Skipping error scenarios
- Skipping edge cases
- Flaky tests that pass/fail randomly
- Missing database verification
- Production credentials in tests
- Silent error swallowing
- Using `any` types

### ✅ REQUIRED (must have all):

- Meaningful assertions on actual values
- Real database changes verified
- Dynamic test data (random/unique values)
- Real OTP retrieval from database
- Error scenarios tested (5+ per journey)
- Edge cases covered
- Cross-browser compatibility (chromium, firefox, mobile)
- Idempotent tests (can run multiple times)
- Clean code (typed, no shortcuts)
- Complete evidence (screenshots, terminal output)

---

## 🔍 Validation Process

**Another AI agent will validate EVERY phase:**

### Validator Checklist:

1. ✅ Run all tests locally
2. ✅ Verify database changes in Supabase
3. ✅ Check test code quality
4. ✅ Run tests 5 times (verify consistency)
5. ✅ Test on all browsers
6. ✅ Review evidence (screenshots, output)

### Rejection Reasons:

- Tests don't run or fail
- No database verification
- Hardcoded test data
- Trivial assertions
- Missing error scenarios
- Flaky tests
- Production credentials
- Missing evidence

### Approval Criteria:

- All tests pass consistently
- Database changes verified
- High code quality
- All browsers work
- Complete evidence provided

---

## 📊 Expected Outcomes

**After completing all 4 phases:**

```bash
# Run all E2E tests
npm run test:e2e

# Expected output:
# ✓ 43 tests passed in 3 browsers (chromium, firefox, mobile)
# ✓ Average duration: 8-10 minutes
# ✓ 0 flaky tests
# ✓ All database changes verified
# ✓ CI/CD integrated
```

**Test Coverage:**

- Guest checkout flows
- User registration & authentication
- Authenticated user checkout
- Admin panel operations
- Promo code logic
- Multi-product cart management
- Payment gateway integration
- Error recovery scenarios
- Race condition handling
- Cross-browser compatibility

---

## 🎯 Success Metrics

### Quantitative

- 43+ E2E tests implemented
- 100% pass rate
- < 10 minutes total execution
- 0 flaky tests
- 3 browser projects

### Qualitative

- Tests verify real user behavior
- Tests catch actual bugs
- Meaningful assertions
- Edge case coverage
- Self-documenting code

---

## 💡 Quick Tips

1. **Read the master file first** (`e2e-0-master.md`)
2. **Follow the order** (don't skip phases)
3. **Verify database changes** after each test
4. **Use Persian test data** (names, addresses)
5. **Test on all browsers** before submitting
6. **Run tests 5 times** to verify consistency
7. **Provide complete evidence** (screenshots, output)
8. **Don't take shortcuts** (validator will catch it)

---

## 📁 File Tree (After Completion)

```
tests/
└── e2e/
    ├── .env                              # Test credentials (gitignored)
    ├── .env.example                      # Template
    ├── smoke.spec.ts                     # 3 smoke tests
    ├── journeys/
    │   ├── guest-checkout.spec.ts        # 8 tests
    │   ├── user-registration.spec.ts     # 5 tests
    │   ├── user-login.spec.ts            # 7 tests
    │   ├── authenticated-checkout.spec.ts# 4 tests
    │   ├── admin-panel.spec.ts           # 6 tests
    │   ├── promo-codes.spec.ts           # 4 tests
    │   └── multi-product-cart.spec.ts    # 4 tests
    ├── error-recovery.spec.ts            # 2 tests
    ├── fixtures/
    │   ├── products.ts
    │   ├── users.ts
    │   ├── seed.ts
    │   └── cleanup.ts
    ├── helpers/
    │   └── payment.ts
    └── utils/
        └── database.ts
```

---

## 🚦 Getting Started NOW

### For Implementation Agent:

1. Read `e2e-0-master.md` (10 minutes)
2. Read `e2e-1.md` completely (15 minutes)
3. Install Playwright: `npm install -D @playwright/test`
4. Create directory structure
5. Implement utilities and fixtures
6. Write smoke tests
7. Run tests: `npm run test:e2e`
8. Provide evidence and request validation

### For Validator Agent:

1. Read `e2e-0-master.md` validation protocol (10 minutes)
2. Wait for implementation agent submission
3. Run tests locally
4. Verify database changes
5. Check code quality
6. Provide APPROVE/REJECT decision with details

---

## 📞 Need Help?

- **Project docs:** `/home/dexter/Desktop/kitia/CLAUDE.md`
- **Integration tests:** `/home/dexter/Desktop/kitia/tests/README.md`
- **Playwright docs:** https://playwright.dev/docs/intro
- **Task files:** Read the specific `e2e-X.md` file for your phase

---

**Ready to start? Begin with `e2e-0-master.md` → then `e2e-1.md`**

Good luck! 🚀
