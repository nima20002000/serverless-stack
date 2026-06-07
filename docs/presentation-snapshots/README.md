# Presentation Snapshots

This directory contains presentation-ready screenshots that show the
capabilities and configuration options of the `serverless-stack` commerce
template.

The source of truth is [`manifest.json`](./manifest.json). Every stored image
must be listed there with its route, viewport, theme, locale, state, and safety
notes. Do not add screenshots as loose files.

## Directory Layout

```text
docs/presentation-snapshots/
  README.md
  manifest.json
  sample/
    storefront-home-desktop-light-en.png
  storefront/
    ...
  admin/
    ...
```

Use `sample/` only for workflow proof images. Full public-site captures belong
under `storefront/`; admin and configuration captures belong under `admin/`.

## Naming Convention

Use lowercase kebab-case:

```text
<area>-<section>-<state>-<viewport>-<theme>-<locale>.png
```

Examples:

```text
storefront-product-detail-variants-desktop-light-en.png
admin-products-editor-localized-desktop-dark-en.png
```

Required dimensions:

- `desktop`: 1440 x 1100 unless a manifest entry specifies otherwise.
- `mobile`: Pixel 5 profile unless a manifest entry specifies otherwise.

Required variants:

- Capture light and dark theme only where the visual difference demonstrates a
  capability.
- Capture locale, direction, and currency variants only where the snapshot
  demonstrates those options.
- Do not duplicate every page for every locale/theme unless the presentation
  needs that exact comparison.

## Safe Demo Data

Snapshots must use deterministic demo/test data only.

Never include:

- real customer names, emails, phone numbers, addresses, or order history;
- real payment references, card data, provider session IDs, webhook IDs, or
  transaction references;
- API keys, tokens, cookies, secret values, storage credentials, or inbox data;
- production-only media assets that could disappear or expose private content.

Prefer seeded E2E fixtures and stable local/test media. If a screenshot contains
an admin table, verify that all visible records are seeded demo records.

## Capture Workflow

Precondition: the disposable E2E Supabase project must already have enabled
`en` and `de` rows in `supported_languages`. The capture spec validates those
rows but does not mutate global language settings.

Run the focused capture spec from the repo root:

```bash
set -a; source .env; set +a
unset UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN
E2E_ALLOW_DESTRUCTIVE_DB=I_UNDERSTAND_E2E_DATABASE_IS_DESTRUCTIVE \
  npm --prefix tests run test:e2e -- --project=chromium \
  journeys/presentation-admin-snapshots.spec.ts \
  journeys/presentation-storefront-snapshots.spec.ts \
  journeys/presentation-snapshots.spec.ts
```

The workflow:

1. seeds deterministic storefront/admin demo data and captures the `NIM-227`
   storefront and `NIM-228` admin entries;
2. validates required manifest fields;
3. ensures output paths stay inside `docs/presentation-snapshots/`;
4. captures the `captureStatus: "sample"` entries to their manifest paths;
5. verifies that generated sample files exist and are non-empty.

If Playwright is blocked, use the same route/state/viewport values from
`manifest.json`, capture manually, save to the exact manifest path, and run the
manifest validation part of the Playwright spec once the blocker is removed.
Manual captures still require the review checklist below.

## Review Checklist

Before committing snapshots:

- The image is not blank and the intended UI section is visible.
- Text is readable at presentation scale.
- No obvious layout overlap, broken image, or loading skeleton remains.
- Viewport, theme, locale, direction, and state match the manifest entry.
- Data is deterministic demo/test data.
- No secrets, real customer details, real payment references, cookies, or tokens
  are visible.
- The file is stored under the approved path in this directory.
- The manifest entry explains what presentation capability the image shows.

## Issue Mapping

- `NIM-226`: this workflow, inventory, manifest, and sample capture proof.
- `NIM-227`: storefront capture set.
- `NIM-228`: admin/options capture set.
