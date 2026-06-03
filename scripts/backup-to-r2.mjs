#!/usr/bin/env node

/**
 * Generic Cloudflare R2 backup helper.
 *
 * Required environment variables:
 *   R2_BACKUP_BUCKET_NAME       - R2 bucket that stores backups
 *   R2_ACCOUNT_ID               - Cloudflare account ID
 *   R2_BACKUP_ACCESS_KEY_ID     - R2 access key for the backup bucket
 *   R2_BACKUP_SECRET_ACCESS_KEY - R2 secret key for the backup bucket
 *
 * Optional environment variables:
 *   GPG_PASSPHRASE              - Encrypt backups with AES-256-GCM
 *   DATABASE_URL                - Required for monthly database backups
 *   BACKUP_FILE_PATHS           - Comma-separated paths or labels, e.g.
 *                                 app-env=.env,pm2=config/ecosystem.config.js
 *   BACKUP_INCLUDE_SYSTEM_STATE - Set to true to include basic system command output
 *   CLOUDFLARE_API_TOKEN        - Token for DNS export in weekly backups
 *   CLOUDFLARE_ZONE_ID          - Zone ID for DNS export in weekly backups
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

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

let configCache;
let s3ClientCache;

function getConfig() {
  if (!configCache) {
    configCache = {
      bucketName: requireEnv('R2_BACKUP_BUCKET_NAME'),
      accountId: requireEnv('R2_ACCOUNT_ID'),
      accessKeyId: requireEnv('R2_BACKUP_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_BACKUP_SECRET_ACCESS_KEY'),
      retention: {
        daily: Number(process.env.BACKUP_RETENTION_DAILY || 14),
        weekly: Number(process.env.BACKUP_RETENTION_WEEKLY || 8),
        monthly: Number(process.env.BACKUP_RETENTION_MONTHLY || 6),
      },
    };
  }

  return configCache;
}

function getS3Client() {
  if (!s3ClientCache) {
    const config = getConfig();
    s3ClientCache = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
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
  }

  return s3ClientCache;
}

function encryptData(data, passphrase) {
  if (!passphrase) {
    return zlib.gzipSync(data);
  }

  const salt = crypto.randomBytes(32);
  const key = crypto.scryptSync(passphrase, salt, 32);
  const iv = crypto.randomBytes(16);
  const compressed = zlib.gzipSync(data);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, authTag, encrypted]);
}

async function readFileSafe(filePath) {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

async function execSafe(command) {
  try {
    const { stdout } = await execAsync(command, { timeout: 30000 });
    return stdout;
  } catch {
    return null;
  }
}

function getDateString() {
  return new Date().toISOString().split('T')[0];
}

function getWeekString() {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);

  return `${date.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

function getMonthString() {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
}

function backupLabelFromPath(filePath) {
  const normalized = path
    .normalize(filePath)
    .replace(/^[./\\]+/, '')
    .replace(/:/g, '')
    .replace(/[\\/]+/g, '__')
    .trim();

  return normalized || path.basename(filePath) || 'file';
}

function parseBackupFilePaths() {
  return (process.env.BACKUP_FILE_PATHS || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf('=');
      if (separatorIndex === -1) {
        return {
          label: backupLabelFromPath(entry),
          filePath: entry,
        };
      }

      return {
        label: entry.slice(0, separatorIndex).trim(),
        filePath: entry.slice(separatorIndex + 1).trim(),
      };
    });
}

async function uploadToR2(key, data, metadata = {}) {
  const config = getConfig();
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: data,
    ContentType: 'application/octet-stream',
    Metadata: {
      'backup-date': new Date().toISOString(),
      ...metadata,
    },
  });

  await getS3Client().send(command);
  return key;
}

async function listBackups(prefix) {
  const config = getConfig();
  const command = new ListObjectsV2Command({
    Bucket: config.bucketName,
    Prefix: prefix,
  });

  const response = await getS3Client().send(command);
  return response.Contents || [];
}

async function deleteFromR2(key) {
  const config = getConfig();
  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  await getS3Client().send(command);
}

async function cleanupOldBackups(prefix, retentionCount) {
  const backups = await listBackups(prefix);

  if (backups.length <= retentionCount) {
    console.log(`Cleanup: ${backups.length} backups within retention limit of ${retentionCount}`);
    return;
  }

  const sorted = backups.sort((a, b) => new Date(a.LastModified) - new Date(b.LastModified));
  const toDelete = sorted.slice(0, sorted.length - retentionCount);

  for (const backup of toDelete) {
    console.log(`Deleting old backup: ${backup.Key}`);
    await deleteFromR2(backup.Key);
  }
}

async function collectConfiguredFiles() {
  const files = {};
  const configuredPaths = parseBackupFilePaths();

  for (const { label, filePath } of configuredPaths) {
    const content = await readFileSafe(filePath);
    if (content) {
      files[label] = content;
    } else {
      console.log(`Skipping missing file: ${filePath}`);
    }
  }

  return files;
}

async function collectSystemState() {
  if (process.env.BACKUP_INCLUDE_SYSTEM_STATE !== 'true') {
    return {};
  }

  const files = {};
  const commands = {
    'system/ufw-rules.txt': 'sudo ufw status verbose 2>/dev/null || true',
    'system/installed-packages.txt': 'dpkg --get-selections 2>/dev/null || true',
    'system/enabled-services.txt': 'systemctl list-unit-files --state=enabled 2>/dev/null || true',
    'system/crontab.txt': 'crontab -l 2>/dev/null || true',
    'system/node-version.txt': 'node --version && npm --version',
  };

  for (const [label, command] of Object.entries(commands)) {
    const output = await execSafe(command);
    if (output) {
      files[label] = output;
    }
  }

  return files;
}

async function collectDnsZone() {
  const cfToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
  const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!cfToken || !cfZoneId) {
    console.log('Skipping DNS export; CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID are required.');
    return {};
  }

  let response;
  try {
    response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records/export`,
      {
        headers: {
          Authorization: `Bearer ${cfToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.log(
      `Skipping DNS export; Cloudflare request failed: ${error instanceof Error ? error.message : 'unknown error'}.`
    );
    return {};
  }

  if (!response.ok) {
    console.log(`Skipping DNS export; Cloudflare returned ${response.status}.`);
    return {};
  }

  return {
    'cloudflare/dns-zone.txt': await response.text(),
  };
}

async function collectDailyBackupData() {
  return {
    timestamp: new Date().toISOString(),
    type: 'daily',
    files: await collectConfiguredFiles(),
    metadata: {
      hostname: os.hostname(),
      platform: os.platform(),
      nodeVersion: process.version,
    },
  };
}

async function collectWeeklyBackupData() {
  const configuredFiles = await collectConfiguredFiles();
  const systemState = await collectSystemState();
  const dnsZone = await collectDnsZone();

  return {
    timestamp: new Date().toISOString(),
    type: 'weekly',
    files: {
      ...configuredFiles,
      ...systemState,
      ...dnsZone,
    },
    metadata: {
      hostname: os.hostname(),
      platform: os.platform(),
      nodeVersion: process.version,
    },
  };
}

async function collectMonthlyDbBackupData() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable not set');
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'db-backup-'));
  const dumpFile = path.join(tmpDir, 'database.sql');
  const schemaFile = path.join(tmpDir, 'schema.sql');
  const pgDumpPath = await execSafe('test -f /usr/lib/postgresql/17/bin/pg_dump && echo "/usr/lib/postgresql/17/bin/pg_dump" || echo "pg_dump"');
  const pgDump = (pgDumpPath || 'pg_dump').trim();

  try {
    await execAsync(`${pgDump} "${databaseUrl}" --no-owner --no-acl > "${dumpFile}"`, {
      timeout: 300000,
    });
    await execAsync(`${pgDump} "${databaseUrl}" --schema-only --no-owner --no-acl > "${schemaFile}"`, {
      timeout: 300000,
    });

    return {
      timestamp: new Date().toISOString(),
      type: 'monthly-db',
      files: {
        'database.sql': await fs.readFile(dumpFile, 'utf-8'),
        'schema.sql': await fs.readFile(schemaFile, 'utf-8'),
      },
      metadata: {
        hostname: os.hostname(),
      },
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function saveBackup(prefix, key, backupData, retentionCount) {
  const config = getConfig();
  const fileCount = Object.keys(backupData.files || {}).length;
  console.log(`Collected ${fileCount} files`);

  if (fileCount === 0) {
    throw new Error(
      'No files collected for backup. Configure BACKUP_FILE_PATHS or the required command-specific environment.'
    );
  }

  const jsonData = JSON.stringify(backupData, null, 2);
  const encrypted = encryptData(Buffer.from(jsonData), process.env.GPG_PASSPHRASE);

  await uploadToR2(key, encrypted, {
    'file-count': fileCount.toString(),
    encrypted: process.env.GPG_PASSPHRASE ? 'true' : 'false',
  });

  console.log(`Upload complete: ${config.bucketName}/${key}`);
  await cleanupOldBackups(prefix, retentionCount);
}

async function runDailyBackup() {
  const config = getConfig();
  const dateStr = getDateString();
  const key = `daily/app-backup-${dateStr}.json.gz${process.env.GPG_PASSPHRASE ? '.enc' : ''}`;
  await saveBackup('daily/', key, await collectDailyBackupData(), config.retention.daily);
}

async function runWeeklyBackup() {
  const config = getConfig();
  const weekStr = getWeekString();
  const key = `weekly/app-weekly-${weekStr}.json.gz${process.env.GPG_PASSPHRASE ? '.enc' : ''}`;
  await saveBackup('weekly/', key, await collectWeeklyBackupData(), config.retention.weekly);
}

async function runMonthlyBackup() {
  const config = getConfig();
  const monthStr = getMonthString();
  const key = `monthly/db/app-db-${monthStr}.json.gz${process.env.GPG_PASSPHRASE ? '.enc' : ''}`;
  await saveBackup('monthly/db/', key, await collectMonthlyDbBackupData(), config.retention.monthly);
}

async function listExistingBackups(type = 'all') {
  const prefixes = type === 'all' ? ['daily/', 'weekly/', 'monthly/db/'] : [`${type === 'monthly' ? 'monthly/db/' : type + '/'}`];

  for (const prefix of prefixes) {
    console.log(`${prefix}`);
    const backups = await listBackups(prefix);

    if (backups.length === 0) {
      console.log('  (empty)\n');
      continue;
    }

    for (const backup of backups.sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))) {
      const sizeKB = ((backup.Size || 0) / 1024).toFixed(2);
      const date = backup.LastModified ? backup.LastModified.toISOString() : 'N/A';
      console.log(`  ${backup.Key}`);
      console.log(`  Size: ${sizeKB} KB | Modified: ${date}\n`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

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
      console.log('R2 Backup Script\n');
      console.log('Usage:');
      console.log('  node scripts/backup-to-r2.mjs daily');
      console.log('  node scripts/backup-to-r2.mjs weekly');
      console.log('  node scripts/backup-to-r2.mjs monthly');
      console.log('  node scripts/backup-to-r2.mjs list [daily|weekly|monthly|all]\n');
      console.log('Configure R2_BACKUP_BUCKET_NAME, R2_ACCOUNT_ID, R2_BACKUP_ACCESS_KEY_ID, and R2_BACKUP_SECRET_ACCESS_KEY.');
      break;
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
