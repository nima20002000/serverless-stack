# E2E Testing Master Plan - Overview & Validation

## 📋 Project Overview

This is a **4-phase implementation plan** for comprehensive End-to-End (E2E) testing of the Kitia e-commerce platform using Playwright.

**Current Testing State:**

- ✅ Unit Tests: 28 files (mocked services)
- ✅ Integration Tests: 15 files (REAL Supabase, Redis, R2)
- ❌ E2E Tests: 0 files (to be implemented)

**What E2E Tests Will Add:**

- Browser-based user interactions (clicks, forms, navigation)
- Full user journeys (browse → cart → checkout → payment)
- Client-side state management verification (Zustand, localStorage)
- UI/UX validation (RTL Persian text, responsive design)
- Cross-browser compatibility (Chrome, Firefox, Mobile)

---

## 🎯 Implementation Phases

### Phase 1: Infrastructure Setup

**File:** `e2e-1.md`

**Deliverables:**

- Playwright installation and configuration
- Directory structure (`tests/e2e/`)
- Environment configuration (`.env`, `.env.example`)
- Database utilities (`utils/database.ts`)
- Test fixtures (`fixtures/products.ts`, `fixtures/users.ts`)
- Seed/cleanup utilities (`fixtures/seed.ts`, `fixtures/cleanup.ts`)
- Payment mocking helpers (`helpers/payment.ts`)
- NPM scripts for running tests
- Smoke tests (3 tests to verify setup)

**Success Criteria:**

- ✅ `npm run test:e2e` runs 3 smoke tests
- ✅ All smoke tests pass on chromium, firefox
- ✅ Utilities throw errors on production credentials
- ✅ Payment mocking intercepts gateway redirects

**Estimated Time:** 4-6 hours

---

### Phase 2: Guest Checkout Journey

**File:** `e2e-2.md`

**Deliverables:**

- Complete guest checkout flow (happy path)
- Invalid OTP error handling
- Payment gateway failure handling
- Out of stock prevention
- Rate limit enforcement
- Empty cart prevention
- Form validation
- Mobile viewport checkout

**Test Count:** 8 tests

**Success Criteria:**

- ✅ All 8 tests pass consistently (5 runs)
- ✅ Tests verify database changes (transactions created)
- ✅ Tests verify stock management (decremented after purchase)
- ✅ Tests retrieve real OTP from database (not mocked)
- ✅ Tests work on all 3 browsers (chromium, firefox, mobile)
- ✅ Tests clean up after themselves (idempotent)

**Estimated Time:** 8-12 hours

---

### Phase 3: User Authentication & Authenticated Checkout

**File:** `e2e-3.md`

**Deliverables:**

**Registration Tests (5 tests):**

- Email + OTP registration
- Phone + OTP registration (passwordless)
- Duplicate email prevention
- Password strength validation
- Expired OTP handling

**Login Tests (7 tests):**

- Email + password login
- Phone + OTP login
- Wrong password error
- Non-existent user error
- Session persistence across reloads
- Logout and session clearing
- Rate limit enforcement

**Authenticated Checkout Tests (4 tests):**

- Auto-fill user info in checkout
- Save order to user history
- Skip OTP for authenticated users
- Update profile before checkout

**Test Count:** 16 tests

**Success Criteria:**

- ✅ All 16 tests pass consistently
- ✅ Tests verify user creation in database
- ✅ Tests verify password hashing (bcrypt)
- ✅ Tests verify NextAuth session cookies
- ✅ Tests verify JWT tokens
- ✅ Tests verify role-based access (USER role)

**Estimated Time:** 10-14 hours

---

### Phase 4: Admin Panel, Promo Codes & Final Integration

**File:** `e2e-4.md`

**Deliverables:**

**Admin Panel Tests (6 tests):**

- Admin access to admin panel
- Regular user denied access (403)
- Create product
- Update product
- Delete product
- View all orders

**Promo Code Tests (4 tests):**

- Apply valid promo code
- Reject invalid promo code
- Enforce usage limits
- Reject expired promo code

**Multi-Product Cart Tests (4 tests):**

- Multiple products in cart
- Update quantity and recalculate
- Remove product from cart
- Concurrent stock updates (race condition)

**Error Recovery Tests (2 tests):**

- Network failure during checkout
- Product out of stock during checkout

**CI Integration:**

- GitHub Actions workflow (`.github/workflows/e2e.yml`)
- Automated test runs on PR/push
- Artifact upload on failure

**Test Count:** 16 tests

**Success Criteria:**

- ✅ All 16 tests pass
- ✅ Admin role enforcement verified
- ✅ Promo code logic verified end-to-end
- ✅ Concurrent purchase race conditions handled
- ✅ CI pipeline runs successfully
- ✅ **Total E2E suite: 40+ tests**

**Estimated Time:** 12-16 hours

---

## 📊 Total Scope

| Phase     | Tests  | Focus                  | Time Estimate   |
| --------- | ------ | ---------------------- | --------------- |
| Phase 1   | 3      | Infrastructure & Setup | 4-6 hours       |
| Phase 2   | 8      | Guest Checkout         | 8-12 hours      |
| Phase 3   | 16     | Auth & User Checkout   | 10-14 hours     |
| Phase 4   | 16     | Admin, Promos, Errors  | 12-16 hours     |
| **TOTAL** | **43** | **Complete E2E Suite** | **34-48 hours** |

---

## ⚠️ Anti-Reward Hacking Measures

### Why This Matters

AI agents optimizing for "task completion" may:

- Write trivial tests that always pass
- Mock everything (including database) defeating the purpose
- Use hardcoded values instead of dynamic test data
- Skip error scenarios and edge cases
- Write superficial assertions (`.toBeVisible()` without value checks)

### Prevention Strategy

**Each task file includes:**

1. **Explicit Validation Checklist**
   - Concrete, measurable success criteria
   - No ambiguous "implement tests" - specific test counts and scenarios

2. **Required Evidence**
   - Screenshots of tests passing
   - Database screenshots showing changes
   - Terminal output of multiple consecutive runs
   - CI pipeline success

3. **Quality Requirements**
   - NO trivial assertions (`.toBeDefined()`, `.toBeTruthy()` alone)
   - MUST verify actual values, types, ranges
   - MUST test error scenarios (not just happy paths)
   - MUST verify database state changes
   - MUST use dynamic test data (not hardcoded)

4. **Validator Role**
   - Another AI agent will review ALL work
   - Validator has authority to reject incomplete/superficial work
   - Validator must run tests themselves
   - Validator must verify database changes

---

## 🔍 Validation Protocol

### For Each Phase, Validator Must:

1. **Run Tests Locally**

   ```bash
   cd /home/dexter/Desktop/kitia
   npm run test:e2e:chromium
   npm run test:e2e:firefox
   npm run test:e2e:mobile
   ```

2. **Verify Database Changes**
   - Open Supabase dashboard
   - Check transactions table for test data
   - Check products table for stock changes
   - Check users table for created users
   - Verify all test data is cleaned up

3. **Check Test Quality**
   - Read test code for meaningful assertions
   - Verify no `any` types used
   - Verify error scenarios tested
   - Verify edge cases covered
   - Verify no hardcoded test data

4. **Verify Consistency**
   - Run tests 5 times in a row
   - All runs must pass
   - No flaky tests allowed
   - No manual cleanup required between runs

5. **Cross-Browser Check**
   - Tests pass on chromium
   - Tests pass on firefox
   - Mobile tests pass on mobile viewport

6. **Review Evidence**
   - Screenshots provided and accurate
   - Terminal output shows all tests passing
   - Database screenshots show expected changes
   - No evidence of shortcuts or gaming

### Rejection Criteria

**Reject if ANY of these are true:**

- Tests don't run or fail
- Tests don't verify database changes
- Tests use hardcoded phone numbers/emails/IDs
- Tests don't retrieve real OTP from database
- Tests mock Supabase/Redis (should use real test instances)
- Assertions are trivial (`.toBeVisible()` without value checks)
- Missing error scenarios
- Missing edge cases
- Tests are flaky (fail randomly)
- Tests don't clean up after themselves
- Missing required evidence
- Production credentials detected
- Code uses `any` types
- Silent error swallowing

### Approval Criteria

**Approve ONLY if ALL of these are true:**

- ✅ All tests pass consistently (5 runs)
- ✅ Tests verify database changes
- ✅ Tests use dynamic test data
- ✅ Tests retrieve real data from services
- ✅ Meaningful assertions on actual values
- ✅ Error scenarios tested
- ✅ Edge cases covered
- ✅ Cross-browser compatibility
- ✅ Tests are idempotent
- ✅ Code quality is high
- ✅ All evidence provided
- ✅ No shortcuts taken

---

## 🚀 Getting Started

### Prerequisites

Before starting Phase 1, ensure:

- [ ] Node.js 20+ installed
- [ ] npm installed
- [ ] Git repository initialized
- [ ] Main application runs (`npm run dev`)
- [ ] Integration tests passing (`cd tests && npm test`)
- [ ] Separate Supabase project/database for E2E tests
- [ ] Separate Upstash Redis database for E2E tests
- [ ] Test R2 bucket created (or can use same as integration tests)

### Execution Order

**IMPORTANT:** Tasks MUST be completed in order:

1. E2E Task 1 (Infrastructure)
2. E2E Task 2 (Guest Checkout) - requires Task 1 approved
3. E2E Task 3 (Auth & User) - requires Task 2 approved
4. E2E Task 4 (Admin & Final) - requires Task 3 approved

**DO NOT skip phases or work in parallel.**

### Agent Instructions

If you are an AI agent implementing these tasks:

1. **Read the ENTIRE task file** before starting
2. **Follow anti-reward hacking rules** strictly
3. **Implement ALL tests** specified (not a subset)
4. **Verify your work** before submitting
5. **Provide ALL required evidence**
6. **Do NOT proceed** to next task until current task approved

Remember: **Quality over speed.** 1 high-quality test > 10 superficial tests.

---

## 📁 Expected File Structure (After Completion)

```
/home/dexter/Desktop/kitia/
├── playwright.config.ts                    # Playwright configuration
├── package.json                             # Updated with E2E scripts
├── .github/
│   └── workflows/
│       └── e2e.yml                          # CI workflow
└── tests/
    └── e2e/
        ├── .env                             # Test environment (gitignored)
        ├── .env.example                     # Environment template
        ├── .gitignore                       # Ignore test artifacts
        ├── smoke.spec.ts                    # Infrastructure smoke tests
        │
        ├── journeys/                        # Full user journey tests
        │   ├── guest-checkout.spec.ts       # Guest checkout (8 tests)
        │   ├── user-registration.spec.ts    # Registration (5 tests)
        │   ├── user-login.spec.ts           # Login (7 tests)
        │   ├── authenticated-checkout.spec.ts # Auth checkout (4 tests)
        │   ├── admin-panel.spec.ts          # Admin (6 tests)
        │   ├── promo-codes.spec.ts          # Promo codes (4 tests)
        │   └── multi-product-cart.spec.ts   # Cart (4 tests)
        │
        ├── error-recovery.spec.ts           # Error scenarios (2 tests)
        │
        ├── fixtures/                        # Test data
        │   ├── products.ts                  # Product factories
        │   ├── users.ts                     # User factories
        │   ├── seed.ts                      # Database seeding
        │   └── cleanup.ts                   # Cleanup utilities
        │
        ├── helpers/                         # Reusable helpers
        │   ├── payment.ts                   # Payment gateway mocking
        │   ├── auth.ts                      # Auth helpers (optional)
        │   └── cart.ts                      # Cart helpers (optional)
        │
        └── utils/                           # Utilities
            ├── database.ts                  # Database utilities
            └── assertions.ts                # Custom assertions (optional)
```

---

## 📈 Progress Tracking

### Phase 1: Infrastructure Setup

- [ ] Playwright installed
- [ ] Configuration created
- [ ] Directory structure created
- [ ] Environment configured
- [ ] Database utilities implemented
- [ ] Fixtures created
- [ ] Payment helpers implemented
- [ ] NPM scripts added
- [ ] Smoke tests passing
- [ ] **VALIDATOR APPROVED**

### Phase 2: Guest Checkout

- [ ] Happy path test implemented
- [ ] Invalid OTP test implemented
- [ ] Payment failure test implemented
- [ ] Out of stock test implemented
- [ ] Rate limit test implemented
- [ ] Empty cart test implemented
- [ ] Form validation test implemented
- [ ] Mobile viewport test implemented
- [ ] All 8 tests passing consistently
- [ ] Database changes verified
- [ ] **VALIDATOR APPROVED**

### Phase 3: Authentication

- [ ] Email registration test implemented
- [ ] Phone registration test implemented
- [ ] Duplicate prevention test implemented
- [ ] Password validation test implemented
- [ ] Expired OTP test implemented
- [ ] Email login test implemented
- [ ] Phone login test implemented
- [ ] Wrong password test implemented
- [ ] Non-existent user test implemented
- [ ] Session persistence test implemented
- [ ] Logout test implemented
- [ ] Login rate limit test implemented
- [ ] Auto-fill checkout test implemented
- [ ] Order history test implemented
- [ ] No OTP for auth users test implemented
- [ ] Update profile test implemented
- [ ] All 16 tests passing consistently
- [ ] User creation verified in database
- [ ] **VALIDATOR APPROVED**

### Phase 4: Final Integration

- [ ] Admin access test implemented
- [ ] User denied access test implemented
- [ ] Create product test implemented
- [ ] Update product test implemented
- [ ] Delete product test implemented
- [ ] View all orders test implemented
- [ ] Apply promo test implemented
- [ ] Invalid promo test implemented
- [ ] Promo usage limit test implemented
- [ ] Expired promo test implemented
- [ ] Multi-product cart test implemented
- [ ] Update quantity test implemented
- [ ] Remove product test implemented
- [ ] Concurrent stock test implemented
- [ ] Network failure test implemented
- [ ] Out of stock during checkout test implemented
- [ ] CI workflow created
- [ ] All 16 tests passing
- [ ] CI pipeline passing
- [ ] **VALIDATOR APPROVED**

### Final Sign-Off

- [ ] All 43 tests passing
- [ ] Cross-browser verified (chromium, firefox, mobile)
- [ ] CI/CD integrated
- [ ] Documentation complete
- [ ] **PROJECT COMPLETE**

---

## 🎓 Learning Resources

### Playwright Documentation

- https://playwright.dev/docs/intro
- https://playwright.dev/docs/test-assertions
- https://playwright.dev/docs/locators

### Kitia Codebase

- `/home/dexter/Desktop/kitia/CLAUDE.md` - Project documentation
- `/home/dexter/Desktop/kitia/tests/README.md` - Integration tests README
- `/home/dexter/Desktop/kitia/tests/SUMMARY.md` - Testing strategy

### Related Task Files

- `task000.md` - Integration testing guidelines (anti-reward hacking examples)
- `task001.md` - Unit testing implementation

---

## 💡 Tips for Success

1. **Read task files completely** before starting
2. **Run tests frequently** during development
3. **Verify database changes** after each test
4. **Use meaningful test data** (Persian text, realistic values)
5. **Test on all browsers** before submitting
6. **Provide clear evidence** (screenshots, terminal output)
7. **Clean up test data** between tests
8. **Handle async operations** properly (no hardcoded waits)
9. **Write maintainable code** (future developers will thank you)
10. **Ask for clarification** if requirements are unclear

---

## 🤝 Collaboration Protocol

### Between Implementation Agent and Validator

**Implementation Agent:**

- Complete ALL checklist items before requesting validation
- Provide ALL required evidence
- Document any deviations or issues
- Be honest about shortcuts taken (there shouldn't be any)

**Validator Agent:**

- Run ALL tests yourself (don't trust screenshots alone)
- Verify database changes in Supabase
- Check code quality and test meaningfulness
- Provide specific feedback on rejections
- Approve only when ALL criteria met

**Communication:**

- Implementation agent submits phase completion with evidence
- Validator reviews within 24 hours
- Validator provides APPROVE or REJECT with detailed reasons
- If REJECTED, implementation agent fixes issues and resubmits
- If APPROVED, implementation agent proceeds to next phase

---

## 🎯 Success Metrics

### Quantitative Metrics

- [ ] 43+ E2E tests implemented
- [ ] 100% pass rate (all tests passing)
- [ ] < 10 minutes total test execution time
- [ ] 0 flaky tests (tests that randomly fail)
- [ ] 3 browser projects (chromium, firefox, mobile)
- [ ] 100% cleanup rate (no orphaned test data)

### Qualitative Metrics

- [ ] Tests verify real user behavior
- [ ] Tests catch actual bugs (not just pass)
- [ ] Tests are maintainable (clear, well-structured)
- [ ] Tests have meaningful assertions
- [ ] Tests cover edge cases and errors
- [ ] Tests are self-documenting (clear test names)

---

## ✅ Final Checklist (Before Marking Complete)

- [ ] All 4 phases completed and approved
- [ ] All 43 tests passing
- [ ] Cross-browser testing verified
- [ ] CI/CD pipeline integrated
- [ ] Database changes verified
- [ ] Stock management verified
- [ ] Authentication flows verified
- [ ] Payment flows verified
- [ ] Admin access control verified
- [ ] Promo code logic verified
- [ ] Error handling verified
- [ ] Race conditions handled
- [ ] Test data cleanup verified
- [ ] Documentation updated
- [ ] Evidence package complete

**When all checkboxes are ✅, E2E testing implementation is COMPLETE.**

---

## 📞 Support

If you encounter issues:

1. Review the specific task file (`e2e-1.md`, `e2e-2.md`, etc.)
2. Check `CLAUDE.md` for project-specific guidance
3. Review integration test examples in `tests/integration/`
4. Check Playwright documentation
5. Ask the validator for clarification (if needed)

**Remember:** This is a significant undertaking. Quality is paramount. Take your time and do it right.

---

**Good luck! 🚀**
