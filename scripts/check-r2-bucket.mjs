import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import https from 'https';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

const accountId = requireEnv('R2_ACCOUNT_ID');
const accessKeyId = requireEnv('R2_ACCESS_KEY_ID');
const secretAccessKey = requireEnv('R2_SECRET_ACCESS_KEY');
const bucketName = requireEnv('R2_BUCKET_NAME');
const publicUrl = process.env.R2_PUBLIC_URL;

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
  console.log('R2 bucket contents check');
  console.log(`Bucket: ${bucketName}`);
  console.log(`Prefix: ${prefix || '(all files)'}\n`);

  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: prefix,
    MaxKeys: 100,
  });

  const response = await client.send(command);

  if (!response.Contents || response.Contents.length === 0) {
    console.log('No files found in bucket.');
    console.log(
      'Verify the bucket name, credentials, prefix, and upload flow.'
    );
    return;
  }

  console.log(`Found ${response.Contents.length} files:\n`);

  response.Contents.forEach((item, index) => {
    const sizeKB = ((item.Size || 0) / 1024).toFixed(2);
    const date = item.LastModified ? item.LastModified.toISOString() : 'N/A';
    const objectKey = item.Key || '';
    const publicObjectUrl = publicUrl
      ? `${publicUrl.replace(/\/$/, '')}/${objectKey.replace(/^\/+/, '')}`
      : null;

    console.log(`${index + 1}. ${objectKey}`);
    console.log(`   Size: ${sizeKB} KB | Modified: ${date}`);
    if (publicObjectUrl) {
      console.log(`   URL: ${publicObjectUrl}`);
    }
    console.log('');
  });
}

listFiles(process.argv[2] || '').catch((error) => {
  console.error('Error listing R2 files:', error.message);
  process.exit(1);
});
