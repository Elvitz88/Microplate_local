import { S3Client, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { storageConfig } from '../config/storage';

function getS3Client(): S3Client {
  return new S3Client({
    endpoint: storageConfig.s3.endpoint,
    region: storageConfig.s3.region,
    credentials: {
      accessKeyId: storageConfig.s3.accessKeyId,
      secretAccessKey: storageConfig.s3.secretAccessKey
    },
    forcePathStyle: storageConfig.s3.forcePathStyle
  });
}

async function ensureBucketExists(s3: S3Client, bucket: string): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (err: any) {
    const code = err?.$metadata?.httpStatusCode || err?.name;
    if (code === 404 || err?.name === 'NotFound' || err?.Code === 'NoSuchBucket') {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
      return;
    }
    
    try {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (createErr) {
      throw createErr;
    }
  }
}

export async function ensureBuckets(): Promise<void> {
  const s3 = getS3Client();
  await ensureBucketExists(s3, storageConfig.s3.rawBucket);
  await ensureBucketExists(s3, storageConfig.s3.annotatedBucket);
}


