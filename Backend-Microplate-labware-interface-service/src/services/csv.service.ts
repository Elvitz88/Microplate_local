import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { logger } from '../utils/logger';
import { createSampleSummaryService, SampleSummaryData } from './sample-summary.service';

interface CsvRow {
  SAMPLE_NUMBER: string;
  TEST_NUMBER: string;
  REPORTED_NAME: string | number;
  ENTRY: number;
}

class CsvService {
  private tempDir: string;
  private sampleSummaryService: any;

  constructor() {
    this.tempDir = process.env['TEMP_DIR'] || '/tmp/interface-files';
    this.ensureTempDir();
    
    
    this.sampleSummaryService = createSampleSummaryService({
      resultApiServiceUrl: process.env['RESULT_API_SERVICE_URL'] || 'http://localhost:6403',
      token: process.env['SERVICE_TOKEN'] || 'default-token',
      timeout: 10000,
    });
  }

  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async generateInterfaceFile(sampleNo: string, testNumber?: string): Promise<{
    filePath: string;
    fileName: string;
    fileSize: number;
  }> {
    try {
      const sampleSummary: SampleSummaryData = await this.sampleSummaryService.getSampleSummary(sampleNo);

      
      const summary = sampleSummary.summary;
      const distribution = summary?.distribution || {};
      
      const effectiveTestNumber = testNumber || sampleSummary.submissionNo || sampleNo;
      const csvData = this.generateCsvData(sampleNo, distribution, effectiveTestNumber);

      const now = new Date();
      const timestamp = now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');
      
      const fileName = `interface_${sampleNo}_${timestamp}.csv`;
      const filePath = path.join(this.tempDir, fileName);

      
      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
          { id: 'SAMPLE_NUMBER', title: 'SAMPLE_NUMBER' },
          { id: 'TEST_NUMBER', title: 'TEST_NUMBER' },
          { id: 'REPORTED_NAME', title: 'REPORTED_NAME' },
          { id: 'ENTRY', title: 'ENTRY' },
        ],
      });

      await csvWriter.writeRecords(csvData);

      
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      logger.info(`CSV file generated: ${fileName}`, { fileSize });

      return {
        filePath,
        fileName,
        fileSize,
      };
    } catch (error) {
      logger.error('Failed to generate CSV file', { error });
      throw error;
    }
  }

  private generateCsvData(sampleNo: string, distribution: any, testNumber: string): CsvRow[] {
    const csvData: CsvRow[] = [];
    
    
    let total = 0;
    for (let row = 0; row <= 12; row++) {
      const rowValue = distribution[row.toString()] || 0;
      total += rowValue;
    }
    
    
    csvData.push({
      SAMPLE_NUMBER: sampleNo,
      TEST_NUMBER: testNumber,
      REPORTED_NAME: 'No.',
      ENTRY: total,
    });
    
    
    for (let row = 0; row <= 12; row++) {
      const rowValue = distribution[row.toString()] || 0;
      csvData.push({
        SAMPLE_NUMBER: sampleNo,
        TEST_NUMBER: testNumber,
        REPORTED_NAME: row,
        ENTRY: rowValue,
      });
    }
    
    return csvData;
  }

  async cleanupFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info('Temporary file cleaned up', { filePath });
      }
    } catch (error) {
      logger.error(`Failed to cleanup file ${filePath}`, { error });
    }
  }

  async cleanupOldFiles(maxAgeHours: number = 24): Promise<void> {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          logger.info('Cleaned up old file', { file });
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup old files', { error });
    }
  }
}

export const csvService = new CsvService();
