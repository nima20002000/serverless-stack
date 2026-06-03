#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import readline from 'node:readline/promises';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';

const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');
const migrationPath = path.join(
  rootDir,
  'supabase/migrations/20260531190011_initial_public_schema.sql'
);
const seedPath = path.join(rootDir, 'supabase/seed.sql');
const vercelProjectPath = path.join(rootDir, '.vercel/project.json');

const args = new Set(process.argv.slice(2));
const options = {
  check: args.has('--check'),
  yes: args.has('--yes') || args.has('-y'),
  noPrompt: args.has('--no-prompt') || process.env.CI === 'true',
  skipVercel: args.has('--skip-vercel'),
  skipSupabase: args.has('--skip-supabase'),
  skipMigrations: args.has('--skip-migrations'),
  skipSeed: args.has('--skip-seed'),
  skipVerify: args.has('--skip-verify'),
};

if (args.has('--help') || args.has('-h')) {
  printHelp();
  process.exit(0);
}

const requiredEnv = [
  'DATABASE_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
];

const paymentEnv = [
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_WEBHOOK_ID',
  'PAYPAL_ENV',
];

const optionalIntegrationEnv = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'ADMIN_EMAIL',
  'RESEND_SMTP_HOST',
  'RESEND_SMTP_USER',
  'RESEND_SMTP_PASS',
  'EMAIL_SMTP_HOST',
  'EMAIL_SMTP_USER',
  'EMAIL_SMTP_PASS',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
  'NEXT_PUBLIC_IMAGE_REMOTE_HOSTNAME',
  'R2_BACKUP_BUCKET_NAME',
  'R2_BACKUP_ACCESS_KEY_ID',
  'R2_BACKUP_SECRET_ACCESS_KEY',
  'BACKUP_FILE_PATHS',
];

const requiredTables = [
  'users',
  'categories',
  'tags',
  'products',
  'product_variants',
  'product_media',
  '_ProductToTag',
  'promo_codes',
  'transactions',
  'transaction_items',
  'invoices',
  'promo_code_usages',
  'user_activity_logs',
  'wishlists',
  'site_settings',
];

const requiredColumns = {
  users: ['id', 'uid', 'email', 'role', 'createdAt', 'updatedAt'],
  categories: [
    'id',
    'name',
    'slug',
    'isActive',
    'parentId',
    'createdAt',
    'updatedAt',
  ],
  tags: ['id', 'name', 'slug', 'createdAt', 'updatedAt'],
  products: [
    'id',
    'name',
    'price',
    'stock',
    'isActive',
    'isFeatured',
    'discountPercent',
    'createdAt',
    'updatedAt',
  ],
  transactions: [
    'id',
    'userId',
    'amount',
    'status',
    'paymentMethod',
    'transactionCode',
    'createdAt',
    'updatedAt',
  ],
  transaction_items: [
    'id',
    'transactionId',
    'productId',
    'variantId',
    'quantity',
    'price',
  ],
  promo_codes: ['id', 'code', 'discountType', 'discountValue', 'isActive'],
  wishlists: ['id', 'user_id', 'product_id', 'created_at'],
  site_settings: ['id', 'key', 'value', 'updatedAt'],
};

const results = [];
let envChanged = false;

main().catch((error) => {
  fail('Setup crashed', error.message || String(error));
  printResults();
  process.exit(1);
});

async function main() {
  if (options.check) {
    info('Mode', 'check only; no files or database objects will be changed');
  } else {
    info(
      'Mode',
      'setup; missing local files may be created after confirmation'
    );
  }

  const envFile = await ensureEnvFile();
  const envValues = envFile.exists ? parseEnv(envFile.content) : {};

  await completeEnv(envValues);

  if (!options.skipVercel) {
    await checkVercel();
  } else {
    warn('Vercel', 'skipped by flag');
  }

  if (!options.skipSupabase) {
    await checkSupabase(envValues);
  } else {
    warn('Supabase', 'skipped by flag');
  }

  if (!options.skipVerify) {
    runVerify();
  } else {
    warn('App verification', 'skipped by flag');
  }

  printResults();

  const failures = results.filter((result) => result.level === 'fail');
  if (failures.length > 0) {
    process.exit(1);
  }
}

function printHelp() {
  console.log(`Serverless Stack terminal setup

Usage:
  npm run setup
  npm run setup:check
  node scripts/setup.mjs [flags]

Flags:
  --check             Validate only. Do not write .env, run vercel link, or apply SQL.
  --yes, -y           Accept safe defaults and skip confirmation prompts.
  --no-prompt         Disable prompts. Missing required values fail the run.
  --skip-vercel       Skip Vercel CLI login/link checks.
  --skip-supabase     Skip database and Supabase REST checks.
  --skip-migrations   Do not apply the initial schema migration.
  --skip-seed         Do not apply seed data.
  --skip-verify       Skip npm run verify.
  --help, -h          Show this message.
`);
}

async function ensureEnvFile() {
  if (fs.existsSync(envPath)) {
    ok('.env', 'found');
    return { exists: true, content: fs.readFileSync(envPath, 'utf8') };
  }

  if (options.check) {
    fail('.env', 'missing; run npm run setup to create it from .env.example');
    return { exists: false, content: '' };
  }

  if (!fs.existsSync(envExamplePath)) {
    fail('.env.example', 'missing; cannot create .env');
    return { exists: false, content: '' };
  }

  if (await confirm('Create .env from .env.example?', true)) {
    fs.copyFileSync(envExamplePath, envPath);
    envChanged = true;
    ok('.env', 'created from .env.example');
    return { exists: true, content: fs.readFileSync(envPath, 'utf8') };
  }

  fail('.env', 'missing');
  return { exists: false, content: '' };
}

async function completeEnv(envValues) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  if (isMissing(envValues.NEXTAUTH_SECRET)) {
    if (options.check) {
      fail('NEXTAUTH_SECRET', 'missing or still set to a placeholder');
    } else {
      envValues.NEXTAUTH_SECRET = randomBytes(32).toString('base64url');
      envChanged = true;
      ok('NEXTAUTH_SECRET', 'generated');
    }
  }

  const promptable = requiredEnv
    .filter((key) => key !== 'NEXTAUTH_SECRET')
    .filter((key) => isMissing(envValues[key]));

  for (const key of promptable) {
    if (!canPrompt()) {
      fail(key, 'missing or still set to a placeholder');
      continue;
    }

    const value = await promptValue(`Enter ${key}: `);
    if (value) {
      envValues[key] = value;
      envChanged = true;
      ok(key, 'set');
    } else {
      fail(key, 'missing');
    }
  }

  for (const key of requiredEnv) {
    if (!isMissing(envValues[key])) {
      ok(key, 'configured');
    }
  }

  const missingPayment = paymentEnv.filter((key) => isMissing(envValues[key]));
  if (missingPayment.length > 0) {
    warn(
      'Payment credentials',
      `missing or placeholder values: ${missingPayment.join(', ')}. Checkout routes need real sandbox or live provider keys.`
    );
  } else {
    ok('Payment credentials', 'Stripe and PayPal variables are configured');
  }

  cleanupInactivePlaceholders(envValues);

  if (envChanged) {
    writeEnv(envValues);
    ok('.env', 'updated');
  }
}

function cleanupInactivePlaceholders(envValues) {
  const placeholderKeys = [...paymentEnv, ...optionalIntegrationEnv].filter(
    (key) => key in envValues && isMissing(envValues[key])
  );

  if (placeholderKeys.length === 0) {
    return;
  }

  if (options.check) {
    warn(
      'Placeholder cleanup',
      `inactive placeholder values are still present: ${placeholderKeys.join(', ')}`
    );
    return;
  }

  for (const key of placeholderKeys) {
    envValues[key] = '';
  }
  envChanged = true;
  ok(
    'Placeholder cleanup',
    `cleared inactive placeholder values: ${placeholderKeys.join(', ')}`
  );
}

async function checkVercel() {
  if (!commandExists('vercel')) {
    warn(
      'Vercel CLI',
      'not installed; install with npm i -g vercel or use npx vercel'
    );
    return;
  }

  const whoami = run('vercel', ['whoami'], { silent: true });
  if (whoami.status === 0) {
    ok('Vercel login', `authenticated as ${maskLine(whoami.stdout.trim())}`);
  } else {
    warn('Vercel login', 'not authenticated; run vercel login');
  }

  if (fs.existsSync(vercelProjectPath)) {
    ok('Vercel project', 'linked in .vercel/project.json');
    return;
  }

  if (options.check) {
    warn('Vercel project', 'not linked; run vercel link');
    return;
  }

  if (whoami.status !== 0) {
    warn('Vercel project', 'not linked; authenticate with Vercel first');
    return;
  }

  if (await confirm('Link this checkout to a Vercel project now?', false)) {
    const linked = run('vercel', ['link'], { inherit: true });
    if (linked.status === 0 && fs.existsSync(vercelProjectPath)) {
      ok('Vercel project', 'linked');
    } else {
      warn('Vercel project', 'link did not complete');
    }
  } else {
    warn('Vercel project', 'not linked');
  }
}

async function checkSupabase(envValues) {
  const missing = requiredEnv.filter((key) => isMissing(envValues[key]));
  if (missing.length > 0) {
    fail(
      'Supabase checks',
      `cannot run until required env vars are set: ${missing.join(', ')}`
    );
    return;
  }

  const sql = postgres(envValues.DATABASE_URL, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 5,
    ssl: shouldUseSsl(envValues.DATABASE_URL) ? 'require' : false,
  });

  try {
    await sql`select 1`;
    ok('Database connection', 'connected with DATABASE_URL');

    await ensureSchema(sql);
    await verifyColumns(sql);
    await verifySeedData(sql);
    await verifySupabaseRest(envValues);
  } catch (error) {
    fail('Supabase checks', error.message || String(error));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function ensureSchema(sql) {
  let existing = await loadPublicTables(sql);
  let missing = requiredTables.filter((table) => !existing.has(table));

  if (missing.length === 0) {
    ok('Database tables', 'all required public tables exist');
    return;
  }

  if (options.check || options.skipMigrations) {
    fail('Database tables', `missing: ${missing.join(', ')}`);
    return;
  }

  const existingRequired = requiredTables.filter((table) =>
    existing.has(table)
  );
  if (existingRequired.length > 0) {
    fail(
      'Database migration',
      `partial schema detected. Existing: ${existingRequired.join(', ')}. Missing: ${missing.join(', ')}`
    );
    return;
  }

  if (!fs.existsSync(migrationPath)) {
    fail(
      'Database migration',
      `missing migration file: ${path.relative(rootDir, migrationPath)}`
    );
    return;
  }

  if (
    !(await confirm(
      'Apply the initial Supabase schema migration to this database?',
      true
    ))
  ) {
    fail('Database tables', `missing: ${missing.join(', ')}`);
    return;
  }

  await sql.unsafe(fs.readFileSync(migrationPath, 'utf8'));
  await reloadPostgrest(sql);
  existing = await loadPublicTables(sql);
  missing = requiredTables.filter((table) => !existing.has(table));

  if (missing.length === 0) {
    ok('Database migration', 'initial schema applied');
  } else {
    fail(
      'Database migration',
      `migration completed but tables are still missing: ${missing.join(', ')}`
    );
  }
}

async function verifyColumns(sql) {
  const rows = await sql`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ${sql(requiredTables)}
  `;

  const columnsByTable = new Map();
  for (const row of rows) {
    if (!columnsByTable.has(row.table_name)) {
      columnsByTable.set(row.table_name, new Set());
    }
    columnsByTable.get(row.table_name).add(row.column_name);
  }

  const missing = [];
  for (const [table, columns] of Object.entries(requiredColumns)) {
    const existing = columnsByTable.get(table) || new Set();
    for (const column of columns) {
      if (!existing.has(column)) {
        missing.push(`${table}.${column}`);
      }
    }
  }

  if (missing.length > 0) {
    fail('Database columns', `missing: ${missing.join(', ')}`);
    return;
  }

  ok('Database columns', 'critical columns exist');
}

async function verifySeedData(sql) {
  const productRows =
    await sql`select count(*)::int as count from public.products`;
  const categoryRows =
    await sql`select count(*)::int as count from public.categories`;
  const tagRows = await sql`select count(*)::int as count from public.tags`;
  const counts = {
    products: productRows[0]?.count || 0,
    categories: categoryRows[0]?.count || 0,
    tags: tagRows[0]?.count || 0,
  };

  if (counts.products > 0 && counts.categories > 0 && counts.tags > 0) {
    ok(
      'Seed data',
      `${counts.products} products, ${counts.categories} categories, ${counts.tags} tags`
    );
    return;
  }

  if (options.check || options.skipSeed) {
    warn('Seed data', 'catalog seed data is missing or incomplete');
    return;
  }

  if (!fs.existsSync(seedPath)) {
    warn('Seed data', `missing seed file: ${path.relative(rootDir, seedPath)}`);
    return;
  }

  if (!(await confirm('Apply demo seed data now?', true))) {
    warn('Seed data', 'catalog seed data is missing or incomplete');
    return;
  }

  await sql.unsafe(fs.readFileSync(seedPath, 'utf8'));
  await reloadPostgrest(sql);
  ok('Seed data', 'applied demo catalog seed');
}

async function verifySupabaseRest(envValues) {
  const client = createClient(
    envValues.NEXT_PUBLIC_SUPABASE_URL,
    envValues.SUPABASE_SECRET_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  const { error, count } = await client
    .from('products')
    .select('id', { count: 'exact', head: true });

  if (error) {
    fail('Supabase REST API', error.message);
    return;
  }

  ok(
    'Supabase REST API',
    `products table reachable through PostgREST (${count ?? 0} rows)`
  );
}

function runVerify() {
  const result = run('npm', ['run', 'verify'], { silent: true });
  if (result.status === 0) {
    ok('App verification', 'npm run verify passed');
    return;
  }

  fail(
    'App verification',
    cleanOutput(result.stderr || result.stdout || 'npm run verify failed')
  );
}

async function loadPublicTables(sql) {
  const rows = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
  `;
  return new Set(rows.map((row) => row.table_name));
}

async function reloadPostgrest(sql) {
  await sql.unsafe("notify pgrst, 'reload schema';");
}

function parseEnv(content) {
  const values = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) {
      continue;
    }
    values[match[1]] = unquoteEnvValue(match[2]);
  }
  return values;
}

function writeEnv(values) {
  const existing = fs.readFileSync(envPath, 'utf8');
  const seen = new Set();
  const lines = existing.split(/\r?\n/).map((line) => {
    const match = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*=\s*)(.*)$/);
    if (!match || !(match[2] in values)) {
      return line;
    }
    seen.add(match[2]);
    return `${match[1]}${match[2]}${match[3]}${quoteEnvValue(values[match[2]])}`;
  });

  const additions = Object.keys(values)
    .filter((key) => !seen.has(key))
    .map((key) => `${key}=${quoteEnvValue(values[key])}`);

  if (additions.length > 0) {
    lines.push('', '# Added by npm run setup', ...additions);
  }

  fs.writeFileSync(envPath, lines.join('\n').replace(/\n*$/, '\n'));
}

function unquoteEnvValue(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
  }
  return trimmed.replace(/\s+#.*$/, '');
}

function quoteEnvValue(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function isMissing(value) {
  if (!value || String(value).trim() === '') {
    return true;
  }
  const normalized = String(value).trim().toLowerCase();
  return (
    normalized.includes('replace-with') ||
    normalized.includes('replace_with') ||
    normalized.includes('your-project-ref') ||
    normalized.includes('<your-') ||
    normalized.includes('your_') ||
    normalized.includes('example.') ||
    normalized.includes('sk_test_replace') ||
    normalized.includes('pk_test_replace') ||
    normalized.includes('whsec_replace') ||
    normalized === 'changeme'
  );
}

function shouldUseSsl(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    const host = parsed.hostname;
    return host !== 'localhost' && host !== '127.0.0.1' && host !== '::1';
  } catch {
    return true;
  }
}

function commandExists(command) {
  return (
    run('bash', ['-lc', `command -v ${shellQuote(command)} >/dev/null 2>&1`], {
      silent: true,
    }).status === 0
  );
}

function run(command, commandArgs, { silent = false, inherit = false } = {}) {
  const env = {
    ...process.env,
    NODE_OPTIONS:
      `${process.env.NODE_OPTIONS || ''} --no-warnings=ExperimentalWarning`.trim(),
  };
  return spawnSync(command, commandArgs, {
    cwd: rootDir,
    env,
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : silent ? 'pipe' : 'inherit',
  });
}

async function confirm(question, defaultValue) {
  if (options.yes) {
    return defaultValue;
  }
  if (!canPrompt()) {
    return false;
  }

  const suffix = defaultValue ? 'Y/n' : 'y/N';
  const answer = (await promptValue(`${question} (${suffix}) `)).toLowerCase();
  if (!answer) {
    return defaultValue;
  }
  return answer === 'y' || answer === 'yes';
}

async function promptValue(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

function canPrompt() {
  return (
    !options.check &&
    !options.noPrompt &&
    process.stdin.isTTY &&
    process.stdout.isTTY
  );
}

function ok(name, message) {
  results.push({ level: 'ok', name, message });
}

function warn(name, message) {
  results.push({ level: 'warn', name, message });
}

function fail(name, message) {
  results.push({ level: 'fail', name, message });
}

function info(name, message) {
  results.push({ level: 'info', name, message });
}

function printResults() {
  console.log('\nSetup report');
  console.log('============');
  for (const result of results) {
    const marker = {
      info: '[info]',
      ok: '[ok]',
      warn: '[warn]',
      fail: '[fail]',
    }[result.level];
    console.log(`${marker} ${result.name}: ${result.message}`);
  }
}

function cleanOutput(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-8)
    .join(' | ');
}

function maskLine(value) {
  if (!value) {
    return 'current Vercel user';
  }
  if (value.includes('@')) {
    const [name, domain] = value.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return value;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}
