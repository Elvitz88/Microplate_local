
import { useTranslation } from 'react-i18next';
import Card from '../ui/Card';
import { MdCheckCircle, MdError, MdAccessTime, MdImage } from 'react-icons/md';
import Spinner from '../ui/Spinner';

export interface ScanHistoryItem {
  id: string;
  sampleNo: string;
  submissionNo?: string;
  description?: string;
  timestamp: Date;
  status: 'pending' | 'success' | 'error' | 'queued';
  imageUrl?: string;
  message?: string;
}

interface ScanHistoryProps {
  items: ScanHistoryItem[];
  className?: string;
}

export default function ScanHistory({ items, className = '' }: ScanHistoryProps) {
  const { t } = useTranslation();

  const getStatusIcon = (status: ScanHistoryItem['status']) => {
    switch (status) {
      case 'success':
        return <MdCheckCircle className="h-5 w-5 text-green-500" />;
      case 'queued':
        return <div className="h-5 w-5 flex items-center justify-center"><div className="animate-pulse h-2 w-2 bg-blue-500 rounded-full" /></div>;
      case 'error':
        return <MdError className="h-5 w-5 text-red-500" />;
      case 'pending':
      default:
        return <Spinner size="sm" />;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (items.length === 0) {
    return (
      <Card className={`p-6 flex flex-col items-center justify-center text-gray-500 h-full min-h-[300px] ${className}`}>
        <MdAccessTime className="h-12 w-12 mb-3 text-gray-300" />
        <p className="text-center">{t('capture.resultsPanel.historyEmpty')}</p>
        <p className="text-xs text-gray-400 mt-2">{t('capture.resultsPanel.historyTip')}</p>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden h-full flex flex-col ${className}`}>
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <MdAccessTime className="h-5 w-5 text-gray-500" />
          {t('capture.resultsPanel.sessionHistory')}
          <span className="ml-auto text-xs font-normal text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-0">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((item) => (
            <div key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex gap-3 items-start animate-fade-in">
               <div className="h-12 w-12 rounded bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden flex items-center justify-center border border-gray-200 dark:border-gray-700">
                 {item.imageUrl ? (
                   <img src={item.imageUrl} alt={item.sampleNo} className="h-full w-full object-cover" />
                 ) : (
                   <MdImage className="h-6 w-6 text-gray-300" />
                 )}
               </div>
               <div className="flex-1 min-w-0">
                 <div className="flex items-center justify-between mb-1">
                   <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate" title={`${item.sampleNo}${item.submissionNo ? ` / ${item.submissionNo}` : ''}${item.description ? ` / ${item.description}` : ''}`}>
                     {item.sampleNo}
                     {item.submissionNo && <span className="text-gray-500 font-normal"> / {item.submissionNo}</span>}
                     {item.description && <span className="text-gray-500 font-normal"> / {item.description}</span>}
                   </h4>
                   <span className="text-xs text-gray-400 font-mono whitespace-nowrap ml-2">
                     {formatTime(item.timestamp)}
                   </span>
                 </div>
                 <div className="flex items-center gap-2 text-xs">
                   {getStatusIcon(item.status)}
                   <span className={`truncate ${
                     item.status === 'error' ? 'text-red-600 dark:text-red-400' : 
                     item.status === 'success' ? 'text-green-600 dark:text-green-400' :
                     'text-gray-500'
                   }`}>
                     {item.message || (
                       item.status === 'pending' ? t('capture.uploadCard.status.preparing') :
                       item.status === 'queued' ? t('capture.resultsPanel.statusQueued') :
                       item.status === 'success' ? t('capture.resultsPanel.statusSubmitted') :
                       t('capture.resultsPanel.statusFailed')
                     )}
                   </span>
                 </div>
               </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
