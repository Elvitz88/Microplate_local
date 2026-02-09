import dotenv from 'dotenv';

dotenv.config();

export const storageConfig = {
  allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/webp,image/tiff').split(','),
  s3: {
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
    region: process.env.OBJECT_STORAGE_REGION || 'us-east-1',
    accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.OBJECT_STORAGE_SECRET_KEY || 'minioadmin',
    forcePathStyle: String(process.env.OBJECT_STORAGE_FORCE_PATH_STYLE || 'true') === 'true',
    rawBucket: process.env.OBJECT_STORAGE_BUCKET_RAW || 'raw-images',
    annotatedBucket: process.env.OBJECT_STORAGE_BUCKET_ANNOTATED || 'annotated-images',
    signedUrlExpiry: Number(process.env.SIGNED_URL_EXPIRY || 3600) 
  }
};


