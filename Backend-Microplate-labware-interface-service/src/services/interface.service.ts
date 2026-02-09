import { prisma } from '../server';
import { csvService } from './csv.service';
import { imageIngestionService } from './image-ingestion.service';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

interface GenerateInterfaceRequest {
  sampleNo: string;
  testNumber?: string;
  createdBy?: string;
}

interface GenerateInterfaceResponse {
  success: boolean;
  data?: {
    id: string;
    sampleNo: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    status: string;
    generatedAt: Date;
    downloadUrl?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

class InterfaceService {
  async generateInterfaceFile(request: GenerateInterfaceRequest): Promise<GenerateInterfaceResponse> {
    let interfaceFileId: string | null = null;
    let tempFilePath: string | null = null;

    try {




      const interfaceFile = await prisma.interfaceFile.create({
        data: {
          id: uuidv4(),
          sampleNo: request.sampleNo,
          fileName: `interface_${request.sampleNo}_${Date.now()}.csv`,
          filePath: '',
          status: 'pending',
          createdBy: request.createdBy || null,
        },
      });

      interfaceFileId = interfaceFile.id;


      const csvResult = await csvService.generateInterfaceFile(request.sampleNo, request.testNumber);
      tempFilePath = csvResult.filePath;


      await prisma.interfaceFile.update({
        where: { id: interfaceFileId },
        data: {
          fileName: csvResult.fileName,
          fileSize: BigInt(csvResult.fileSize),
          status: 'generated',
          generatedAt: new Date(),
        },
      });


      const uploadResult = await imageIngestionService.uploadFile({
        filePath: csvResult.filePath,
        fileName: csvResult.fileName,
        type: 'csv',
        sampleNo: request.sampleNo,
        runId: request.sampleNo,
        description: `Interface file for sample ${request.sampleNo}`
      });

      if (!uploadResult.success || !uploadResult.data) {
        throw new Error(uploadResult.error?.message || 'Failed to upload CSV to Image Ingestion Service');
      }


      await prisma.interfaceFile.update({
        where: { id: interfaceFileId },
        data: {
          // Store database ID in filePath using | delimiter (HACK: to avoid schema change)
          // Use uploadResult.data.id (integer) not fileId (UUID) because image-ingestion-service
          // expects integer ID for GET /files/:id/url endpoint
          filePath: `${uploadResult.data.filePath}|${uploadResult.data.id}`,
          status: 'delivered',
          deliveredAt: new Date(),
        },
      });


      const downloadUrl = uploadResult.data.downloadUrl;


      await csvService.cleanupFile(tempFilePath);
      tempFilePath = null;

      return {
        success: true,
        data: {
          id: interfaceFile.id,
          sampleNo: interfaceFile.sampleNo,
          fileName: csvResult.fileName,
          // Return clean filePath to client
          filePath: uploadResult.data.filePath,
          fileSize: csvResult.fileSize,
          status: 'delivered',
          generatedAt: new Date(),
          downloadUrl,
        },
      };
    } catch (error) {
      logger.error('Failed to generate interface file', {
        error,
        sampleNo: request.sampleNo,
        interfaceFileId,
      });


      if (interfaceFileId) {
        try {
          await prisma.interfaceFile.update({
            where: { id: interfaceFileId },
            data: {
              status: 'failed',
              errorMsg: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        } catch (updateError) {
          logger.error('Failed to update interface file status', {
            error: updateError,
            interfaceFileId,
            status: 'failed',
          });
        }
      }


      if (tempFilePath) {
        await csvService.cleanupFile(tempFilePath);
      }

      return {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate interface file',
        },
      };
    }
  }

  async getInterfaceFiles(sampleNo?: string): Promise<{
    success: boolean;
    data?: any[];
    error?: {
      code: string;
      message: string;
    };
  }> {
    try {
      const where = sampleNo ? { sampleNo } : {};

      const interfaceFiles = await prisma.interfaceFile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const filesWithDownloadUrl = await Promise.all(
        interfaceFiles.map(async (file) => ({
          id: file.id,
          sampleNo: file.sampleNo,
          fileName: file.fileName,
          // Clean filePath (remove fileId suffix if present)
          filePath: file.filePath.split('|')[0],
          fileSize: file.fileSize?.toString(),
          status: file.status,
          generatedAt: file.generatedAt,
          deliveredAt: file.deliveredAt,
          errorMsg: file.errorMsg,
          createdAt: file.createdAt,
          downloadUrl: (await this.resolveDownloadUrl(file.filePath, file.status, file.id)) || undefined,
        }))
      );

      return {
        success: true,
        data: filesWithDownloadUrl,
      };
    } catch (error) {
      logger.error('Failed to get interface files', { error, sampleNo });
      return {
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch interface files',
        },
      };
    }
  }

  async getInterfaceFile(id: string): Promise<{
    success: boolean;
    data?: any;
    error?: {
      code: string;
      message: string;
    };
  }> {
    try {
      const interfaceFile = await prisma.interfaceFile.findUnique({
        where: { id },
      });

      if (!interfaceFile) {
        return {
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'Interface file not found',
          },
        };
      }


      const downloadUrl = await this.resolveDownloadUrl(interfaceFile.filePath, interfaceFile.status, interfaceFile.id);

      return {
        success: true,
        data: {
          id: interfaceFile.id,
          sampleNo: interfaceFile.sampleNo,
          fileName: interfaceFile.fileName,
          filePath: interfaceFile.filePath,
          fileSize: interfaceFile.fileSize?.toString(),
          status: interfaceFile.status,
          generatedAt: interfaceFile.generatedAt,
          deliveredAt: interfaceFile.deliveredAt,
          errorMsg: interfaceFile.errorMsg,
          createdAt: interfaceFile.createdAt,
          downloadUrl,
        },
      };
    } catch (error) {
      logger.error('Failed to get interface file', { error, interfaceFileId: id });
      return {
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch interface file',
        },
      };
    }
  }

  private async resolveDownloadUrl(filePath: string | null, status: string, interfaceFileId: string): Promise<string | undefined> {
    // Allow download URL for both 'generated' and 'delivered' status
    if ((status !== 'delivered' && status !== 'generated') || !filePath) {
      return undefined;
    }

    try {
      // Try to extract fileId from filePath (format: path|fileId)
      let fileId = '';
      if (filePath.includes('|')) {
        const parts = filePath.split('|');
        fileId = parts[1] || '';
      } else {
        // Fallback or legacy: try to get via interfaceFileId (unlikely to work if not stored)
        // Or if impossible, just return undefined
        return undefined;
      }

      const urlResult = await imageIngestionService.getFileUrl(fileId);
      if (urlResult.success && urlResult.data) {
        return urlResult.data.downloadUrl;
      }
    } catch (urlError) {
      logger.error('Failed to resolve download URL', {
        error: urlError,
        interfaceFileId,
        filePath,
      });
    }

    return undefined;
  }

  async deleteInterfaceFile(id: string): Promise<{
    success: boolean;
    error?: {
      code: string;
      message: string;
    };
  }> {
    try {
      const interfaceFile = await prisma.interfaceFile.findUnique({
        where: { id },
      });

      if (!interfaceFile) {
        return {
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'Interface file not found',
          },
        };
      }


      if (interfaceFile.filePath) {
        try {
          // Extract fileId from filePath (format: interface-files/{sampleNo}/{fileId_timestamp_...}.csv)
          const filePathParts = interfaceFile.filePath.split('/');
          const fileName = filePathParts[filePathParts.length - 1];
          if (fileName) {
            const fileId = fileName.split('_')[0]; // Extract first UUID part
            if (fileId) {
              await imageIngestionService.deleteFile(fileId);
            }
          }

        } catch (deleteError) {
          logger.error('Failed to delete file from Image Ingestion Service', {
            error: deleteError,
            filePath: interfaceFile.filePath,
          });
          // Continue with database deletion even if file deletion fails
        }
      }


      await prisma.interfaceFile.delete({
        where: { id },
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete interface file', { error, interfaceFileId: id });
      return {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete interface file',
        },
      };
    }
  }
}

export const interfaceService = new InterfaceService();
