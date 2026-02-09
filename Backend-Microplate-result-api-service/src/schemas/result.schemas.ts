import { z } from 'zod';

export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const SampleNoSchema = z.string().min(1).max(50);
export const RunIdSchema = z.coerce.number().positive();

export type StatisticsFilters = {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: 'day' | 'week' | 'month';
};

