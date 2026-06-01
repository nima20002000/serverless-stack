# task009: Public Storefront Redesign

Status: Commit-reviewed clean

## Goal

Replace the Kitia-specific public storefront with a neutral, boilerplate-quality storefront using the new design system.

## Start Here

- Read `tasks/open-source-boilerplate-conversion/handoff.md`.
- Confirm `task008` is complete.
- Read `/home/dexter/.shared-agent-skills/codex-review-mode/SKILL.md`.

## Files To Inspect First

- `src/app/page.tsx`
- `src/app/products/page.tsx`
- `src/app/products/[id]/page.tsx`
- `src/app/cart/page.tsx`
- `src/app/wishlist/page.tsx`
- `src/app/about/page.tsx`
- `src/app/contact/page.tsx`
- `src/app/faq/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`
- `src/app/shipping/page.tsx`
- `src/app/refund-policy/page.tsx`
- `src/components/products/`
- `src/components/cart/`
- `src/components/wishlist/`
- `src/components/home/`
- `src/components/layout/Header.tsx`
- `src/components/layout/Footer.tsx`

## Requirements

- Redesign public pages to be neutral and reusable by any commerce project.
- Remove Kitia product/category assumptions, CDN hero images, social links, Telegram/Instagram references, Persian shipping/policy specifics, and charity/brand-specific claims.
- Keep the app usable as the first screen; do not turn it into a marketing-only landing page.
- Product listing, product detail, cart, wishlist, and search should remain functional.
- Use neutral placeholder copy and imagery strategy. If real demo images are needed, use configurable sample image URLs or local placeholders.
- Keep layout responsive and usable on mobile and desktop.
- Use shared formatting utilities for price/currency.

## Acceptance Criteria

- Public storefront contains no Kitia branding, private social links, Persian text, or private CDN URLs.
- Header/footer are neutral and configurable.
- Product, cart, and wishlist flows still use existing data contracts.
- Responsive layout has no obvious overlapping text or controls.

## Verification To Run

- `npm run verify`
- `npm run lint`
- `npm run build`
- `npm run test:unit -- cart`
- `rg -n "Kitia|کیتیا|kitia\\.ir|cdn\\.kitia|telegram|instagram\\.com/kitia|fa-IR|تومان|[\\u0600-\\u06FF]" src/app src/components`
- `git diff --check`

## Mandatory Review Loop

After implementation and checks, run:

```bash
printf '%s\n' "Review the uncommitted changes for task009: Public Storefront Redesign. Focus on broken storefront flows, stale branding/private URLs, responsive UI regressions, data-contract breaks, and accessibility." | "$HOME/.codex/skills/codex-review-mode/scripts/run_codex_review.sh" --stdin
```

Fix all valid findings, re-run checks, and repeat review until there are zero valid findings.

## Completion Instructions

1. Add a completion update to this file with redesigned surfaces, checks run, and review output paths.
2. Append a matching update to `tasks/open-source-boilerplate-conversion/handoff.md`.
3. State whether `task010` can proceed.

## Completion Update - 2026-05-31

Worker E completed the public storefront redesign scope:

- Neutralized public storefront pages: home, product listing/detail/loading, cart, wishlist, about, contact, FAQ, privacy, terms, shipping, refund policy, and not-found.
- Neutralized public layout/components: header, footer, home feature/CTA sections, product cards/list/detail/gallery/variant selector/related products, cart drawer/icon/item/page/summary, wishlist button/icon/page/item card, FAQ list, search/select helpers, and public badge placeholder.
- Removed stale public CDN preload references from `src/app/layout.tsx`.
- Kept product, cart, wishlist, and search flows on existing service/store/data contracts; updated cart-store user-facing errors to neutral English while preserving behavior.
- Fixed the valid review finding by forwarding standard div props through `src/components/ui/Card.tsx`, allowing `FeaturesSection` transition delay styles without a type error.

Checks run:

- `npm run verify` passed.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- cart` passed: 1 file, 6 tests.
- `rg -n "Kitia|کیتیا|kitia\\.ir|cdn\\.kitia|telegram|instagram\\.com/kitia|fa-IR|تومان|[\\u0600-\\u06FF]" src/app src/components` returned no matches.
- `git diff --check` passed.
- `npm run lint` failed on the existing repo-level ESLint 9 blocker: missing `eslint.config.(js|mjs|cjs)`.
- `npm run build` failed on the existing Next 16/Turbopack plus custom webpack config blocker; it also reported existing invalid `next.config.js` keys `optimizeFonts` and `swcMinify`.

Review loop:

- First required review completed at `/tmp/codex-review.DWcULX.txt`. It reported one valid task009 issue, the unsupported `style` prop passed to `Card` from `FeaturesSection`; fixed in `src/components/ui/Card.tsx`.
- The same review also reported phone canonicalization in `src/lib/utils/text.ts` and missing Supabase seed assets in `supabase/seed.sql`; those are auth/seed-data ownership areas and were not caused by the storefront redesign.
- Review rerun was attempted after the fix. Output path: `/tmp/codex-review.yJzija.txt`. The rerun hung while traversing the large shared dirty worktree and unrelated concurrent worker diffs, so the task009 review process tree was stopped after several minutes. No final rerun findings were produced.

Task010 could proceed functionally from the public storefront surface at this point. The earlier strict review-mode blocker is superseded by the commit-based finalization below.

## Finalization Update - 2026-06-01 worker M

Finalized the task009 public storefront surface as part of the combined tasks009-011 pass. Fixed remaining valid scoped regressions where earlier copy cleanup had left broken placeholder English in public product/category/tag/promo/wishlist API and service paths, public search/promo responses, product/media/variant messages, wishlist messages, and matching unit/E2E expectations. Also cleaned task009-scoped E2E selectors for public search, payment recovery, wishlist, product/category/admin-product journeys where they were still looking for placeholder copy such as `Searchtext`, `detailsortext`, or `textoftext`.

Additional checks run by worker M:

- `npm run verify` passed.
- `npm run lint` passed.
- `npm run build` passed with placeholder Supabase/Auth/Stripe/PayPal env.
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- cart` passed (1 file / 6 tests).
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret npm run test:unit -- products promo categories tags wishlist search` passed (17 files / 146 tests).
- Public scrub `rg -n "Kitia|کیتیا|kitia\\.ir|cdn\\.kitia|telegram|instagram\\.com/kitia|fa-IR|تومان|[\\u0600-\\u06FF]" src/app src/components` returned no matches.
- Placeholder-copy scrub over scoped source/tests returned no matches.
- `git diff --check` passed.

Review-mode status:

- Combined tasks009-011 review attempt before final copy fixes produced partial transcript `/tmp/codex-review.8DaFNL.txt`; wrapper log `/tmp/codex-review-task009-011-wrapper.log` was empty. It did not reach a final findings section, but the transcript exposed broken public/admin service copy that worker M fixed.
- Combined rerun after source/unit fixes produced partial transcript `/tmp/codex-review.5nzj35.txt`; wrapper log `/tmp/codex-review-task009-011-final-rerun.log` was empty. It did not reach a final findings section, but the transcript exposed broken E2E selector copy that worker M fixed.
- Final short combined rerun produced partial transcript `/tmp/codex-review.p8B9Sn.txt`; wrapper log `/tmp/codex-review-task009-011-final-short.log` was empty. It did not produce final findings before exiting, and no task009-011 review process was left running.

## Commit-Based Review Finalization - 2026-06-01

- Final reviewed task commit: `65800fe` (`task009: redesign neutral public storefront`).
- Review target was the exact task009 commit, not uncommitted files and not the full branch.
- Review output path: `tasks/open-source-boilerplate-conversion/reviews/task009-round1.txt`.
- Round 1 reviewed final commit `65800fe` and returned no valid findings.
- Checks run for the final task009 state:
  - `git diff --check 65800fe^ 65800fe` passed.
  - `npm run verify` passed on the replayed branch.
  - `npm run lint -- --quiet` passed on the replayed branch.
  - Production build with placeholder Supabase/Auth/Stripe/PayPal env passed on the replayed branch.
  - `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable SUPABASE_SECRET_KEY=test-secret NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY=US npm run test:unit -- cart` passed: 1 file / 6 tests.
  - `rg -n "Kitia|کیتیا|kitia\\.ir|cdn\\.kitia|telegram|instagram\\.com/kitia|fa-IR|تومان|[\\u0600-\\u06FF]" src/app src/components` returned no matches.
- Remaining task009 blockers: none from the commit-based review. Task010 is next in the sequential commit-based review queue.
