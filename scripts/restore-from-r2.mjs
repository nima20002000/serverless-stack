#!/usr/bin/env node

/**
 * Generic Cloudflare R2 restore helper.
 *
 * Required environment variables:
 *   R2_BACKUP_BUCKET_NAME       - R2 bucket that stores backups
 *   R2_ACCOUNT_ID               - Cloudflare account ID
 *   R2_BACKUP_ACCESS_KEY_ID     - R2 access key for the backup bucket
 *   R2_BACKUP_SECRET_ACCESS_KEY - R2 secret key for the backup bucket
 *   GPG_PASSPHRASE              - Passphrase for encrypted backups
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

function decryptData(encryptedData, passphrase) {
  if (!passphrase) {
    return zlib.gunzipSync(encryptedData);
  }

  const salt = encryptedData.subarray(0, 32);
  const iv = encryptedData.subarray(32, 48);
  const authTag = encryptedData.subarray(48, 64);
  const encrypted = encryptedData.subarray(64);
  const key = crypto.scryptSync(passphrase, salt, 32);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return zlib.gunzipSync(decrypted);
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function listBackups(prefix = '') {
  const config = getConfig();
  const command = new ListObjectsV2Command({
    Bucket: config.bucketName,
    Prefix: prefix,
  });

  const response = await getS3Client().send(command);
  return response.Contents || [];
}

async function downloadFromR2(key) {
  const config = getConfig();
  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  const response = await getS3Client().send(command);
  return streamToBuffer(response.Body);
}

async function listExistingBackups(type = 'all') {
  const prefixes =
    type === 'all' ? ['daily/', 'weekly/', 'monthly/db/'] : [`${type === 'monthly' ? 'monthly/db/' : type + '/'}`];

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
      const encrypted = backup.Key.endsWith('.enc') ? ' encrypted' : '';
      console.log(`  ${backup.Key}${encrypted}`);
      console.log(`  Size: ${sizeKB} KB | Modified: ${date}\n`);
    }
  }
}

async function parseBackup(key) {
  const rawData = await downloadFromR2(key);
  const isEncrypted = key.endsWith('.enc');

  if (isEncrypted && !process.env.GPG_PASSPHRASE) {
    throw new Error('GPG_PASSPHRASE environment variable required for encrypted backups');
  }

  const jsonData = decryptData(rawData, isEncrypted ? process.env.GPG_PASSPHRASE : undefined).toString('utf-8');
  return JSON.parse(jsonData);
}

async function downloadBackup(key, outputDir = './restore') {
  console.log(`Downloading ${key}`);
  console.log(`Output directory: ${outputDir}\n`);

  const backupData = await parseBackup(key);

  await fs.mkdir(outputDir, { recursive: true });

  for (const [filePath, content] of Object.entries(backupData.files || {})) {
    const fullPath = path.join(outputDir, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
    console.log(`Extracted ${filePath}`);
  }

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

  console.log('\nRestore completed successfully.');
}

async function verifyBackup(key) {
  const backupData = await parseBackup(key);
  const fileCount = Object.keys(backupData.files || {}).length;

  console.log('Backup verification successful.');
  console.log(`Type: ${backupData.type}`);
  console.log(`Timestamp: ${backupData.timestamp}`);
  console.log(`Files: ${fileCount}`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'list':
      await listExistingBackups(args[1]);
      break;
    case 'download':
      if (!args[1]) {
        throw new Error('Backup key required');
      }
      await downloadBackup(args[1], args[2] || './restore');
      break;
    case 'verify':
      if (!args[1]) {
        throw new Error('Backup key required');
      }
      await verifyBackup(args[1]);
      break;
    case 'help':
    default:
      console.log('R2 Restore Script\n');
      console.log('Usage:');
      console.log('  node scripts/restore-from-r2.mjs list [daily|weekly|monthly|all]');
      console.log('  node scripts/restore-from-r2.mjs download <backup-key> [output-dir]');
      console.log('  node scripts/restore-from-r2.mjs verify <backup-key>');
      break;
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
