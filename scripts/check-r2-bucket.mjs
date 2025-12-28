import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import https from 'https';

// R2 credentials
const accountId = 'dd63dacc73e373d4f298797c0400a419';
const accessKeyId = 'afa45d7d809fce2bbc99fdfc4a41375e';
const secretAccessKey = '9b8b7d4ceea1412a9c2183a9654c7db931510c4904ab355bedcedc1a37bce4de';
const bucketName = 'kitia-products';

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  requestHandler: new NodeHttpHandler({
    httpsAgent: new https.Agent({
      keepAlive: true,
      maxSockets: 50,
      family: 4,
    }),
    requestTimeout: 30000,
    connectionTimeout: 10000,
  }),
});

async function listFiles(prefix = '') {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  R2 BUCKET CONTENTS CHECK');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`Bucket: ${bucketName}`);
  console.log(`Prefix: ${prefix || '(all files)'}\n`);

  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      MaxKeys: 100,
    });

    const response = await client.send(command);

    if (!response.Contents || response.Contents.length === 0) {
      console.log('❌ No files found in bucket');
      console.log('\n💡 ROOT CAUSE IDENTIFIED:');
      console.log('   The R2 bucket is EMPTY or files are not at expected paths!');
      console.log('   This is why all images return 404.\n');
      console.log('📋 SOLUTION:');
      console.log('   1. Upload images to R2 bucket via admin panel');
      console.log('   2. Or run migration script to upload existing images');
      console.log('   3. Verify uploaded files appear at https://cdn.kitia.ir/{path}\n');
      return;
    }

    console.log(`✅ Found ${response.Contents.length} files:\n`);

    response.Contents.forEach((item, index) => {
      const sizeKB = ((item.Size || 0) / 1024).toFixed(2);
      const date = item.LastModified ? item.LastModified.toISOString() : 'N/A';
      console.log(`${index + 1}. ${item.Key}`);
      console.log(`   Size: ${sizeKB} KB | Modified: ${date}`);
      console.log(`   URL: https://cdn.kitia.ir/${item.Key}\n`);
    });

    console.log(`📊 Total: ${response.Contents.length} files`);

  } catch (error) {
    console.error('❌ ERROR listing files:', error.message);
    if (error.name === 'NoSuchBucket') {
      console.log('\n💡 Bucket does not exist. Create it in Cloudflare dashboard.');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
      console.log('\n💡 Cannot connect to R2. Check:');
      console.log('   - Account ID is correct');
      console.log('   - Access credentials are valid');
      console.log('   - Network connectivity (IPv4/IPv6)');
    }
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
}

// List all files
listFiles().catch(console.error);
