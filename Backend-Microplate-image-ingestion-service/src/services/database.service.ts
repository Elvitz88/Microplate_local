import { PrismaClient } from '@prisma/client';

class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
  }

  async connect(): Promise<void> {
    await this.prisma.$connect();
  }

  getClient(): PrismaClient {
    return this.prisma;
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async healthCheck(): Promise<{ status: string; message?: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', message: String(error) };
    }
  }

  
  async createImageFile(data: {
    runId?: number;
    sampleNo: string;
    fileType: string;
    fileName: string;
    filePath: string;
    fileSize?: bigint;
    mimeType?: string;
    width?: number;
    height?: number;
    bucketName?: string;
    objectKey?: string;
    signedUrl?: string;
    urlExpiresAt?: Date;
    description?: string;
  }) {
    return this.prisma.imageFile.create({
      data: {
        runId: data.runId,
        sampleNo: data.sampleNo,
        fileType: data.fileType,
        fileName: data.fileName,
        filePath: data.filePath,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        width: data.width,
        height: data.height,
        bucketName: data.bucketName,
        objectKey: data.objectKey,
        signedUrl: data.signedUrl,
        urlExpiresAt: data.urlExpiresAt,
        description: data.description
      }
    });
  }

  async getImageFile(id: number) {
    return this.prisma.imageFile.findUnique({
      where: { id }
    });
  }

  async getImageFilesByRunId(runId: number) {
    return this.prisma.imageFile.findMany({
      where: { runId }
    });
  }

  async getImageFilesBySampleNo(sampleNo: string) {
    return this.prisma.imageFile.findMany({
      where: { sampleNo }
    });
  }

  async getImageFilesByBucketAndObjectKey(bucketName: string, objectKey: string) {
    return this.prisma.imageFile.findFirst({
      where: { 
        bucketName,
        objectKey
      }
    });
  }

  async getAllImageFiles() {
    return this.prisma.imageFile.findMany({
      select: {
        id: true,
        bucketName: true,
        objectKey: true,
        createdAt: true
      }
    });
  }

  async updateImageFile(id: number, data: {
    signedUrl?: string;
    urlExpiresAt?: Date;
    description?: string;
  }) {
    return this.prisma.imageFile.update({
      where: { id },
      data
    });
  }

  async deleteImageFile(id: number) {
    return this.prisma.imageFile.delete({
      where: { id }
    });
  }

  async deleteImageFilesByRunId(runId: number) {
    return this.prisma.imageFile.deleteMany({
      where: { runId }
    });
  }

  /**
   * List image files older than a given date (for PVC retention worker).
   */
  async getImageFilesOlderThan(cutoff: Date): Promise<{ id: number; filePath: string }[]> {
    return this.prisma.imageFile.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true, filePath: true }
    });
  }
}

export const databaseService = new DatabaseService();
