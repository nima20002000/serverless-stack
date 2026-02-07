/**
 * Cache Busting Integration Tests
 *
 * These tests verify the cache busting mechanism works correctly:
 * 1. Build version generation creates proper version info
 * 2. Version API returns correct data
 * 3. Service worker template injection works
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = path.resolve(__dirname, '../..');

describe('Cache Busting', () => {
  describe('Build Version Generation', () => {
    const versionFilePath = path.join(
      PROJECT_ROOT,
      'public',
      'build-version.json'
    );
    const swFilePath = path.join(PROJECT_ROOT, 'public', 'sw.js');

    // Clean up before tests
    beforeAll(() => {
      // Remove existing generated files
      if (fs.existsSync(versionFilePath)) {
        fs.unlinkSync(versionFilePath);
      }
      if (fs.existsSync(swFilePath)) {
        fs.unlinkSync(swFilePath);
      }
    });

    // Clean up after tests
    afterAll(() => {
      // Clean up generated test files
      if (fs.existsSync(versionFilePath)) {
        fs.unlinkSync(versionFilePath);
      }
      if (fs.existsSync(swFilePath)) {
        fs.unlinkSync(swFilePath);
      }
    });

    it('should generate build-version.json with correct structure', () => {
      // Run the generation script
      execSync('node scripts/generate-build-version.js', {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
      });

      expect(fs.existsSync(versionFilePath)).toBe(true);

      const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));

      expect(versionData).toHaveProperty('buildId');
      expect(versionData).toHaveProperty('buildTime');
      expect(versionData).toHaveProperty('timestamp');
      expect(typeof versionData.buildId).toBe('string');
      expect(typeof versionData.timestamp).toBe('number');
    });

    it('should include git hash in buildId when available', () => {
      // Run the generation script
      execSync('node scripts/generate-build-version.js', {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
      });

      const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));

      // In a git repo, should have gitHash
      if (versionData.gitHash) {
        expect(versionData.buildId).toContain(versionData.gitHash);
        expect(versionData.gitHash).toMatch(/^[a-f0-9]{7,}$/);
      }
    });

    it('should generate unique buildIds on each run', async () => {
      // First run
      execSync('node scripts/generate-build-version.js', {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
      });
      const version1 = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second run
      execSync('node scripts/generate-build-version.js', {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
      });
      const version2 = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));

      expect(version1.buildId).not.toBe(version2.buildId);
      expect(version2.timestamp).toBeGreaterThan(version1.timestamp);
    });

    it('should generate service worker with injected version', () => {
      execSync('node scripts/generate-build-version.js', {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
      });

      expect(fs.existsSync(swFilePath)).toBe(true);

      const swContent = fs.readFileSync(swFilePath, 'utf8');
      const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));

      // Should have the version injected (not the placeholder)
      expect(swContent).not.toContain('__BUILD_VERSION__');
      expect(swContent).toContain(versionData.buildId);
    });

    it('should have matching versions in build-version.json and sw.js', () => {
      execSync('node scripts/generate-build-version.js', {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
      });

      const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
      const swContent = fs.readFileSync(swFilePath, 'utf8');

      // Extract version from sw.js
      const versionMatch = swContent.match(
        /const BUILD_VERSION = ['"]([^'"]+)['"]/
      );
      expect(versionMatch).not.toBeNull();
      expect(versionMatch![1]).toBe(versionData.buildId);
    });
  });

  describe('Service Worker Template', () => {
    const templatePath = path.join(PROJECT_ROOT, 'scripts', 'sw-template.js');

    it('should have the template file', () => {
      expect(fs.existsSync(templatePath)).toBe(true);
    });

    it('should have placeholder for version injection', () => {
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      expect(templateContent).toContain('__BUILD_VERSION__');
    });

    it('should define cache name with version prefix', () => {
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      expect(templateContent).toContain('kitia-cache-');
    });

    it('should have install event handler', () => {
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      expect(templateContent).toContain("self.addEventListener('install'");
    });

    it('should have activate event handler for cache cleanup', () => {
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      expect(templateContent).toContain("self.addEventListener('activate'");
      expect(templateContent).toContain('caches.delete');
    });

    it('should skip caching for API routes', () => {
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      // The regex /\/api\// matches /api/ paths
      expect(templateContent).toContain('api');
      expect(templateContent).toContain('NO_CACHE_PATTERNS');
    });

    it('should notify clients about updates', () => {
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      expect(templateContent).toContain('SW_UPDATED');
      expect(templateContent).toContain('postMessage');
    });
  });

  describe('Version API Endpoint', () => {
    const routePath = path.join(
      PROJECT_ROOT,
      'src',
      'app',
      'api',
      'version',
      'route.ts'
    );

    it('should have the version API route', () => {
      expect(fs.existsSync(routePath)).toBe(true);
    });

    it('should be configured as dynamic route', () => {
      const routeContent = fs.readFileSync(routePath, 'utf8');
      expect(routeContent).toContain("dynamic = 'force-dynamic'");
    });

    it('should have no-cache headers', () => {
      const routeContent = fs.readFileSync(routePath, 'utf8');
      expect(routeContent).toContain('Cache-Control');
      expect(routeContent).toContain('no-store');
      expect(routeContent).toContain('no-cache');
    });

    it('should handle missing version file gracefully', () => {
      const routeContent = fs.readFileSync(routePath, 'utf8');
      expect(routeContent).toContain('existsSync');
      expect(routeContent).toContain('dev-'); // fallback version prefix
    });
  });

  describe('Version Check Hook', () => {
    const hookPath = path.join(
      PROJECT_ROOT,
      'src',
      'hooks',
      'useVersionCheck.ts'
    );

    it('should have the version check hook', () => {
      expect(fs.existsSync(hookPath)).toBe(true);
    });

    it('should be a client component', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf8');
      expect(hookContent).toContain("'use client'");
    });

    it('should store version in localStorage', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf8');
      expect(hookContent).toContain('localStorage');
      expect(hookContent).toContain('kitia_build_version');
    });

    it('should register service worker', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf8');
      expect(hookContent).toContain('serviceWorker.register');
      expect(hookContent).toContain('/sw.js');
    });

    it('should fetch version from API', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf8');
      expect(hookContent).toContain('/api/version');
    });

    it('should clear caches on version mismatch', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf8');
      expect(hookContent).toContain('clearAllCaches');
      expect(hookContent).toContain('caches.keys');
      expect(hookContent).toContain('caches.delete');
    });

    it('should force navigation after update', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf8');
      expect(hookContent).toContain('window.location.replace');
    });

    it('should check on visibility change', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf8');
      expect(hookContent).toContain('visibilitychange');
    });
  });

  describe('Version Provider', () => {
    const providerPath = path.join(
      PROJECT_ROOT,
      'src',
      'components',
      'providers',
      'VersionProvider.tsx'
    );

    it('should have the version provider component', () => {
      expect(fs.existsSync(providerPath)).toBe(true);
    });

    it('should be a client component', () => {
      const providerContent = fs.readFileSync(providerPath, 'utf8');
      expect(providerContent).toContain("'use client'");
    });

    it('should use the version check hook', () => {
      const providerContent = fs.readFileSync(providerPath, 'utf8');
      expect(providerContent).toContain('useVersionCheck');
    });
  });

  describe('Layout Integration', () => {
    const layoutPath = path.join(PROJECT_ROOT, 'src', 'app', 'layout.tsx');

    it('should import VersionProvider', () => {
      const layoutContent = fs.readFileSync(layoutPath, 'utf8');
      expect(layoutContent).toContain('import { VersionProvider }');
    });

    it('should include VersionProvider in component tree', () => {
      const layoutContent = fs.readFileSync(layoutPath, 'utf8');
      expect(layoutContent).toContain('<VersionProvider>');
      expect(layoutContent).toContain('</VersionProvider>');
    });
  });
});
