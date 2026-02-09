import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { MdSearch, MdBarChart, MdGridOn, MdCheckCircle, MdCancel, MdPercent, MdWarning } from 'react-icons/md';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import WellGrid from '../components/results/WellGrid';
import ConfidenceChart from '../components/results/ConfidenceChart';
import { useSampleResult } from '../hooks/useResults';

export default function ResultsPage() {
  const { sampleNo } = useParams<{ sampleNo: string }>();
  const [activeTab, setActiveTab] = useState<'predict' | 'summary'>('predict');
  const { data: sampleData, isLoading } = useSampleResult(sampleNo);

  if (!sampleNo) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <MdSearch className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Select a Sample</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Choose a sample from the history to view its detailed results.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analysis Results</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Sample ID: <span className="font-semibold text-primary-600">{sampleNo}</span></p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          {}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-1 -mb-px px-6">
            <TabButton icon={MdGridOn} label="Well Predictions" isActive={activeTab === 'predict'} onClick={() => setActiveTab('predict')} />
            <TabButton icon={MdBarChart} label="Summary" isActive={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
          </nav>
        </div>
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Spinner size="lg" />
            </div>
          ) : !sampleData || !sampleData.lastRun ? (
            <div className="text-center py-24">
              <MdWarning className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Results Found</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Prediction results are not available for this sample.</p>
            </div>
          ) : activeTab === 'predict' ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={MdGridOn} title="Total Wells" value={sampleData.lastRun.statistics.totalDetections} />
                <StatCard icon={MdCheckCircle} title="Positive" value={sampleData.lastRun.statistics.positiveCount} className="text-green-500" />
                <StatCard icon={MdCancel} title="Negative" value={sampleData.lastRun.statistics.negativeCount} className="text-red-500" />
                <StatCard icon={MdPercent} title="Avg. Confidence" value={`${(sampleData.lastRun.statistics.averageConfidence * 100).toFixed(1)}%`} />
              </div>
              <Card>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Well Analysis Grid</h3>
                  <WellGrid predictions={sampleData.lastRun.wellPredictions} />
                </div>
              </Card>
            </div>
          ) : (
             <Card>
                <div className="p-5">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Confidence Distribution</h3>
                    <div className="h-80">
                        <ConfidenceChart predictions={sampleData.lastRun.wellPredictions} />
                    </div>
                </div>
            </Card>
          )}
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, title, value, className }: { icon: React.ElementType; title: string; value: number | string, className?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-5 bg-white dark:bg-gray-800 flex items-center gap-5">
      <div className={`rounded-full p-3 bg-gray-100 dark:bg-gray-700 ${className}`}>
        <Icon className={`h-6 w-6 ${className || 'text-gray-600 dark:text-gray-300'}`} />
      </div>
      <div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
        <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{value}</div>
      </div>
    </div>
  );
}

function TabButton({ icon: Icon, label, isActive, onClick }: { icon: React.ElementType; label:string; isActive: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 py-4 px-3 border-b-2 text-sm font-medium ${
                isActive 
                ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
        >
            <Icon className="h-5 w-5" />
            {label}
        </button>
    )
}


