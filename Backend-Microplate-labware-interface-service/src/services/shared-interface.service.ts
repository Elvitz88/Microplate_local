

import { prisma } from '../server';
import { InterfaceFileData, InterfaceFileQuery } from '../types/shared.types';

class SharedInterfaceService {
  
  async getInterfaceFiles(query: InterfaceFileQuery = {}): Promise<InterfaceFileData[]> {
    const { sampleNo, status, limit = 100, offset = 0 } = query;
    
    const where: any = {};
    if (sampleNo) where.sampleNo = sampleNo;
    if (status) where.status = status;

    const files = await prisma.interfaceFile.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });

    return files.map(file => ({
      id: file.id,
      sampleNo: file.sampleNo,
      fileName: file.fileName,
      filePath: file.filePath,
      fileSize: file.fileSize?.toString(),
      status: file.status as any,
      generatedAt: file.generatedAt || undefined,
      deliveredAt: file.deliveredAt || undefined,
      errorMsg: file.errorMsg || undefined,
      createdBy: file.createdBy || undefined,
      createdAt: file.createdAt,
    }));
  }

  
  async getInterfaceFile(id: string): Promise<InterfaceFileData | null> {
    const file = await prisma.interfaceFile.findUnique({
      where: { id },
    });

    if (!file) return null;

    return {
      id: file.id,
      sampleNo: file.sampleNo,
      fileName: file.fileName,
      filePath: file.filePath,
      fileSize: file.fileSize?.toString(),
      status: file.status as any,
      generatedAt: file.generatedAt || undefined,
      deliveredAt: file.deliveredAt || undefined,
      errorMsg: file.errorMsg || undefined,
      createdBy: file.createdBy || undefined,
      createdAt: file.createdAt,
    };
  }

  
  async getInterfaceFilesBySample(sampleNo: string): Promise<InterfaceFileData[]> {
    return this.getInterfaceFiles({ sampleNo });
  }

  
  async getInterfaceFilesByStatus(status: string): Promise<InterfaceFileData[]> {
    return this.getInterfaceFiles({ status });
  }

  
  async countInterfaceFiles(query: InterfaceFileQuery = {}): Promise<number> {
    const { sampleNo, status } = query;
    
    const where: any = {};
    if (sampleNo) where.sampleNo = sampleNo;
    if (status) where.status = status;

    return prisma.interfaceFile.count({ where });
  }

  
  async exists(id: string): Promise<boolean> {
    const count = await prisma.interfaceFile.count({
      where: { id },
    });
    return count > 0;
  }

  
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    bySample: Record<string, number>;
  }> {
    const [total, statusCounts, sampleCounts] = await Promise.all([
      prisma.interfaceFile.count(),
      prisma.interfaceFile.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.interfaceFile.groupBy({
        by: ['sampleNo'],
        _count: { sampleNo: true },
        orderBy: { _count: { sampleNo: 'desc' } },
        take: 10,
      }),
    ]);

    const byStatus = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    const bySample = sampleCounts.reduce((acc, item) => {
      acc[item.sampleNo] = item._count.sampleNo;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      byStatus,
      bySample,
    };
  }
}

export const sharedInterfaceService = new SharedInterfaceService();
