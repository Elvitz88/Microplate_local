import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';

type FileType = 'raw' | 'annotated' | 'csv' | 'thumbnail';

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/tiff': 'tiff',
  'text/csv': 'csv',
  'application/csv': 'csv'
};

const EXTENSION_MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  csv: 'text/csv'
};

const ALLOWED_MIME_SET = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'text/csv',
  'application/csv'
]);

function resolveMimeType(
  filename?: string,
  providedMime?: string
): { mimeType: string; extension: string } {
  const normalizedProvided = providedMime?.trim().toLowerCase();
  const ext = filename ? path.extname(filename).toLowerCase().replace('.', '') : '';
  const inferredFromExt = ext ? EXTENSION_MIME_MAP[ext] : undefined;
  const mimeType = normalizedProvided || inferredFromExt || 'application/octet-stream';

  if (!ALLOWED_MIME_SET.has(mimeType)) {
    throw new Error(`Unsupported mime type: ${mimeType}`);
  }

  const extension = MIME_EXTENSION_MAP[mimeType] || ext || 'bin';
  return { mimeType, extension };
}

interface UploadParams {
  sampleNo: string;
  runId?: string;
  fileType: FileType;
  filename?: string;
  buffer: Buffer;
  mimeType?: string;
  description?: string;
}

interface FileMetadata {
  fileId: string;
  sampleNo: string;
  runId: number | null;
  fileType: FileType;
  fileName: string;
  filePath: string;
  fullPath: string;
  fileSize: number;
  mimeType: string;
  description: string;
  createdAt: string;
}

/**
 * PVC Storage Service
 * Replaces MinIO with Persistent Volume Claim (PVC-RWO) storage
 */
class PVCStorageService {
  private baseDir: string;
  private jwtSecret: string;
  private urlExpirySeconds: number;

  constructor() {
    // PVC mount point
    this.baseDir = process.env.STORAGE_BASE_DIR || '/mnt/storage';
    this.jwtSecret = process.env.FILE_ACCESS_SECRET || 'your-secret-key-change-in-production';
    this.urlExpirySeconds = parseInt(process.env.SIGNED_URL_EXPIRY || '604800', 10); // 7 days

    logger.info('PVCStorageService initialized', {
      baseDir: this.baseDir,
      urlExpirySeconds: this.urlExpirySeconds
    });

    this.ensureDirectories();
  }

  /**
   * Ensure base directories exist
   */
  private ensureDirectories(): void {
    const dirs = [
      path.join(this.baseDir, 'raw-images'),
      path.join(this.baseDir, 'annotated-images'),
      path.join(this.baseDir, 'interface-files')
    ];

    dirs.forEach(dir => {
      if (!fsSync.existsSync(dir)) {
        fsSync.mkdirSync(dir, { recursive: true });
        logger.info('Created directory', { dir });
      }
    });
  }

  /**
   * Get subdirectory based on file type
   */
  private getSubDirectory(fileType: FileType): string {
    switch (fileType) {
      case 'raw':
      case 'thumbnail':
        return 'raw-images';
      case 'annotated':
        return 'annotated-images';
      case 'csv':
        return 'interface-files';
      default:
        throw new Error(`Unknown file type: ${fileType}`);
    }
  }

  /**
   * Save file to PVC storage
   */
  async saveFile(params: UploadParams): Promise<FileMetadata> {
    try {
      const { mimeType, extension } = resolveMimeType(params.filename, params.mimeType);

      // Generate unique file ID and name
      const fileId = randomUUID();
      const timestamp = new Date().toISOString().replace(/[-:TZ]/g, '').slice(0, 14);
      const fileName = `${params.sampleNo}_${timestamp}_${fileId}${
        params.fileType === 'thumbnail' ? '_thumb' : ''
      }.${extension}`;

      // Determine storage path
      const subDir = this.getSubDirectory(params.fileType);
      const sampleDir = path.join(this.baseDir, subDir, params.sampleNo);

      // Create sample directory if not exists
      if (!fsSync.existsSync(sampleDir)) {
        await fs.mkdir(sampleDir, { recursive: true });
        logger.debug('Created sample directory', { sampleDir });
      }

      // Full file path
      const fullPath = path.join(sampleDir, fileName);
      const relativePath = path.join(subDir, params.sampleNo, fileName).replace(/\\/g, '/');

      logger.info('Saving file to PVC storage', {
        fileId,
        fileName,
        relativePath,
        size: params.buffer.length,
        sampleNo: params.sampleNo,
        runId: params.runId,
        fileType: params.fileType
      });

      // Write file to disk
      await fs.writeFile(fullPath, params.buffer);

      logger.info('Successfully saved file to PVC storage', {
        fileId,
        fileName,
        relativePath,
        size: params.buffer.length
      });

      // Return metadata
      return {
        fileId,
        sampleNo: params.sampleNo,
        runId: params.runId ? Number(params.runId) : null,
        fileType: params.fileType,
        fileName,
        filePath: relativePath,
        fullPath,
        fileSize: params.buffer.length,
        mimeType,
        description: params.description || '',
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to save file to PVC storage', {
        error: error instanceof Error ? error.message : error,
        sampleNo: params.sampleNo,
        fileType: params.fileType
      });
      throw error;
    }
  }

  /**
   * Get file from PVC storage
   */
  async getFile(filePath: string): Promise<{ buffer: Buffer; mimeType: string }> {
    try {
      const fullPath = path.join(this.baseDir, filePath);

      logger.debug('Reading file from PVC storage', { filePath, fullPath });

      // Check if file exists
      if (!fsSync.existsSync(fullPath)) {
        throw new Error('File not found');
      }

      // Read file
      const buffer = await fs.readFile(fullPath);

      // Infer MIME type from extension
      const ext = path.extname(fullPath).toLowerCase().replace('.', '');
      const mimeType = EXTENSION_MIME_MAP[ext] || 'application/octet-stream';

      logger.debug('Successfully read file from PVC storage', {
        filePath,
        size: buffer.length,
        mimeType
      });

      return { buffer, mimeType };
    } catch (error) {
      logger.error('Failed to read file from PVC storage', {
        error: error instanceof Error ? error.message : error,
        filePath
      });
      throw error;
    }
  }

  /**
   * Delete file from PVC storage
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.baseDir, filePath);

      logger.info('Deleting file from PVC storage', { filePath, fullPath });

      if (fsSync.existsSync(fullPath)) {
        await fs.unlink(fullPath);
        logger.info('Successfully deleted file from PVC storage', { filePath });
      } else {
        logger.warn('File not found, skipping deletion', { filePath });
      }
    } catch (error) {
      logger.error('Failed to delete file from PVC storage', {
        error: error instanceof Error ? error.message : error,
        filePath
      });
      throw error;
    }
  }

  /**
   * List files in directory
   */
  async listFiles(fileType: FileType, sampleNo?: string): Promise<string[]> {
    try {
      const subDir = this.getSubDirectory(fileType);
      const searchDir = sampleNo
        ? path.join(this.baseDir, subDir, sampleNo)
        : path.join(this.baseDir, subDir);

      logger.debug('Listing files from PVC storage', { fileType, sampleNo, searchDir });

      if (!fsSync.existsSync(searchDir)) {
        logger.debug('Directory not found, returning empty list', { searchDir });
        return [];
      }

      // Read directory
      const entries = await fs.readdir(searchDir, { withFileTypes: true });
      const files = entries
        .filter(entry => entry.isFile())
        .map(entry => path.join(sampleNo ? `${subDir}/${sampleNo}` : subDir, entry.name).replace(/\\/g, '/'));

      logger.debug('Successfully listed files', { fileType, sampleNo, count: files.length });

      return files;
    } catch (error) {
      logger.error('Failed to list files from PVC storage', {
        error: error instanceof Error ? error.message : error,
        fileType,
        sampleNo
      });
      throw error;
    }
  }

  /**
   * Generate signed URL (JWT-based token)
   */
  generateSignedUrl(fileId: string, filePath: string, expiresIn?: number): {
    signedUrl: string;
    expiresAt: string;
  } {
    const expiry = expiresIn || this.urlExpirySeconds;
    const expiresAt = new Date(Date.now() + expiry * 1000);

    // Generate JWT token
    const token = jwt.sign(
      {
        fileId,
        filePath,
        exp: Math.floor(expiresAt.getTime() / 1000)
      },
      this.jwtSecret
    );

    // Build signed URL - use PUBLIC_URL for browser-accessible URLs
    // IMAGE_SERVICE_URL is for internal service-to-service communication
    // PUBLIC_URL should be the nginx frontend URL that browsers can access
    const baseUrl = process.env.PUBLIC_IMAGE_SERVICE_URL || process.env.PUBLIC_URL || 'http://localhost:6410';
    const signedUrl = `${baseUrl}/api/v1/ingestion/files/${fileId}/download?token=${token}`;

    logger.debug('Generated signed URL', {
      fileId,
      filePath,
      expiresAt: expiresAt.toISOString(),
      expiresIn: expiry
    });

    return {
      signedUrl,
      expiresAt: expiresAt.toISOString()
    };
  }

  /**
   * Verify signed URL token
   */
  verifySignedUrl(token: string): { fileId: string; filePath: string } {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as {
        fileId: string;
        filePath: string;
      };

      logger.debug('Verified signed URL token', { fileId: decoded.fileId });

      return {
        fileId: decoded.fileId,
        filePath: decoded.filePath
      };
    } catch (error) {
      logger.error('Failed to verify signed URL token', {
        error: error instanceof Error ? error.message : error
      });
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Get file stats
   */
  async getFileStats(filePath: string): Promise<{
    size: number;
    createdAt: Date;
    modifiedAt: Date;
  }> {
    const fullPath = path.join(this.baseDir, filePath);

    if (!fsSync.existsSync(fullPath)) {
      throw new Error('File not found');
    }

    const stats = await fs.stat(fullPath);

    return {
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime
    };
  }
}

// Singleton instance
export const pvcStorageService = new PVCStorageService();
