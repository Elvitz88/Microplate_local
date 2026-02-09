import { labwareApi } from './api';
import { authService } from './auth.service';
import logger from '../utils/logger';

interface InterfaceResponse {
  success: boolean;
  data: {
    id: string;
    sampleNo: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    status: string;
    generatedAt: string;
    downloadUrl: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface InterfaceFileData {
  id: string;
  sampleNo: string;
  fileName: string;
  filePath: string;
  fileSize: string | undefined;
  status: 'pending' | 'generated' | 'delivered' | 'failed';
  generatedAt: Date | undefined;
  deliveredAt: Date | undefined;
  errorMsg: string | undefined;
  createdAt: Date;
  downloadUrl?: string;
}

interface CsvPreviewData {
  headers: string[];
  rows: string[][];
  rawContent: string;
}

export const labwareService = {
  
  async generateInterfaceCsv(sampleNo: string, testNumber?: string): Promise<InterfaceResponse> {
    logger.debug('🚀 labwareService: generateInterfaceCsv called for sample:', sampleNo, 'testNumber:', testNumber);
    try {
      const token = authService.loadTokenFromStorage();
      logger.debug('🔑 labwareService: Token loaded:', token ? `Token exists (${token.substring(0, 20)}...)` : 'No token');
      
      if (token) {
        
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const now = Math.floor(Date.now() / 1000);
          logger.debug('🕒 Token expiration:', new Date(payload.exp * 1000).toISOString());
          logger.debug('🕒 Current time:', new Date(now * 1000).toISOString());
          logger.debug('🕒 Token expired:', payload.exp < now ? 'YES' : 'NO');
          logger.debug('🏷️ Token issuer (iss):', payload.iss);
          logger.debug('🎯 Token audience (aud):', payload.aud);
          logger.debug('👤 Token subject (sub):', payload.sub);
        } catch (e) {
          logger.warn('⚠️ Could not decode token:', e);
        }
        
        labwareApi.setAccessToken(token);
        logger.debug('✅ labwareService: Token set to labwareApi');
      } else {
        logger.warn('❌ labwareService: No token available - user needs to login');
      }
      
      
      const currentToken = (labwareApi as any).accessToken;
      logger.debug('📤 labwareService: Token being sent:', currentToken ? `${currentToken.substring(0, 20)}...` : 'No token');
      
      const response = await labwareApi.post<InterfaceResponse>('/api/v1/interface/generate', {
        sampleNo,
        testNumber,
      });
      
      logger.info('labwareService: Interface CSV generated:', response);
      return response;
    } catch (error) {
      logger.error('labwareService: Failed to generate interface CSV:', error);
      throw error;
    }
  },

  
  async getInterfaceFiles(sampleNo?: string): Promise<{ success: boolean; data: InterfaceFileData[] }> {
    try {
      const token = authService.loadTokenFromStorage();
      if (token) {
        labwareApi.setAccessToken(token);
      }
      
      const params = sampleNo ? `?sampleNo=${sampleNo}` : '';
      const response = await labwareApi.get<{ success: boolean; data: InterfaceFileData[] }>(`/api/v1/interface/files${params}`);
      
      logger.info('labwareService: Interface files retrieved:', response);
      return response;
    } catch (error) {
      logger.error('labwareService: Failed to get interface files:', error);
      throw error;
    }
  },

  async getInterfaceFile(id: string): Promise<{ success: boolean; data: InterfaceFileData }> {
    try {
      const token = authService.loadTokenFromStorage();
      if (token) {
        labwareApi.setAccessToken(token);
      }
      
      const response = await labwareApi.get<{ success: boolean; data: InterfaceFileData }>(`/api/v1/interface/files/${id}`);
      
      logger.info('labwareService: Interface file details:', response);
      return response;
    } catch (error) {
      logger.error('labwareService: Failed to get interface file:', error);
      throw error;
    }
  },

  async downloadCsvFile(downloadUrl: string, fileName: string): Promise<void> {
    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('labwareService: Failed to download CSV file:', error);
      throw error;
    }
  },

  
  parseCsvContent(csvContent: string): CsvPreviewData {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0]?.split(',') || [];
    const rows = lines.slice(1).map(line => line.split(','));
    
    return {
      headers,
      rows,
      rawContent: csvContent,
    };
  },

  
  downloadCsv(csvContent: string, fileName: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },

  
  previewCsv(csvContent: string): CsvPreviewData {
    return this.parseCsvContent(csvContent);
  },
};
