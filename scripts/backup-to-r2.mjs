#!/usr/bin/env node

/**
 * Kitia Backup Script
 *
 * This script backs up critical configuration files to Cloudflare R2.
 * Designed to run on the VPS server as a cron job.
 *
 * Usage:
 *   Daily backup:   node scripts/backup-to-r2.mjs daily
 *   Weekly backup:  node scripts/backup-to-r2.mjs weekly
 *   Monthly DB:     node scripts/backup-to-r2.mjs monthly
 *   List backups:   node scripts/backup-to-r2.mjs list [daily|weekly|monthly]
 *
 * Required Environment Variables:
 *   R2_BACKUP_ACCESS_KEY_ID     - R2 access key for backups bucket
 *   R2_BACKUP_SECRET_ACCESS_KEY - R2 secret access key for backups bucket
 *   R2_ACCOUNT_ID               - Cloudflare account ID
 *   GPG_PASSPHRASE              - Passphrase for symmetric encryption (optional but recommended)
 *   DATABASE_URL                - Database connection string (for monthly backups)
 *   CLOUDFLARE_API_TOKEN        - Cloudflare API token for DNS export (weekly backups)
 *   CLOUDFLARE_ZONE_ID          - Zone ID for kitia.ir (weekly backups)
 */

import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import https from 'https';
import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import zlib from 'zlib';

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  bucketName: 'kitia-backups',
  accountId: process.env.R2_ACCOUNT_ID || 'dd63dacc73e373d4f298797c0400a419',
  accessKeyId:
    process.env.R2_BACKUP_ACCESS_KEY_ID ||
    process.env.R2_ACCESS_KEY_ID ||
    'afa45d7d809fce2bbc99fdfc4a41375e',
  secretAccessKey:
    process.env.R2_BACKUP_SECRET_ACCESS_KEY ||
    process.env.R2_SECRET_ACCESS_KEY ||
    '9b8b7d4ceea1412a9c2183a9654c7db931510c4904ab355bedcedc1a37bce4de',
  retention: {
    daily: 14, // days
    weekly: 8, // weeks
    monthly: 6, // months
  },
};

// VPS paths for backup (only used when running on VPS)
const VPS_PATHS = {
  envProd: '/home/dexter/kitia/.env',
  envStaging: '/home/dexter/kitia-staging/.env',
  nginxSitesAvailable: '/etc/nginx/sites-available',
  nginxConf: '/etc/nginx/nginx.conf',
  htpasswd: '/etc/nginx',
  pm2Ecosystem: '/home/dexter/kitia/config/ecosystem.config.js',
  pm2Dump: '/home/dexter/.pm2/dump.pm2',
  sshKeys: '/home/dexter/.ssh/authorized_keys',
  grafanaConfig: '/etc/grafana/grafana.ini',
  lokiConfig: '/etc/loki/config.yml',
  promtailConfig: '/etc/promtail/config.yml',
};

// Local development paths (for testing)
const LOCAL_PATHS = {
  envProd: path.join(process.cwd(), '.env'),
  pm2Ecosystem: path.join(process.cwd(), 'config', 'ecosystem.config.js'),
};

// Initialize S3 client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: CONFIG.accessKeyId,
    secretAccessKey: CONFIG.secretAccessKey,
  },
  requestHandler: new NodeHttpHandler({
    httpsAgent: new https.Agent({
      keepAlive: true,
      maxSockets: 50,
      family: 4,
    }),
    requestTimeout: 60000,
    connectionTimeout: 15000,
  }),
});

/**
 * Encrypt data using AES-256-GCM with passphrase
 */
function encryptData(data, passphrase) {
  if (!passphrase) {
    // If no passphrase, return gzipped data without encryption
    return zlib.gzipSync(data);
  }

  // Derive key from passphrase using scrypt
  const salt = crypto.randomBytes(32);
  const key = crypto.scryptSync(passphrase, salt, 32);
  const iv = crypto.randomBytes(16);

  // Compress first, then encrypt
  const compressed = zlib.gzipSync(data);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: salt (32) + iv (16) + authTag (16) + encrypted data
  return Buffer.concat([salt, iv, authTag, encrypted]);
}

/**
 * Read file safely, return null if not exists
 */
async function readFileSafe(filePath) {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Execute command safely, return null on error
 */
async function execSafe(command) {
  try {
    const { stdout } = await execAsync(command, { timeout: 30000 });
    return stdout;
  } catch {
    return null;
  }
}

/**
 * Check if running on VPS
 */
function isVPS() {
  return os.hostname() !== os.hostname().includes('dexter');
}

/**
 * Get date string for backup naming
 */
function getDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Get week string for weekly backup naming
 */
function getWeekString() {
  const now = new Date();
  const year = now.getFullYear();
  const weekNum = getWeekNumber(now);
  return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}

/**
 * Get ISO week number
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/**
 * Get month string for monthly backup naming
 */
function getMonthString() {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
}

/**
 * Upload buffer to R2
 */
async function uploadToR2(key, data, metadata = {}) {
  const command = new PutObjectCommand({
    Bucket: CONFIG.bucketName,
    Key: key,
    Body: data,
    ContentType: 'application/octet-stream',
    Metadata: {
      'backup-date': new Date().toISOString(),
      ...metadata,
    },
  });

  await s3Client.send(command);
  return key;
}

/**
 * List objects in R2 bucket with prefix
 */
async function listBackups(prefix) {
  const command = new ListObjectsV2Command({
    Bucket: CONFIG.bucketName,
    Prefix: prefix,
  });

  const response = await s3Client.send(command);
  return response.Contents || [];
}

/**
 * Delete object from R2
 */
async function deleteFromR2(key) {
  const command = new DeleteObjectCommand({
    Bucket: CONFIG.bucketName,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Cleanup old backups based on retention policy
 */
async function cleanupOldBackups(prefix, retentionCount) {
  const backups = await listBackups(prefix);

  if (backups.length <= retentionCount) {
    console.log(`  ├─ Cleanup: ${backups.length} backups (within retention limit of ${retentionCount})`);
    return;
  }

  // Sort by date (oldest first)
  const sorted = backups.sort((a, b) => new Date(a.LastModified) - new Date(b.LastModified));

  const toDelete = sorted.slice(0, sorted.length - retentionCount);

  for (const backup of toDelete) {
    console.log(`  ├─ Deleting old backup: ${backup.Key}`);
    await deleteFromR2(backup.Key);
  }

  console.log(`  ├─ Cleaned up ${toDelete.length} old backups`);
}

/**
 * Collect files for daily backup
 */
async function collectDailyBackupData() {
  const backupData = {
    timestamp: new Date().toISOString(),
    type: 'daily',
    files: {},
    metadata: {
      hostname: os.hostname(),
      platform: os.platform(),
      nodeVersion: process.version,
    },
  };

  console.log('  ├─ Collecting environment files...');

  // Try VPS paths first, fall back to local
  const envProd = await readFileSafe(VPS_PATHS.envProd);
  if (envProd) {
    backupData.files['kitia.env'] = envProd;
  } else {
    // Try local .env
    const localEnv = await readFileSafe(LOCAL_PATHS.envProd);
    if (localEnv) {
      backupData.files['kitia.env'] = localEnv;
    }
  }

  const envStaging = await readFileSafe(VPS_PATHS.envStaging);
  if (envStaging) {
    backupData.files['kitia-staging.env'] = envStaging;
  }

  console.log('  ├─ Collecting nginx configurations...');

  // Nginx configs
  const nginxFiles = ['kitia.ir', 'staging.kitia.ir', 'logs.kitia.ir'];
  for (const file of nginxFiles) {
    const content = await readFileSafe(path.join(VPS_PATHS.nginxSitesAvailable, file));
    if (content) {
      backupData.files[`nginx/${file}`] = content;
    }
  }

  const nginxConf = await readFileSafe(VPS_PATHS.nginxConf);
  if (nginxConf) {
    backupData.files['nginx/nginx.conf'] = nginxConf;
  }

  console.log('  ├─ Collecting htpasswd files...');

  // htpasswd files
  try {
    const htpasswdOutput = await execSafe(`ls ${VPS_PATHS.htpasswd}/.htpasswd-* 2>/dev/null`);
    if (htpasswdOutput) {
      const files = htpasswdOutput.trim().split('\n').filter(Boolean);
      for (const file of files) {
        const content = await readFileSafe(file);
        if (content) {
          backupData.files[`htpasswd/${path.basename(file)}`] = content;
        }
      }
    }
  } catch {
    // htpasswd files not found
  }

  console.log('  ├─ Collecting PM2 configuration...');

  // PM2 config
  const pm2Ecosystem =
    (await readFileSafe(VPS_PATHS.pm2Ecosystem)) ||
    (await readFileSafe(LOCAL_PATHS.pm2Ecosystem));
  if (pm2Ecosystem) {
    backupData.files['pm2/ecosystem.config.js'] = pm2Ecosystem;
  }

  const pm2Dump = await readFileSafe(VPS_PATHS.pm2Dump);
  if (pm2Dump) {
    backupData.files['pm2/dump.pm2'] = pm2Dump;
  }

  console.log('  ├─ Collecting SSH authorized keys...');

  // SSH keys
  const sshKeys = await readFileSafe(VPS_PATHS.sshKeys);
  if (sshKeys) {
    backupData.files['ssh/authorized_keys'] = sshKeys;
  }

  return backupData;
}

/**
 * Collect files for weekly backup
 */
async function collectWeeklyBackupData() {
  const backupData = {
    timestamp: new Date().toISOString(),
    type: 'weekly',
    files: {},
    metadata: {
      hostname: os.hostname(),
      platform: os.platform(),
      nodeVersion: process.version,
    },
  };

  console.log('  ├─ Collecting monitoring configurations...');

  // Grafana config
  const grafanaConfig = await readFileSafe(VPS_PATHS.grafanaConfig);
  if (grafanaConfig) {
    backupData.files['grafana/grafana.ini'] = grafanaConfig;
  }

  // Loki config
  const lokiConfig = await readFileSafe(VPS_PATHS.lokiConfig);
  if (lokiConfig) {
    backupData.files['loki/config.yml'] = lokiConfig;
  }

  // Promtail config
  const promtailConfig = await readFileSafe(VPS_PATHS.promtailConfig);
  if (promtailConfig) {
    backupData.files['promtail/config.yml'] = promtailConfig;
  }

  console.log('  ├─ Exporting Cloudflare DNS zone...');

  // Cloudflare DNS export
  const cfToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
  const cfZoneId = process.env.CLOUDFLARE_ZONE_ID || '6ebecdc02622f961f532aa985cf6b851';

  if (cfToken) {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records/export`,
        {
          headers: {
            Authorization: `Bearer ${cfToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (response.ok) {
        backupData.files['cloudflare/dns-zone.txt'] = await response.text();
      }
    } catch (error) {
      console.log(`  │  └─ Warning: Could not export DNS zone: ${error.message}`);
    }
  } else {
    console.log('  │  └─ Skipping DNS export (no CLOUDFLARE_API_TOKEN)');
  }

  console.log('  ├─ Collecting system state...');

  // System state
  const ufwRules = await execSafe('sudo ufw status verbose 2>/dev/null || echo "UFW not available"');
  if (ufwRules) {
    backupData.files['system/ufw-rules.txt'] = ufwRules;
  }

  const installedPackages = await execSafe('dpkg --get-selections 2>/dev/null || echo "dpkg not available"');
  if (installedPackages) {
    backupData.files['system/installed-packages.txt'] = installedPackages;
  }

  const enabledServices = await execSafe('systemctl list-unit-files --state=enabled 2>/dev/null || echo "systemctl not available"');
  if (enabledServices) {
    backupData.files['system/enabled-services.txt'] = enabledServices;
  }

  const crontab = await execSafe('crontab -l 2>/dev/null || echo "No crontab"');
  if (crontab) {
    backupData.files['system/crontab.txt'] = crontab;
  }

  const nodeVersion = await execSafe('node --version && npm --version');
  if (nodeVersion) {
    backupData.files['system/node-version.txt'] = nodeVersion;
  }

  return backupData;
}

/**
 * Collect database backup data
 */
async function collectMonthlyDbBackupData() {
  const backupData = {
    timestamp: new Date().toISOString(),
    type: 'monthly-db',
    files: {},
    metadata: {
      hostname: os.hostname(),
    },
  };

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable not set');
  }

  console.log('  ├─ Exporting database...');

  // Export database using pg_dump
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kitia-db-backup-'));
  const dumpFile = path.join(tmpDir, 'database.sql');

  try {
    // Use pg_dump to export database
    await execAsync(`pg_dump "${databaseUrl}" --no-owner --no-acl > "${dumpFile}"`, {
      timeout: 300000, // 5 minutes
    });

    const dumpContent = await fs.readFile(dumpFile, 'utf-8');
    backupData.files['database.sql'] = dumpContent;

    console.log('  ├─ Exporting schema only...');

    // Also export schema only
    const schemaFile = path.join(tmpDir, 'schema.sql');
    await execAsync(`pg_dump "${databaseUrl}" --schema-only --no-owner --no-acl > "${schemaFile}"`, {
      timeout: 60000,
    });

    const schemaContent = await fs.readFile(schemaFile, 'utf-8');
    backupData.files['schema.sql'] = schemaContent;
  } finally {
    // Cleanup temp directory
    await fs.rm(tmpDir, { recursive: true, force: true });
  }

  return backupData;
}

/**
 * Run daily backup
 */
async function runDailyBackup() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  KITIA DAILY BACKUP');
  console.log('═══════════════════════════════════════════════════════\n');

  const dateStr = getDateString();
  const backupKey = `daily/kitia-backup-${dateStr}.json.gz${process.env.GPG_PASSPHRASE ? '.enc' : ''}`;

  console.log(`📅 Date: ${dateStr}`);
  console.log(`📁 Target: ${CONFIG.bucketName}/${backupKey}\n`);

  try {
    // Collect backup data
    const backupData = await collectDailyBackupData();

    const fileCount = Object.keys(backupData.files).length;
    console.log(`  ├─ Collected ${fileCount} files\n`);

    if (fileCount === 0) {
      console.log('⚠️  No files collected for backup. Aborting.');
      return;
    }

    // Serialize and encrypt
    console.log('  ├─ Compressing and encrypting...');
    const jsonData = JSON.stringify(backupData, null, 2);
    const encrypted = encryptData(Buffer.from(jsonData), process.env.GPG_PASSPHRASE);

    // Upload to R2
    console.log('  ├─ Uploading to R2...');
    await uploadToR2(backupKey, encrypted, {
      'file-count': fileCount.toString(),
      encrypted: process.env.GPG_PASSPHRASE ? 'true' : 'false',
    });

    console.log(`  ├─ Upload complete (${(encrypted.length / 1024).toFixed(2)} KB)\n`);

    // Cleanup old backups
    console.log('  ├─ Running cleanup...');
    await cleanupOldBackups('daily/', CONFIG.retention.daily);

    console.log('\n✅ Daily backup completed successfully!');
    console.log(`📦 ${backupKey}`);
  } catch (error) {
    console.error('\n❌ Daily backup failed:', error.message);
    throw error;
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
}

/**
 * Run weekly backup
 */
async function runWeeklyBackup() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  KITIA WEEKLY BACKUP');
  console.log('═══════════════════════════════════════════════════════\n');

  const weekStr = getWeekString();
  const backupKey = `weekly/kitia-weekly-${weekStr}.json.gz${process.env.GPG_PASSPHRASE ? '.enc' : ''}`;

  console.log(`📅 Week: ${weekStr}`);
  console.log(`📁 Target: ${CONFIG.bucketName}/${backupKey}\n`);

  try {
    // First run daily backup data collection
    console.log('  ├─ Collecting daily backup data...');
    const dailyData = await collectDailyBackupData();

    // Then collect weekly-specific data
    console.log('  ├─ Collecting weekly backup data...');
    const weeklyData = await collectWeeklyBackupData();

    // Merge data
    const backupData = {
      ...dailyData,
      ...weeklyData,
      type: 'weekly',
      files: {
        ...dailyData.files,
        ...weeklyData.files,
      },
    };

    const fileCount = Object.keys(backupData.files).length;
    console.log(`  ├─ Collected ${fileCount} files\n`);

    // Serialize and encrypt
    console.log('  ├─ Compressing and encrypting...');
    const jsonData = JSON.stringify(backupData, null, 2);
    const encrypted = encryptData(Buffer.from(jsonData), process.env.GPG_PASSPHRASE);

    // Upload to R2
    console.log('  ├─ Uploading to R2...');
    await uploadToR2(backupKey, encrypted, {
      'file-count': fileCount.toString(),
      encrypted: process.env.GPG_PASSPHRASE ? 'true' : 'false',
    });

    console.log(`  ├─ Upload complete (${(encrypted.length / 1024).toFixed(2)} KB)\n`);

    // Cleanup old backups
    console.log('  ├─ Running cleanup...');
    await cleanupOldBackups('weekly/', CONFIG.retention.weekly);

    console.log('\n✅ Weekly backup completed successfully!');
    console.log(`📦 ${backupKey}`);
  } catch (error) {
    console.error('\n❌ Weekly backup failed:', error.message);
    throw error;
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
}

/**
 * Run monthly database backup
 */
async function runMonthlyBackup() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  KITIA MONTHLY DATABASE BACKUP');
  console.log('═══════════════════════════════════════════════════════\n');

  const monthStr = getMonthString();
  const backupKey = `monthly/db/kitia-db-${monthStr}.json.gz${process.env.GPG_PASSPHRASE ? '.enc' : ''}`;

  console.log(`📅 Month: ${monthStr}`);
  console.log(`📁 Target: ${CONFIG.bucketName}/${backupKey}\n`);

  try {
    // Collect database backup
    const backupData = await collectMonthlyDbBackupData();

    const fileCount = Object.keys(backupData.files).length;
    console.log(`  ├─ Collected ${fileCount} files\n`);

    // Serialize and encrypt
    console.log('  ├─ Compressing and encrypting...');
    const jsonData = JSON.stringify(backupData, null, 2);
    const encrypted = encryptData(Buffer.from(jsonData), process.env.GPG_PASSPHRASE);

    // Upload to R2
    console.log('  ├─ Uploading to R2...');
    await uploadToR2(backupKey, encrypted, {
      'file-count': fileCount.toString(),
      encrypted: process.env.GPG_PASSPHRASE ? 'true' : 'false',
    });

    console.log(`  ├─ Upload complete (${(encrypted.length / 1024).toFixed(2)} KB)\n`);

    // Cleanup old backups
    console.log('  ├─ Running cleanup...');
    await cleanupOldBackups('monthly/db/', CONFIG.retention.monthly);

    console.log('\n✅ Monthly database backup completed successfully!');
    console.log(`📦 ${backupKey}`);
  } catch (error) {
    console.error('\n❌ Monthly database backup failed:', error.message);
    throw error;
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
}

/**
 * List existing backups
 */
async function listExistingBackups(type = 'all') {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  KITIA BACKUPS LIST');
  console.log('═══════════════════════════════════════════════════════\n');

  const prefixes = type === 'all' ? ['daily/', 'weekly/', 'monthly/db/'] : [`${type}/`];

  for (const prefix of prefixes) {
    console.log(`📁 ${prefix}`);
    const backups = await listBackups(prefix);

    if (backups.length === 0) {
      console.log('   (empty)\n');
      continue;
    }

    for (const backup of backups.sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))) {
      const sizeKB = ((backup.Size || 0) / 1024).toFixed(2);
      const date = backup.LastModified ? backup.LastModified.toISOString() : 'N/A';
      console.log(`   ${backup.Key}`);
      console.log(`   Size: ${sizeKB} KB | Modified: ${date}\n`);
    }
  }

  console.log('═══════════════════════════════════════════════════════\n');
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  try {
    switch (command) {
      case 'daily':
        await runDailyBackup();
        break;

      case 'weekly':
        await runWeeklyBackup();
        break;

      case 'monthly':
        await runMonthlyBackup();
        break;

      case 'list':
        await listExistingBackups(args[1]);
        break;

      case 'help':
      default:
        console.log('Kitia Backup Script\n');
        console.log('Usage:');
        console.log('  node scripts/backup-to-r2.mjs daily    - Run daily backup');
        console.log('  node scripts/backup-to-r2.mjs weekly   - Run weekly backup');
        console.log('  node scripts/backup-to-r2.mjs monthly  - Run monthly database backup');
        console.log('  node scripts/backup-to-r2.mjs list     - List all backups');
        console.log('  node scripts/backup-to-r2.mjs list <type> - List backups by type (daily|weekly|monthly)\n');
        console.log('Environment Variables:');
        console.log('  GPG_PASSPHRASE  - Passphrase for encryption (recommended)');
        console.log('  DATABASE_URL    - Required for monthly database backup');
        console.log('  CLOUDFLARE_API_TOKEN - Required for DNS export in weekly backup');
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
