import { captureApi } from './api';
import logger from '../utils/logger';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface CaptureRequest {
  sampleNo: string;
  submissionNo: string;
  description?: string;
}

export interface CaptureResponse {
  success: boolean;
  imageUrl: string;
  imagePath: string;
  timestamp: number;
  sampleNo: string;
  submissionNo: string;
  description?: string;
}

export interface CaptureStatus {
  status: 'idle' | 'capturing' | 'processing' | 'success' | 'error';
  progress?: number;
  message?: string;
  error?: string;
}

class CaptureService {
  private baseUrl: string;

  constructor() {
    const defaultBase =
      typeof window !== 'undefined'
        ? window.location.origin
        : window.VISION_CAPTURE_SERVICE_URL || 'http://localhost:6410';
    this.baseUrl = window.VISION_CAPTURE_SERVICE_URL || defaultBase;
  }

  async captureImage(request: CaptureRequest): Promise<ApiResponse<CaptureResponse>> {
    try {
      logger.debug('CaptureService: Sending capture request', request);
      const payload = {
        sample_no: request.sampleNo,
        submission_no: request.submissionNo,
        description: request.description ?? 'Captured image'
      } as const;

      const resp = await captureApi.post<any>(`/api/v1/capture/image`, payload);
      const filename: string | undefined = resp?.data?.image_data?.filename;
      const capturedAtIso: string | undefined = resp?.data?.image_data?.captured_at;
      const sampleNo: string | undefined = resp?.data?.sample_no;
      const submissionNo: string | undefined = resp?.data?.submission_no;

      if (!filename) {
        throw new Error('Missing filename in capture response');
      }

      const imageUrl = `${this.baseUrl}/api/v1/capture/image/${filename}`;
      const mapped: CaptureResponse = {
        success: true,
        imageUrl,
        imagePath: filename,
        timestamp: capturedAtIso ? Date.parse(capturedAtIso) : Date.now(),
        sampleNo: sampleNo || request.sampleNo,
        submissionNo: submissionNo || request.submissionNo,
        description: request.description
      };

      logger.info('CaptureService: Image captured successfully', { filename });
      return { success: true, data: mapped };
    } catch (error) {
      logger.error('CaptureService: Failed to capture image', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async getCaptureStatus(): Promise<ApiResponse<CaptureStatus>> {
    try {
      const response = await captureApi.get<CaptureStatus>(`/api/v1/capture/status`);
      return {
        success: true,
        data: response
      };
    } catch (error) {
      logger.error('CaptureService: Failed to get capture status', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async downloadImage(imagePath: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/capture/image/${imagePath}`);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }
      return await response.blob();
    } catch (error) {
      logger.error('CaptureService: Failed to download image', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  getImageUrl(imagePath: string): string {
    return `${this.baseUrl}/api/v1/capture/image/${imagePath}`;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await captureApi.get(`/api/v1/capture/health`) as ApiResponse<unknown>;
      return (response as any)?.success ?? true;
    } catch (error) {
      logger.error('CaptureService: Connection check failed', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  connectWebSocket(onStatusUpdate: (status: CaptureStatus) => void): WebSocket | null {
    try {
      const wsUrl = this.baseUrl.replace('http', 'ws');
      const ws = new WebSocket(`${wsUrl}/ws/capture`);
      ws.onopen = () => {
        logger.info('CaptureService: WebSocket connected');
      };
      ws.onmessage = (event) => {
        try {
          const status: CaptureStatus = JSON.parse(event.data);
          logger.debug('CaptureService: Status update', status);
          onStatusUpdate(status);
        } catch (error) {
          logger.error('CaptureService: Failed to parse WebSocket message', error instanceof Error ? error.message : String(error));
        }
      };
      
      ws.onclose = () => {
        logger.info('CaptureService: WebSocket disconnected');
      };

      ws.onerror = (error) => {
        logger.error('CaptureService: WebSocket error', String(error));
      };
      
      return ws;
    } catch (error) {
      logger.error('CaptureService: Failed to connect WebSocket', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  disconnectWebSocket(ws: WebSocket | null): void {
    if (ws) {
      ws.close();
    }
  }
}

export const captureService = new CaptureService();
