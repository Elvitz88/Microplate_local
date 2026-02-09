import { useSampleResult } from '../../hooks/useResults';
import { useTranslation } from 'react-i18next';
import Card from '../ui/Card';
import logger from '../../utils/logger';

type ImageServiceModule = typeof import('../../services/image.service');
type PredictionResponse = Awaited<ReturnType<ImageServiceModule['imageService']['uploadAndPredict']>>;

interface PredictionResultsProps {
  sampleNo: string;
  predictionData?: PredictionResponse;
  isPredicting: boolean;
  className?: string;
}

const formatCount = (value?: number | null) => {
  if (value === null || value === undefined) return '—';
  if (!Number.isFinite(value)) return '—';
  return value;
};

const formatPercentage = (value?: number | null) => {
  if (value === null || value === undefined) return '—';
  if (!Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
};

export default function PredictionResults({ sampleNo, predictionData, isPredicting, className }: PredictionResultsProps) {
  const prediction = predictionData?.data;
  const statistics = prediction?.statistics;
  const distribution = prediction?.inference_results?.distribution;
  const totalDetections = statistics?.total_detections ?? 0;
  const distributionTotal = typeof distribution?.total === 'number' ? distribution.total : undefined;
  const distributionRows = distribution
    ? Object.entries(distribution)
        .filter(([key]) => key !== 'total')
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    : [];
  const { t, i18n } = useTranslation();
  const tr = (path: string, options?: Record<string, unknown>) =>
    t(`capture.predictionResults.${path}`, options);
  const locale = i18n.language?.startsWith('th') ? 'th-TH' : 'en-US';
  const { data: sampleResult, isLoading: isLoadingSample } = useSampleResult(sampleNo || undefined);
  const latestRun = sampleResult?.lastRun;
  const rawStatus = prediction?.status;
  let statusKey: 'completed' | 'running' | 'failed' | 'noDetections' | 'unknown' = 'unknown';
  if (rawStatus) {
    const normalized = rawStatus.toLowerCase();
    if (normalized.includes('running') || normalized.includes('processing')) {
      statusKey = 'running';
    } else if (normalized.includes('fail') || normalized.includes('error')) {
      statusKey = 'failed';
    } else if (normalized.includes('complete') || normalized.includes('finished')) {
      statusKey = totalDetections > 0 ? 'completed' : 'noDetections';
    } else {
      statusKey = 'completed';
    }
  } else {
    statusKey = 'unknown';
  }

  const statusLabel = tr(`statusLabel.${statusKey}`);
  const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString(locale) : '—');
  const cardClasses = [
    'col-span-12 lg:col-span-4 xl:col-span-4 2xl:col-span-3',
    'p-0 overflow-hidden flex flex-col',
    className || '',
  ]
    .join(' ')
    .trim();

  logger.debug('PredictionResults: prediction data', predictionData);

  return (
    <Card className={cardClasses}>
      <div className="px-5 pt-5 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-wide uppercase">
            {tr('panelTitle')}
          </h3>
        </div>
      </div>
      <div className="space-y-4 p-5 pt-4 flex-1">
        {isPredicting ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">{tr('running')}</p>
          </div>
        ) : prediction ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <div className="bg-gradient-to-r from-emerald-50 via-white to-emerald-50 dark:from-emerald-900/40 dark:via-slate-900 dark:to-emerald-900/20 border border-emerald-200 dark:border-emerald-900 rounded-xl p-4 shadow-sm flex flex-col gap-3 sm:col-span-2 xl:col-span-1">
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-200 tracking-wide uppercase">
                  {tr('statusCardTitle')}
                </div>
                <div className="text-lg font-semibold text-emerald-700 dark:text-emerald-100">
                  {statusLabel}
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex flex-col justify-between">
                <div className="text-xs text-blue-600 dark:text-blue-300 font-medium tracking-wide uppercase">
                  {tr('totalWells')}
                </div>
                <div className="text-lg font-semibold text-blue-700 dark:text-blue-200">
                  {formatCount(statistics?.total_detections)}
                </div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg flex flex-col justify-between">
                <div className="text-xs text-purple-600 dark:text-purple-300 font-medium tracking-wide uppercase">
                  {tr('wellsAnalyzed')}
                </div>
                <div className="text-lg font-semibold text-purple-700 dark:text-purple-200">
                  {formatCount(statistics?.wells_analyzed)}
                </div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg sm:col-span-2 xl:col-span-3">
                <div className="text-xs text-emerald-600 dark:text-emerald-300 font-medium tracking-wide uppercase">
                  {tr('avgConfidence')}
                </div>
                <div className="text-lg font-semibold text-emerald-700 dark:text-emerald-200">
                  {formatPercentage(statistics?.average_confidence)}
                </div>
              </div>
            </div>

            {distributionRows.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-semibold text-gray-900 dark:text-white tracking-wide uppercase">
                  {tr('distributionTitle')}
                </h5>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs text-gray-700 dark:text-gray-200">
                      <thead className="text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                        <tr>
                          <th className="px-4 py-2 text-left sticky top-0 bg-slate-100 dark:bg-slate-900">
                            {tr('distributionHeaderPosition')}
                          </th>
                          <th className="px-4 py-2 text-right sticky top-0 bg-slate-100 dark:bg-slate-900">
                            {tr('distributionHeaderCount')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {distributionRows.map(([label, value]) => (
                          <tr key={label} className="odd:bg-white even:bg-gray-50 dark:odd:bg-slate-900 dark:even:bg-slate-900/40">
                            <td className="px-4 py-2 font-medium">
                              {tr('distributionRow', { row: label })}
                            </td>
                            <td className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-gray-100">{value as number}</td>
                          </tr>
                        ))}
                      </tbody>
                      {distributionTotal !== undefined && (
                        <tfoot>
                          <tr className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                            <td className="px-3 py-2 font-semibold">{tr('distributionTotal')}</td>
                            <td className="px-3 py-2 text-right font-semibold">{distribution?.total as number}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-gray-900 dark:text-white tracking-wide uppercase">
                {tr('historyTitle')}
              </h5>
              {isLoadingSample ? (
                <p className="text-xs text-gray-500">{tr('historyLoading')}</p>
              ) : latestRun ? (
                <div className="bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{tr('historyStatus')}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{latestRun.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{tr('historyPredictedAt')}</span>
                    <span>{formatDateTime(latestRun.predictAt)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                    <div>
                      <div className="text-slate-500">{tr('totalWells')}</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{formatCount(latestRun.statistics.totalDetections)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">{tr('historyPositive')}</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{formatCount(latestRun.statistics.positiveCount)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">{tr('historyNegative')}</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{formatCount(latestRun.statistics.negativeCount)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">{tr('historyAvgConfidence')}</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{formatPercentage(latestRun.statistics.averageConfidence)}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">{tr('historyEmpty')}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">{tr('noDataTitle')}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              {tr('noDataHint')}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
