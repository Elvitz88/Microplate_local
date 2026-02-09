declare module 'csv-writer' {
  interface CsvWriter<T> {
    writeRecords(records: T[]): Promise<void>;
  }

  interface CsvHeader<T> {
    id: keyof T & string;
    title: string;
  }

  interface ObjectCsvWriterOptions<T> {
    path: string;
    header: CsvHeader<T>[];
    fieldDelimiter?: string;
    recordDelimiter?: string;
    alwaysQuote?: boolean;
  }

  export function createObjectCsvWriter<T = any>(options: ObjectCsvWriterOptions<T>): CsvWriter<T>;
  export function createArrayCsvWriter<T = any>(options: { path: string; header?: string[]; fieldDelimiter?: string; recordDelimiter?: string; alwaysQuote?: boolean }): CsvWriter<T>;
}
