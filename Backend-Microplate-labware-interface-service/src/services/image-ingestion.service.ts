import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import { logger } from '../utils/logger';

interface UploadFileParams {
  filePath: string;
  fileName: string;
  type: 'raw' | 'annotated' | 'csv' | 'thumbnail';
  sampleNo: string;
  runId?: string;
  description?: string;
}

interface UploadFileResponse {
  success: boolean;
  data?: {
    fileId: string;
    id: number;
    fileName: string;
    filePath: string;
    fileSize: number;
    fileType: string;
    sampleNo: string;
    runId: string | null;
    downloadUrl: string;
    signedUrl: string;
    urlExpiresAt: string;
    bucketName: string;
    objectKey: string;
    createdAt: Date;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface GetFileUrlResponse {
  success: boolean;
  data?: {
    fileId: string;
    fileName: string;
    downloadUrl: string;
    signedUrl: string;
    expiresAt: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Image Ingestion Service Client
 * Handles file uploads via HTTP API (replaces MinIO direct access)
 */
class ImageIngestionService {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env['IMAGE_SERVICE_URL'] || 'http://image-ingestion:6402';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000, // 60 seconds for file uploads
      headers: {
        'Accept': 'application/json'
      }
    });

    logger.info('ImageIngestionService initialized', { baseUrl: this.baseUrl });
  }

  /**
   * Upload file to Image Ingestion Service
   */
  async uploadFile(params: UploadFileParams): Promise<UploadFileResponse> {
    try {
      // Read file from disk
      const fileBuffer = fs.readFileSync(params.filePath);

      // Create form data using FormData from axios
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', fileBuffer, params.fileName);
      formData.append('type', params.type);
      formData.append('sampleNo', params.sampleNo);

      if (params.runId) {
        formData.append('runId', params.runId);
      }

      if (params.description) {
        formData.append('description', params.description);
      }

      logger.info('Uploading file to Image Ingestion Service', {
        type: params.type,
        sampleNo: params.sampleNo,
        fileName: params.fileName,
        fileSize: fileBuffer.length
      });

      // Upload file
      const response = await this.client.post<UploadFileResponse>(
        '/api/v1/ingestion/files/upload',
        formData,
        {
          headers: {
            ...formData.getHeaders()
          }
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Upload failed');
      }

      logger.info('File uploaded successfully', {
        fileId: response.data.data?.fileId,
        fileName: response.data.data?.fileName,
        downloadUrl: response.data.data?.downloadUrl
      });

      return response.data;
    } catch (error: unknown) {
      logger.error('Failed to upload file to Image Ingestion Service', {
        error: error instanceof Error ? error.message : String(error),
        params: {
          type: params.type,
          sampleNo: params.sampleNo,
          fileName: params.fileName
        }
      });

      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: {
            code: error.response?.data?.error?.code || 'UPLOAD_FAILED',
            message: error.response?.data?.error?.message || error.message
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to upload file'
        }
      };
    }
  }

  /**
   * Get file URL (generate new signed URL)
   */
  async getFileUrl(fileId: string, expiresIn?: number): Promise<GetFileUrlResponse> {
    try {
      const params: any = {};
      if (expiresIn) {
        params.expiresIn = expiresIn;
      }

      const response = await this.client.get<GetFileUrlResponse>(
        `/api/v1/ingestion/files/${fileId}/url`,
        { params }
      );

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to get file URL');
      }

      return response.data;
    } catch (error: unknown) {
      logger.error('Failed to get file URL', {
        error: error instanceof Error ? error.message : String(error),
        fileId
      });

      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: {
            code: error.response?.data?.error?.code || 'GET_URL_FAILED',
            message: error.response?.data?.error?.message || error.message
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'GET_URL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get file URL'
        }
      };
    }
  }

  /**
   * Delete file from Image Ingestion Service
   */
  async deleteFile(fileId: string): Promise<{ success: boolean; error?: { code: string; message: string } }> {
    try {
      const response = await this.client.delete(
        `/api/v1/ingestion/files/${fileId}`
      );

      return response.data;
    } catch (error: unknown) {
      logger.error('Failed to delete file', {
        error: error instanceof Error ? error.message : String(error),
        fileId
      });

      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: {
            code: error.response?.data?.error?.code || 'DELETE_FAILED',
            message: error.response?.data?.error?.message || error.message
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete file'
        }
      };
    }
  }
}

export const imageIngestionService = new ImageIngestionService();
