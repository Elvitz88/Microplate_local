

export interface InterfaceFileData {
  id: string;
  sampleNo: string;
  fileName: string;
  filePath: string;
  fileSize: string | undefined;
  status: 'pending' | 'generated' | 'delivered' | 'failed';
  generatedAt: Date | undefined;
  deliveredAt: Date | undefined;
  errorMsg: string | undefined;
  createdBy: string | undefined;
  createdAt: Date;
}

export interface InterfaceFileQuery {
  sampleNo?: string;
  status?: string;
  limit?: number;
  offset?: number;
}
