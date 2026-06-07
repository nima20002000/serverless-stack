import {
  type Browser,
  type BrowserContextOptions,
  devices,
  expect,
  test,
  type Page,
} from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

type SnapshotViewport = 'desktop' | 'mobile';
type SnapshotTheme = 'dark' | 'light' | 'system';
type SnapshotArea = 'admin' | 'storefront';
type SnapshotStatus = 'captured' | 'planned' | 'sample';
type SnapshotMethod = 'manual' | 'playwright';

type SnapshotEntry = {
  id: string;
  issue: string;
  area: SnapshotArea;
  section: string;
  capability: string;
  route: string;
  outputPath: string;
  viewport: SnapshotViewport;
  theme: SnapshotTheme;
  locale: string;
  direction: 'ltr' | 'rtl';
  authState: string;
  stateSetup: string;
  captureStatus: SnapshotStatus;
  captureMethod: SnapshotMethod;
  notes: string;
};

type SnapshotManifest = {
  schemaVersion: number;
  generatedByIssue: string;
  snapshotRoot: string;
  safetyRules: string[];
  entries: SnapshotEntry[];
};

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const appBaseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const manifestPath = path.join(
  repoRoot,
  'docs/presentation-snapshots/manifest.json'
);
const snapshotRoot = path.join(repoRoot, 'docs/presentation-snapshots');
const themeStorageKey = 'serverless-stack-theme';
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const localePattern = /^[a-z]{2}(?:-[A-Z]{2})?$/;
const approvedSnapshotDirs = new Set(['admin', 'sample', 'storefront']);
const requiredSafetyRuleTerms = [
  'deterministic demo/test data',
  'real customer',
  'payment references',
  'api keys',
  'tokens',
  'cookies',
  'secrets',
];

const requiredSections = new Set([
  'storefront:home',
  'storefront:products',
  'storefront:product-detail',
  'storefront:cart',
  'storefront:checkout',
  'storefront:payment-status',
  'storefront:profile',
  'admin:dashboard',
  'admin:products',
  'admin:product-editor',
  'admin:categories-tags',
  'admin:media-storage',
  'admin:settings',
  'admin:users-transactions',
  'admin:analytics',
  'admin:observability',
]);

async function readManifest(): Promise<SnapshotManifest> {
  const rawManifest = await fs.readFile(manifestPath, 'utf8');
  return JSON.parse(rawManifest) as SnapshotManifest;
}

async function listPngFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return listPngFiles(entryPath);
      }

      return entry.isFile() && entry.name.endsWith('.png') ? [entryPath] : [];
    })
  );

  return files.flat();
}

function toRepoRelativePath(filePath: string) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function resolveOutputPath(outputPath: string) {
  return path.resolve(repoRoot, outputPath);
}

function expectInsideSnapshotRoot(entry: SnapshotEntry) {
  const resolvedOutputPath = resolveOutputPath(entry.outputPath);
  const relativeOutputPath = path.relative(snapshotRoot, resolvedOutputPath);

  expect(
    relativeOutputPath,
    `${entry.id} must write inside docs/presentation-snapshots/`
  ).not.toMatch(/^(\.\.|[/\\])/);

  const relativeSegments = relativeOutputPath.split(path.sep);
  expect(
    relativeSegments,
    `${entry.id} must not use traversal segments in outputPath`
  ).not.toContain('..');
  expect(
    approvedSnapshotDirs.has(relativeSegments[0]),
    `${entry.id} must write under admin/, sample/, or storefront/`
  ).toBe(true);
  expect(
    relativeSegments.length,
    `${entry.id} must write to a file inside an approved snapshot subdirectory`
  ).toBeGreaterThan(1);
}

async function newSnapshotPage(browser: Browser, entry: SnapshotEntry) {
  const contextOptions: BrowserContextOptions =
    entry.viewport === 'mobile'
      ? { ...devices['Pixel 5'] }
      : { viewport: { width: 1440, height: 1100 } };
  const context = await browser.newContext({
    ...contextOptions,
    extraHTTPHeaders: {
      'x-e2e-test': 'true',
    },
  });

  return {
    context,
    page: await context.newPage(),
  };
}

async function expectNoNextJsErrorOverlay(page: Page) {
  await expect(
    page.locator(
      'nextjs-portal [data-nextjs-dialog], [data-nextjs-dialog], [data-nextjs-dialog-overlay]'
    ),
    'Next.js error overlays must fail the snapshot capture, not be hidden'
  ).toHaveCount(0);
}

async function preparePageForSnapshot(page: Page, entry: SnapshotEntry) {
  await page.addInitScript(
    ({ storageKey, theme }) => {
      window.localStorage.setItem(storageKey, theme);
    },
    { storageKey: themeStorageKey, theme: entry.theme }
  );

  const targetUrl = new URL(entry.route, appBaseURL);
  expect(targetUrl.origin).toBe(new URL(appBaseURL).origin);

  await page.goto(targetUrl.href);
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', entry.locale);
  await expect(page.locator('html')).toHaveAttribute('dir', entry.direction);

  if (entry.id === 'storefront-home-desktop-light-en') {
    await expect(
      page.getByRole('heading', {
        name: /A production-minded commerce storefront/i,
      })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  }

  await expectNoNextJsErrorOverlay(page);

  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }

      nextjs-portal,
      [data-nextjs-dev-tools-button],
      [aria-label="Next.js logo"],
      [aria-label="Open Next.js Dev Tools"] {
        display: none !important;
        visibility: hidden !important;
      }
    `,
  });

  await expectNoNextJsErrorOverlay(page);
}

test.describe('presentation snapshot manifest', () => {
  test('maps every required capability to a safe repo-local route and output path', async () => {
    const manifest = await readManifest();
    const ids = new Set<string>();
    const outputPaths = new Set<string>();
    const presentSections = new Set<string>();

    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.generatedByIssue).toBe('NIM-226');
    expect(manifest.snapshotRoot).toBe('docs/presentation-snapshots');
    expect(manifest.safetyRules.length).toBeGreaterThanOrEqual(4);
    expect(manifest.entries.length).toBeGreaterThanOrEqual(
      requiredSections.size
    );

    const safetyRulesText = manifest.safetyRules.join('\n').toLowerCase();
    for (const requiredSafetyRuleTerm of requiredSafetyRuleTerms) {
      expect(
        safetyRulesText,
        `manifest safety rules must cover ${requiredSafetyRuleTerm}`
      ).toContain(requiredSafetyRuleTerm);
    }

    for (const entry of manifest.entries) {
      expect(entry.id).toMatch(idPattern);
      expect(entry.issue).toMatch(/^NIM-\d+$/);
      expect(['admin', 'storefront']).toContain(entry.area);
      expect(entry.section).toMatch(idPattern);
      expect(entry.capability.trim().length).toBeGreaterThan(20);
      expect(entry.route).toMatch(/^\/(?![/\\])/);
      expect(entry.route).not.toContain('\\');
      expect(entry.outputPath).toMatch(
        /^docs\/presentation-snapshots\/(?:admin|sample|storefront)\//
      );
      expect(entry.outputPath).toMatch(/\.png$/);
      expect(['desktop', 'mobile']).toContain(entry.viewport);
      expect(['dark', 'light', 'system']).toContain(entry.theme);
      expect(entry.locale).toMatch(localePattern);
      expect(['ltr', 'rtl']).toContain(entry.direction);
      expect(entry.authState.trim()).not.toBe('');
      expect(entry.stateSetup.trim().length).toBeGreaterThan(10);
      expect(['captured', 'planned', 'sample']).toContain(entry.captureStatus);
      expect(['manual', 'playwright']).toContain(entry.captureMethod);
      expect(entry.notes.trim().length).toBeGreaterThan(10);

      expect(ids.has(entry.id), `duplicate snapshot id ${entry.id}`).toBe(
        false
      );
      ids.add(entry.id);

      expect(
        outputPaths.has(entry.outputPath),
        `duplicate snapshot path ${entry.outputPath}`
      ).toBe(false);
      outputPaths.add(entry.outputPath);

      expectInsideSnapshotRoot(entry);
      presentSections.add(`${entry.area}:${entry.section}`);
    }

    const manifestOutputPaths = new Set(outputPaths);
    const storedPngs = await listPngFiles(snapshotRoot);
    for (const storedPng of storedPngs) {
      const relativeStoredPng = toRepoRelativePath(storedPng);
      expect(
        manifestOutputPaths.has(relativeStoredPng),
        `${relativeStoredPng} must be listed in manifest.json`
      ).toBe(true);
    }

    for (const requiredSection of requiredSections) {
      expect(
        presentSections.has(requiredSection),
        `missing snapshot inventory section ${requiredSection}`
      ).toBe(true);
    }

    expect(
      manifest.entries.some((entry) => entry.captureStatus === 'sample'),
      'NIM-226 must include at least one sample capture proof'
    ).toBe(true);
  });
});

test.describe('presentation snapshot sample capture', () => {
  test('captures sample entries to their manifest paths', async ({
    browser,
  }) => {
    const manifest = await readManifest();
    const sampleEntries = manifest.entries.filter(
      (entry) => entry.captureStatus === 'sample'
    );

    expect(sampleEntries.length).toBeGreaterThan(0);

    for (const entry of sampleEntries) {
      expectInsideSnapshotRoot(entry);
      const outputPath = resolveOutputPath(entry.outputPath);

      const { context, page } = await newSnapshotPage(browser, entry);
      try {
        await preparePageForSnapshot(page, entry);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await page.screenshot({
          path: outputPath,
        });
      } finally {
        await context.close();
      }

      const stats = await fs.stat(outputPath);
      expect(
        stats.size,
        `${entry.outputPath} should be a real non-empty screenshot`
      ).toBeGreaterThan(20_000);
    }
  });
});
