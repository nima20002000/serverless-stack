/**
 * Migration Script: Local Filesystem → Cloudflare R2
 *
 * This script migrates existing product images/videos from local filesystem to R2.
 * It also updates database URLs to point to R2.
 *
 * Usage:
 *   npx ts-node scripts/migrate-to-r2.ts
 *
 * Options:
 *   --dry-run    Show what would be migrated without actually doing it
 *   --force      Skip confirmation prompts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { storage } from '../src/lib/storage';

const prisma = new PrismaClient();

interface MigrationStats {
  totalFiles: number;
  uploaded: number;
  failed: number;
  skipped: number;
  dbUpdates: number;
}

const stats: MigrationStats = {
  totalFiles: 0,
  uploaded: 0,
  failed: 0,
  skipped: 0,
  dbUpdates: 0,
};

const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');

async function getLocalFiles(): Promise<string[]> {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'products');
  const files: string[] = [];

  try {
    const folders = ['images', 'videos'];

    for (const folder of folders) {
      const folderPath = path.join(uploadsDir, folder);
      try {
        const fileNames = await fs.readdir(folderPath);
        for (const fileName of fileNames) {
          files.push(`${folder}/${fileName}`);
        }
      } catch (error) {
        console.log(`Folder not found: ${folder} (skipping)`);
      }
    }
  } catch (error) {
    console.error('Error reading uploads directory:', error);
  }

  return files;
}

async function uploadFileToR2(localPath: string): Promise<string | null> {
  try {
    const fullPath = path.join(process.cwd(), 'public', 'uploads', 'products', localPath);
    const fileBuffer = await fs.readFile(fullPath);

    // Determine content type
    const ext = path.extname(localPath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    if (isDryRun) {
      console.log(`[DRY RUN] Would upload: ${localPath} → products/${localPath}`);
      return storage.getPublicUrl(`products/${localPath}`);
    }

    const result = await storage.upload({
      file: fileBuffer,
      path: `products/${localPath}`,
      contentType,
      isPublic: true,
    });

    if (result.success && result.url) {
      console.log(`✓ Uploaded: ${localPath} → ${result.url}`);
      return result.url;
    } else {
      console.error(`✗ Failed: ${localPath} - ${result.error}`);
      return null;
    }
  } catch (error) {
    console.error(`✗ Error uploading ${localPath}:`, error);
    return null;
  }
}

async function updateDatabaseUrls(oldUrl: string, newUrl: string): Promise<number> {
  if (isDryRun) {
    console.log(`[DRY RUN] Would update DB: ${oldUrl} → ${newUrl}`);
    return 0;
  }

  try {
    const result = await prisma.productMedia.updateMany({
      where: { url: oldUrl },
      data: { url: newUrl },
    });

    if (result.count > 0) {
      console.log(`  → Updated ${result.count} database record(s)`);
    }

    return result.count;
  } catch (error) {
    console.error(`  → Database update failed:`, error);
    return 0;
  }
}

async function confirm(message: string): Promise<boolean> {
  if (isForce) return true;

  process.stdout.write(`${message} (y/N): `);

  return new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      const answer = data.toString().trim().toLowerCase();
      resolve(answer === 'y' || answer === 'yes');
    });
  });
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Kitia - Migration Script: Local Files → R2');
  console.log('═══════════════════════════════════════════════════════\n');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No actual changes will be made\n');
  }

  // Step 1: Find local files
  console.log('📂 Scanning local uploads directory...\n');
  const localFiles = await getLocalFiles();
  stats.totalFiles = localFiles.length;

  if (localFiles.length === 0) {
    console.log('✓ No local files found. Nothing to migrate.\n');
    process.exit(0);
  }

  console.log(`Found ${localFiles.length} file(s) to migrate:\n`);
  localFiles.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file}`);
  });
  console.log('');

  // Confirm before proceeding
  if (!isDryRun) {
    const proceed = await confirm('Proceed with migration?');
    if (!proceed) {
      console.log('\n❌ Migration cancelled.\n');
      process.exit(0);
    }
  }

  // Step 2: Upload files to R2
  console.log('\n📤 Uploading files to R2...\n');

  for (const localPath of localFiles) {
    const oldUrl = `/uploads/products/${localPath}`;
    const newUrl = await uploadFileToR2(localPath);

    if (newUrl) {
      stats.uploaded++;

      // Step 3: Update database URLs
      const updated = await updateDatabaseUrls(oldUrl, newUrl);
      stats.dbUpdates += updated;
    } else {
      stats.failed++;
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Migration Summary');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`  Total files:        ${stats.totalFiles}`);
  console.log(`  ✓ Uploaded:         ${stats.uploaded}`);
  console.log(`  ✗ Failed:           ${stats.failed}`);
  console.log(`  📊 DB records updated: ${stats.dbUpdates}`);
  console.log('');

  if (!isDryRun && stats.uploaded > 0) {
    console.log('✅ Migration completed successfully!\n');
    console.log('Next steps:');
    console.log('  1. Verify files are accessible in R2');
    console.log('  2. Test the application thoroughly');
    console.log('  3. Once confirmed, you can delete local uploads:');
    console.log('     rm -rf public/uploads/products/*\n');
  } else if (isDryRun) {
    console.log('💡 Run without --dry-run to perform actual migration\n');
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.stdin.destroy();
  });
