#!/usr/bin/env node
/**
 * Generate Build Version
 *
 * Creates a build-version.json file with a unique build ID.
 * This ID is used for cache busting - when a new version is deployed,
 * the service worker clears old caches and users get fresh content.
 *
 * The build ID is generated from:
 * - Git commit hash (short) if available
 * - Timestamp as fallback
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getGitCommitHash() {
  try {
    const hash = execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
    }).trim();
    return hash;
  } catch {
    return null;
  }
}

function injectVersionIntoServiceWorker(buildId) {
  const templatePath = path.join(__dirname, 'sw-template.js');
  const outputPath = path.join(__dirname, '..', 'public', 'sw.js');

  if (!fs.existsSync(templatePath)) {
    console.log(
      '[cache-busting] Service worker template not found, skipping injection'
    );
    return;
  }

  let swContent = fs.readFileSync(templatePath, 'utf8');
  swContent = swContent.replace(/__BUILD_VERSION__/g, buildId);
  fs.writeFileSync(outputPath, swContent);

  console.log(
    `[cache-busting] Generated service worker with version: ${buildId}`
  );
}

function generateBuildVersion() {
  const gitHash = getGitCommitHash();
  const timestamp = Date.now();

  // Use git hash if available, otherwise timestamp
  const buildId = gitHash ? `${gitHash}-${timestamp}` : `build-${timestamp}`;

  const versionInfo = {
    buildId,
    gitHash: gitHash || null,
    buildTime: new Date().toISOString(),
    timestamp,
  };

  // Write to public folder so it's accessible at runtime
  const outputPath = path.join(__dirname, '..', 'public', 'build-version.json');
  fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));

  // Inject version into service worker
  injectVersionIntoServiceWorker(buildId);

  console.log(`[cache-busting] Generated build version: ${buildId}`);

  return versionInfo;
}

generateBuildVersion();
