#!/usr/bin/env node

/**
 * Kitia Restore Script
 *
 * This script restores backups from Cloudflare R2.
 *
 * Usage:
 *   List backups:  node scripts/restore-from-r2.mjs list [daily|weekly|monthly]
 *   Download:      node scripts/restore-from-r2.mjs download <backup-key> [output-dir]
 *   Verify:        node scripts/restore-from-r2.mjs verify <backup-key>
 *
 * Required Environment Variables:
 *   R2_BACKUP_ACCESS_KEY_ID     - R2 access key for backups bucket
 *   R2_BACKUP_SECRET_ACCESS_KEY - R2 secret access key for backups bucket
 *   R2_ACCOUNT_ID               - Cloudflare account ID
 *   GPG_PASSPHRASE              - Passphrase for decryption (if backup is encrypted)
 */

import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';

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
 * Decrypt data using AES-256-GCM with passphrase
 */
function decryptData(encryptedData, passphrase) {
  if (!passphrase) {
    // If no passphrase, assume it's just gzipped
    return zlib.gunzipSync(encryptedData);
  }

  // Format: salt (32) + iv (16) + authTag (16) + encrypted data
  const salt = encryptedData.subarray(0, 32);
  const iv = encryptedData.subarray(32, 48);
  const authTag = encryptedData.subarray(48, 64);
  const encrypted = encryptedData.subarray(64);

  // Derive key from passphrase using scrypt
  const key = crypto.scryptSync(passphrase, salt, 32);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  // Decompress
  return zlib.gunzipSync(decrypted);
}

/**
 * Stream to buffer helper
 */
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * List objects in R2 bucket with prefix
 */
async function listBackups(prefix = '') {
  const command = new ListObjectsV2Command({
    Bucket: CONFIG.bucketName,
    Prefix: prefix,
  });

  const response = await s3Client.send(command);
  return response.Contents || [];
}

/**
 * Download object from R2
 */
async function downloadFromR2(key) {
  const command = new GetObjectCommand({
    Bucket: CONFIG.bucketName,
    Key: key,
  });

  const response = await s3Client.send(command);
  return streamToBuffer(response.Body);
}

/**
 * List existing backups
 */
async function listExistingBackups(type = 'all') {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  KITIA BACKUPS LIST');
  console.log('═══════════════════════════════════════════════════════\n');

  const prefixes =
    type === 'all' ? ['daily/', 'weekly/', 'monthly/db/'] : [`${type === 'monthly' ? 'monthly/db/' : type + '/'}`];

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
      const encrypted = backup.Key.endsWith('.enc') ? ' 🔒' : '';
      console.log(`   ${backup.Key}${encrypted}`);
      console.log(`   Size: ${sizeKB} KB | Modified: ${date}\n`);
    }
  }

  console.log('═══════════════════════════════════════════════════════\n');
}

/**
 * Download and extract backup
 */
async function downloadBackup(key, outputDir = './restore') {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  KITIA BACKUP RESTORE');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`📦 Downloading: ${key}`);
  console.log(`📁 Output: ${outputDir}\n`);

  try {
    // Download from R2
    console.log('  ├─ Downloading from R2...');
    const encryptedData = await downloadFromR2(key);
    console.log(`  ├─ Downloaded ${(encryptedData.length / 1024).toFixed(2)} KB`);

    // Decrypt if needed
    const isEncrypted = key.endsWith('.enc');
    let jsonData;

    if (isEncrypted) {
      console.log('  ├─ Decrypting...');
      if (!process.env.GPG_PASSPHRASE) {
        throw new Error('GPG_PASSPHRASE environment variable required for encrypted backups');
      }
      const decrypted = decryptData(encryptedData, process.env.GPG_PASSPHRASE);
      jsonData = decrypted.toString('utf-8');
    } else {
      console.log('  ├─ Decompressing...');
      const decompressed = zlib.gunzipSync(encryptedData);
      jsonData = decompressed.toString('utf-8');
    }

    // Parse backup data
    console.log('  ├─ Parsing backup data...');
    const backupData = JSON.parse(jsonData);

    console.log(`  ├─ Backup type: ${backupData.type}`);
    console.log(`  ├─ Backup date: ${backupData.timestamp}`);
    console.log(`  ├─ Files: ${Object.keys(backupData.files).length}`);

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    // Extract files
    console.log('\n  ├─ Extracting files...');
    for (const [filePath, content] of Object.entries(backupData.files)) {
      const fullPath = path.join(outputDir, filePath);
      const dir = path.dirname(fullPath);

      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
      console.log(`  │  └─ ${filePath}`);
    }

    // Write metadata
    const metadataPath = path.join(outputDir, '_backup_metadata.json');
    await fs.writeFile(
      metadataPath,
      JSON.stringify(
        {
          timestamp: backupData.timestamp,
          type: backupData.type,
          metadata: backupData.metadata,
          restoredAt: new Date().toISOString(),
          sourceKey: key,
        },
        null,
        2
      )
    );

    console.log('\n✅ Restore completed successfully!');
    console.log(`📁 Files extracted to: ${path.resolve(outputDir)}`);
  } catch (error) {
    console.error('\n❌ Restore failed:', error.message);
    throw error;
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
}

/**
 * Verify backup integrity
 */
async function verifyBackup(key) {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  KITIA BACKUP VERIFICATION');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`📦 Verifying: ${key}\n`);

  try {
    // Download from R2
    console.log('  ├─ Downloading from R2...');
    const encryptedData = await downloadFromR2(key);
    console.log(`  ├─ Downloaded ${(encryptedData.length / 1024).toFixed(2)} KB`);

    // Decrypt if needed
    const isEncrypted = key.endsWith('.enc');
    let jsonData;

    if (isEncrypted) {
      console.log('  ├─ Decrypting...');
      if (!process.env.GPG_PASSPHRASE) {
        throw new Error('GPG_PASSPHRASE environment variable required for encrypted backups');
      }
      const decrypted = decryptData(encryptedData, process.env.GPG_PASSPHRASE);
      jsonData = decrypted.toString('utf-8');
    } else {
      console.log('  ├─ Decompressing...');
      const decompressed = zlib.gunzipSync(encryptedData);
      jsonData = decompressed.toString('utf-8');
    }

    // Parse and validate
    console.log('  ├─ Parsing backup data...');
    const backupData = JSON.parse(jsonData);

    console.log('\n📋 Backup Details:');
    console.log(`   Type: ${backupData.type}`);
    console.log(`   Timestamp: ${backupData.timestamp}`);
    console.log(`   Hostname: ${backupData.metadata?.hostname || 'N/A'}`);
    console.log(`   Platform: ${backupData.metadata?.platform || 'N/A'}`);
    console.log(`   Node Version: ${backupData.metadata?.nodeVersion || 'N/A'}`);

    console.log('\n📁 Files Included:');
    for (const [filePath, content] of Object.entries(backupData.files)) {
      const sizeKB = (Buffer.byteLength(content, 'utf-8') / 1024).toFixed(2);
      console.log(`   ${filePath} (${sizeKB} KB)`);
    }

    console.log('\n✅ Backup verification successful!');
    console.log('   All data is readable and properly formatted.');
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    throw error;
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  try {
    switch (command) {
      case 'list':
        await listExistingBackups(args[1]);
        break;

      case 'download':
        if (!args[1]) {
          console.error('Error: Backup key required');
          console.log('Usage: node scripts/restore-from-r2.mjs download <backup-key> [output-dir]');
          process.exit(1);
        }
        await downloadBackup(args[1], args[2] || './restore');
        break;

      case 'verify':
        if (!args[1]) {
          console.error('Error: Backup key required');
          console.log('Usage: node scripts/restore-from-r2.mjs verify <backup-key>');
          process.exit(1);
        }
        await verifyBackup(args[1]);
        break;

      case 'help':
      default:
        console.log('Kitia Restore Script\n');
        console.log('Usage:');
        console.log('  node scripts/restore-from-r2.mjs list [type]           - List backups (daily|weekly|monthly|all)');
        console.log('  node scripts/restore-from-r2.mjs download <key> [dir]  - Download and extract backup');
        console.log('  node scripts/restore-from-r2.mjs verify <key>          - Verify backup integrity\n');
        console.log('Environment Variables:');
        console.log('  GPG_PASSPHRASE  - Passphrase for decryption (required for encrypted backups)\n');
        console.log('Examples:');
        console.log('  node scripts/restore-from-r2.mjs list daily');
        console.log('  node scripts/restore-from-r2.mjs download daily/kitia-backup-2025-01-15.json.gz.enc ./restore');
        console.log('  node scripts/restore-from-r2.mjs verify weekly/kitia-weekly-2025-W03.json.gz.enc');
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
