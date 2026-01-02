import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

function runVitest(args) {
  return spawnSync('vitest', args, {
    stdio: 'inherit',
  });
}

function parseFailedFiles(report) {
  const results =
    (Array.isArray(report.testResults) && report.testResults) ||
    (Array.isArray(report.results) && report.results) ||
    [];

  const failed = new Set();

  for (const result of results) {
    const status = result.status || result.state;
    const hasFailedAssertions =
      Array.isArray(result.assertionResults) &&
      result.assertionResults.some(
        (assertion) => assertion.status === 'failed'
      );
    const hasErrors =
      (Array.isArray(result.errors) && result.errors.length > 0) ||
      Boolean(result.failureMessage) ||
      Boolean(result.error);
    const hasFailureCount =
      typeof result.numFailingTests === 'number' && result.numFailingTests > 0;

    if (
      status === 'failed' ||
      hasFailedAssertions ||
      hasErrors ||
      hasFailureCount
    ) {
      const file =
        result.name || result.file || result.testFilePath || result.filePath;
      if (file) {
        failed.add(file);
      }
    }
  }

  return Array.from(failed);
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const testsDir = resolve(scriptDir, '..');

process.chdir(testsDir);

const reportDir = resolve(testsDir, 'test-results');
const reportPath = resolve(reportDir, 'integration-fast.json');

mkdirSync(reportDir, { recursive: true });

const fastRun = runVitest([
  'run',
  '--config',
  'vitest.config.integration.fast.ts',
  '--reporter=json',
  `--outputFile=${reportPath}`,
]);

let failedFiles = [];

if (existsSync(reportPath)) {
  try {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    failedFiles = parseFailedFiles(report);
  } catch (error) {
    console.error('Failed to parse Vitest report:', error);
  } finally {
    rmSync(reportPath, { force: true });
  }
}

let rerunFailed = false;
for (const file of failedFiles) {
  rerunFailed = true;
  console.log(`\nRe-running failed integration file: ${file}\n`);
  const rerun = runVitest([
    'run',
    '--config',
    'vitest.config.integration.ts',
    file,
  ]);
  if (rerun.status !== 0) {
    process.exitCode = 1;
  }
}

if (!rerunFailed && fastRun.status !== 0) {
  process.exitCode = fastRun.status ?? 1;
}
