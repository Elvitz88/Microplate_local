import { useState, useCallback } from 'react';
import { captureService, type CaptureRequest, type CaptureResponse, type CaptureStatus } from '../services/capture.service';
import logger from '../utils/logger';

interface UseCaptureOptions {
  onSuccess?: (response: CaptureResponse) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: CaptureStatus) => void;
}

interface UseCaptureReturn {
  
  isCapturing: boolean;
  captureStatus: CaptureStatus;
  capturedImageUrl: string | null;
  error: string | null;
  
  
  captureImage: (request: CaptureRequest) => Promise<void>;
  clearError: () => void;
  resetCapture: () => void;
  
  
  isConnected: boolean;
  checkConnection: () => Promise<boolean>;
}

export function useCapture(options: UseCaptureOptions = {}): UseCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>({
    status: 'idle'
  });
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const { onSuccess, onError, onStatusChange } = options;

  
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const connected = await captureService.checkConnection();
      setIsConnected(connected);
      if (!connected) {
        setError('ไม่สามารถเชื่อมต่อกับ Vision Capture Service ได้');
        return false;
      }
      return true;
    } catch {
      setIsConnected(false);
      setError('ไม่สามารถเชื่อมต่อกับ Vision Capture Service ได้');
      return false;
    }
  }, []);

  
  const captureImage = useCallback(async (request: CaptureRequest) => {
    try {
      setIsCapturing(true);
      setError(null);
      setCaptureStatus({ status: 'capturing', message: 'กำลังถ่ายภาพ...' });
      
      
      if (onStatusChange) {
        onStatusChange({ status: 'capturing', message: 'กำลังถ่ายภาพ...' });
      }

      
      const ok = await checkConnection();
      if (!ok) {
        throw new Error('ไม่สามารถเชื่อมต่อกับ Vision Capture Service ได้');
      }

      
      const response = await captureService.captureImage(request);
      
      if (response.data) {
        const captureResponse = response.data;
        
        
        setCaptureStatus({ 
          status: 'success', 
          message: 'ถ่ายภาพสำเร็จ',
          progress: 100 
        });
        
        
        const imageUrl = captureService.getImageUrl(captureResponse.imagePath);
        setCapturedImageUrl(imageUrl);
        
        
        if (onSuccess) {
          onSuccess(captureResponse);
        }
        
        if (onStatusChange) {
          onStatusChange({ 
            status: 'success', 
            message: 'ถ่ายภาพสำเร็จ',
            progress: 100 
          });
        }
        
        logger.info('✅ Capture successful:', captureResponse);
      } else {
        throw new Error('ไม่ได้รับข้อมูลภาพจาก Vision Capture Service');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการถ่ายภาพ';
      setError(errorMessage);
      setCaptureStatus({ 
        status: 'error', 
        error: errorMessage,
        message: 'ถ่ายภาพล้มเหลว'
      });
      
      
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
      
      if (onStatusChange) {
        onStatusChange({ 
          status: 'error', 
          error: errorMessage,
          message: 'ถ่ายภาพล้มเหลว'
        });
      }
      
      logger.error('❌ Capture failed:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [onSuccess, onError, onStatusChange, checkConnection]);

  
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  
  const resetCapture = useCallback(() => {
    setIsCapturing(false);
    setCaptureStatus({ status: 'idle' });
    setCapturedImageUrl(null);
    setError(null);
  }, []);

  return {
    
    isCapturing,
    captureStatus,
    capturedImageUrl,
    error,
    isConnected,
    
    
    captureImage,
    clearError,
    resetCapture,
    checkConnection
  };
}
