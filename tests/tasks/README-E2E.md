# E2E Testing Implementation Tasks - Index

This directory contains comprehensive task files for implementing End-to-End (E2E) testing for the Kitia e-commerce platform using Playwright.

## 📚 Task Files

### Start Here

- **[E2E-QUICK-START.md](./E2E-QUICK-START.md)** - Quick reference guide (read this first!)
- **[e2e-0-master.md](./e2e-0-master.md)** - Master plan, validation protocol, anti-reward hacking measures

### Implementation Tasks (Complete in Order)

1. **[e2e-1.md](./e2e-1.md)** - Phase 1: Playwright Setup & Infrastructure (3 tests)
2. **[e2e-2.md](./e2e-2.md)** - Phase 2: Guest Checkout Journey (8 tests)
3. **[e2e-3.md](./e2e-3.md)** - Phase 3: User Registration & Authenticated Checkout (16 tests)
4. **[e2e-4.md](./e2e-4.md)** - Phase 4: Admin Panel, Promo Codes & Final Integration (16 tests)

## 🎯 Quick Overview

### What Gets Built

- **43+ E2E tests** covering all critical user journeys
- **Playwright configuration** for multi-browser testing
- **Test infrastructure** (fixtures, utilities, helpers)
- **Database utilities** with production safeguards
- **Payment gateway mocking** for Zarinpal/Digipay
- **CI/CD integration** with GitHub Actions

### Testing Approach

- ✅ **Real services**: Use actual Supabase, Upstash Redis (test instances)
- ✅ **Real database changes**: Verify transactions created, stock updated
- ✅ **Real OTP retrieval**: Get codes from database (not mocked)
- ❌ **Mock only external**: SMS sending, payment gateway redirects
- ✅ **Cross-browser**: Chromium, Firefox, Mobile

### Anti-Reward Hacking

Every task file includes strict quality measures:

- No trivial assertions (`.toBeDefined()` alone not allowed)
- Must verify database changes
- Must use dynamic test data (no hardcoded values)
- Must test error scenarios and edge cases
- Another AI agent validates ALL work

## 📋 Implementation Phases

| Phase     | File     | Focus                  | Tests  | Time       |
| --------- | -------- | ---------------------- | ------ | ---------- |
| 1         | e2e-1.md | Infrastructure Setup   | 3      | 4-6h       |
| 2         | e2e-2.md | Guest Checkout         | 8      | 8-12h      |
| 3         | e2e-3.md | Authentication         | 16     | 10-14h     |
| 4         | e2e-4.md | Admin & Final          | 16     | 12-16h     |
| **Total** |          | **Complete E2E Suite** | **43** | **34-48h** |

## 🚀 Getting Started

### For Implementation Agent:

```bash
# 1. Read the quick start guide
cat E2E-QUICK-START.md

# 2. Read the master plan
cat e2e-0-master.md

# 3. Start with Phase 1
cat e2e-1.md
# Then implement according to instructions

# 4. Continue through phases 2-4 after validation
```

### For Validator Agent:

```bash
# 1. Read validation protocol
cat e2e-0-master.md
# See "Validation Protocol" section

# 2. Review submission from implementation agent

# 3. Run tests locally
cd /home/dexter/Desktop/kitia
npm run test:e2e

# 4. Verify database changes in Supabase

# 5. Provide APPROVE/REJECT decision
```

## 📊 Expected Outcomes

After completing all 4 phases:

### Test Suite

```bash
npm run test:e2e

# Output:
# ✓ tests/e2e/smoke.spec.ts (3 tests)
# ✓ tests/e2e/journeys/guest-checkout.spec.ts (8 tests)
# ✓ tests/e2e/journeys/user-registration.spec.ts (5 tests)
# ✓ tests/e2e/journeys/user-login.spec.ts (7 tests)
# ✓ tests/e2e/journeys/authenticated-checkout.spec.ts (4 tests)
# ✓ tests/e2e/journeys/admin-panel.spec.ts (6 tests)
# ✓ tests/e2e/journeys/promo-codes.spec.ts (4 tests)
# ✓ tests/e2e/journeys/multi-product-cart.spec.ts (4 tests)
# ✓ tests/e2e/error-recovery.spec.ts (2 tests)
#
# 43 passed (8-10m)
```

### File Structure

```
tests/e2e/
├── smoke.spec.ts
├── journeys/
│   ├── guest-checkout.spec.ts
│   ├── user-registration.spec.ts
│   ├── user-login.spec.ts
│   ├── authenticated-checkout.spec.ts
│   ├── admin-panel.spec.ts
│   ├── promo-codes.spec.ts
│   └── multi-product-cart.spec.ts
├── error-recovery.spec.ts
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

### CI/CD Integration

```yaml
# .github/workflows/e2e.yml
# Automated E2E test runs on PR/push
# Screenshots and videos on failure
```

## ⚠️ Critical Rules

### Must Follow:

1. ✅ Complete phases IN ORDER (1 → 2 → 3 → 4)
2. ✅ Get validator approval before next phase
3. ✅ Verify database changes after each test
4. ✅ Test on all browsers (chromium, firefox, mobile)
5. ✅ Provide complete evidence (screenshots, output)
6. ✅ Use dynamic test data (no hardcoded values)
7. ✅ Test error scenarios and edge cases
8. ✅ Write meaningful assertions

### Must NOT:

1. ❌ Skip phases or work in parallel
2. ❌ Mock Supabase/Redis (use real test instances)
3. ❌ Use hardcoded phone numbers/emails/IDs
4. ❌ Write trivial assertions (`.toBeVisible()` alone)
5. ❌ Skip error scenarios
6. ❌ Use production credentials
7. ❌ Write flaky tests
8. ❌ Take shortcuts

## 🎓 Documentation

### Project Context

- **Main project docs**: `/home/dexter/Desktop/kitia/CLAUDE.md`
- **Testing overview**: `/home/dexter/Desktop/kitia/tests/README.md`
- **Integration tests**: `/home/dexter/Desktop/kitia/tests/SUMMARY.md`

### External Resources

- **Playwright docs**: https://playwright.dev/docs/intro
- **Assertions**: https://playwright.dev/docs/test-assertions
- **Locators**: https://playwright.dev/docs/locators

## 📞 Support

### If You're Stuck:

1. Re-read the specific task file for your phase
2. Check the master file (`e2e-0-master.md`) for guidance
3. Review integration test examples in `tests/integration/`
4. Check Playwright documentation
5. Ask validator for clarification

## ✅ Success Criteria

A phase is complete when:

- [ ] All tests implemented as specified
- [ ] All tests pass consistently (5 runs)
- [ ] Database changes verified
- [ ] Cross-browser testing verified
- [ ] Code quality is high
- [ ] All evidence provided
- [ ] Validator approves

The entire E2E implementation is complete when:

- [ ] All 4 phases approved by validator
- [ ] 43+ tests passing
- [ ] CI/CD integrated
- [ ] Documentation updated
- [ ] No flaky tests
- [ ] All metrics met

## 🎯 Final Checklist

Before marking the entire E2E project complete:

- [ ] Phase 1 completed and approved ✓
- [ ] Phase 2 completed and approved ✓
- [ ] Phase 3 completed and approved ✓
- [ ] Phase 4 completed and approved ✓
- [ ] All 43 tests passing ✓
- [ ] Chromium tests passing ✓
- [ ] Firefox tests passing ✓
- [ ] Mobile tests passing ✓
- [ ] CI/CD pipeline integrated ✓
- [ ] Database verification complete ✓
- [ ] No flaky tests ✓
- [ ] Test execution < 10 minutes ✓
- [ ] Documentation complete ✓
- [ ] Evidence package complete ✓

**When all boxes are checked, E2E testing is COMPLETE! 🎉**

---

## 📝 Notes

This is a comprehensive, production-ready E2E testing implementation designed to:

- Catch real bugs before they reach production
- Verify all critical user journeys work end-to-end
- Ensure cross-browser compatibility
- Validate database integrity
- Test error handling and edge cases
- Enable confident deployments via CI/CD

**Quality is paramount.** Take the time to do it right. The validation protocol ensures no shortcuts are taken.

---

**Ready to start? Open `E2E-QUICK-START.md` first!**
