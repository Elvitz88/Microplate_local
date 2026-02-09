import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  MdDashboard, 
  MdScience, 
  MdPerson, 
  MdSettings, 
  MdNotifications,
  MdQrCodeScanner,
  MdUpload,
  MdVideocam,
  MdVideocamOff,
  MdTableChart,
  MdDownload,
  MdInfo,
  MdCheckCircle,
  MdWarning,
  MdError,
  MdArrowBack,
  MdExpandMore,
  MdExpandLess,
  MdKeyboardArrowRight
} from 'react-icons/md';
import type { IconType } from 'react-icons';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

interface GuideSectionContent {
  id: string;
  icon: string;
  title: string;
  description: string;
  steps: string[];
  tips?: string[];
  warnings?: string[];
}

interface FeatureCardContent {
  id: string;
  icon: string;
  title: string;
  description: string;
  color: string;
}

interface TroubleshootingSection {
  id: string;
  color: string;
  title: string;
  description: string;
  items: string[];
}

interface TroubleshootingContent {
  title: string;
  sections: TroubleshootingSection[];
  cta: {
    title: string;
    description: string;
    primary: string;
    secondary: string;
  };
}

const iconMap: Record<string, IconType> = {
  dashboard: MdDashboard,
  science: MdScience,
  person: MdPerson,
  settings: MdSettings,
  notifications: MdNotifications,
  qr: MdQrCodeScanner,
  upload: MdUpload,
  camera: MdVideocam,
  cameraOff: MdVideocamOff,
  table: MdTableChart,
  download: MdDownload,
  info: MdInfo
};

const featureColorMap: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  indigo: 'bg-indigo-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  teal: 'bg-teal-500',
  red: 'bg-red-500',
  cyan: 'bg-cyan-500'
};

const troubleshootingAccentMap: Record<string, { border: string; icon: string }> = {
  red: { border: 'border-red-500', icon: 'text-red-500' },
  yellow: { border: 'border-yellow-500', icon: 'text-yellow-500' },
  blue: { border: 'border-blue-500', icon: 'text-blue-500' },
  green: { border: 'border-green-500', icon: 'text-green-500' },
  purple: { border: 'border-purple-500', icon: 'text-purple-500' },
  orange: { border: 'border-orange-500', icon: 'text-orange-500' }
};

export default function UserGuidePage() {
  const { t } = useTranslation();
  const translate = (key: string, options?: Record<string, unknown>) => t(`userGuide.${key}`, options);
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState<string | null>('overview');
  const [activeTab, setActiveTab] = useState<'guide' | 'features' | 'troubleshooting' | 'ethics'>('guide');

  const rawGuideSections = translate('guideSections', { returnObjects: true }) as unknown;
  const guideSections = Array.isArray(rawGuideSections) ? rawGuideSections as GuideSectionContent[] : [];

  const rawFeatureCards = translate('features', { returnObjects: true }) as unknown;
  const featureCards = Array.isArray(rawFeatureCards) ? rawFeatureCards as FeatureCardContent[] : [];

  const rawTroubleshooting = translate('troubleshooting', { returnObjects: true }) as unknown;
  const troubleshootingContent =
    rawTroubleshooting && typeof rawTroubleshooting === 'object' && !Array.isArray(rawTroubleshooting)
      ? rawTroubleshooting as TroubleshootingContent
      : undefined;

  const troubleshootingSections = troubleshootingContent?.sections ?? [];
  const troubleshootingCta = troubleshootingContent?.cta;

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const FeatureCard = ({ iconKey, title, description, colorKey }: {
    iconKey: string;
    title: string;
    description: string;
    colorKey: string;
  }) => {
    const IconComponent = iconMap[iconKey] ?? MdInfo;
    const backgroundClass = featureColorMap[colorKey] ?? featureColorMap.blue;

    return (
      <Card className="p-6 hover:shadow-lg transition-shadow duration-200">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${backgroundClass}`}>
            <IconComponent className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {description}
            </p>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <MdArrowBack className="h-5 w-5" />
              {translate('back')}
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                📚 {translate('title')}
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                {translate('subtitle')}
              </p>
            </div>
          </div>

          {}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'guide'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {translate('tabs.guide')}
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'features'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {translate('tabs.features')}
            </button>
            <button
              onClick={() => setActiveTab('troubleshooting')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'troubleshooting'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {translate('tabs.troubleshooting')}
            </button>
            <button
              onClick={() => setActiveTab('ethics')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'ethics'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {translate('tabs.ethics')}
            </button>
          </div>
        </div>

        {}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            {guideSections.map((section) => {
              const SectionIcon = iconMap[section.icon] ?? MdInfo;
              return (
                <Card key={section.id} className="overflow-hidden">
                  <button
                    type="button"
                    className="w-full text-left p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onClick={() => toggleSection(section.id)}
                    aria-expanded={expandedSection === section.id}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-400">
                          <SectionIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {section.title}
                          </h2>
                          <p className="text-gray-600 dark:text-gray-400">
                            {section.description}
                          </p>
                        </div>
                      </div>
                      {expandedSection === section.id ? (
                        <MdExpandLess className="h-6 w-6 text-gray-400" />
                      ) : (
                        <MdExpandMore className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {expandedSection === section.id && (
                    <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
                      <div className="pt-6 space-y-6">
                        {}
                        {section.steps && section.steps.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                              <MdKeyboardArrowRight className="h-5 w-5 text-blue-600" />
                              {translate('sectionHeaders.steps')}
                            </h3>
                            <div className="space-y-3">
                              {section.steps.map((step, index) => (
                                <div key={index} className="flex items-start gap-3">
                                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                      {index + 1}
                                    </span>
                                  </div>
                                  <p className="text-gray-700 dark:text-gray-300">
                                    {step}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {}
                        {section.tips && section.tips.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                              <MdInfo className="h-5 w-5 text-green-600" />
                              {translate('sectionHeaders.tips')}
                            </h3>
                            <div className="space-y-2">
                              {section.tips.map((tip, index) => (
                                <div key={index} className="flex items-start gap-3">
                                  <MdCheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                  <p className="text-gray-700 dark:text-gray-300">
                                    {tip}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {}
                        {section.warnings && section.warnings.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                              <MdWarning className="h-5 w-5 text-yellow-600" />
                              {translate('sectionHeaders.warnings')}
                            </h3>
                            <div className="space-y-2">
                              {section.warnings.map((warning, index) => (
                                <div key={index} className="flex items-start gap-3">
                                  <MdError className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                  <p className="text-gray-700 dark:text-gray-300">
                                    {warning}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === 'features' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureCards.map((feature) => (
              <FeatureCard
                key={feature.id}
                iconKey={feature.icon}
                title={feature.title}
                description={feature.description}
                colorKey={feature.color}
              />
            ))}
          </div>
        )}

        {activeTab === 'troubleshooting' && (
          <div className="space-y-6">
            {troubleshootingContent && (
              <Card className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  {troubleshootingContent.title}
                </h2>
                
                <div className="space-y-6">
                  {troubleshootingSections.map((section) => {
                    const accent = troubleshootingAccentMap[section.color] ?? troubleshootingAccentMap.blue;
                    return (
                      <div key={section.id} className={`border-l-4 ${accent.border} pl-4`}>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          {section.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-3">
                          {section.description}
                        </p>
                        {section.items && section.items.length > 0 && (
                          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                            {section.items.map((item, index) => (
                              <li key={index}>{item}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {troubleshootingCta && (
              <Card className="p-6 bg-blue-50 dark:bg-blue-900/20">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {troubleshootingCta.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {troubleshootingCta.description}
                </p>
                <div className="flex gap-4">
                  <Button variant="primary">
                    {troubleshootingCta.primary}
                  </Button>
                  <Button variant="outline">
                    {troubleshootingCta.secondary}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* AI Ethics Tab */}
        {activeTab === 'ethics' && (
          <div className="space-y-6">
            <Card className="p-8">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  {t('aiEthics.title')}
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  {t('aiEthics.subtitle')}
                </p>
              </div>

              {/* Human-in-the-Loop */}
              <div className="mb-8 p-6 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded-r-lg">
                <div className="flex items-start gap-4">
                  <MdWarning className="h-8 w-8 text-amber-600 dark:text-amber-400 shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {t('aiEthics.humanDecision.title')}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed" dangerouslySetInnerHTML={{
                      __html: t('aiEthics.humanDecision.intro')
                    }} />
                    <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                      {(t('aiEthics.humanDecision.responsibilities', { returnObjects: true }) as string[]).map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Thailand AI Ethics Guidelines */}
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                  <span className="text-3xl">🇹🇭</span>
                  {t('aiEthics.guidelines.title')}
                </h3>

                <div className="grid gap-4">
                  {(t('aiEthics.guidelines.principles', { returnObjects: true }) as Array<{number: string, title: string, description: string}>).map((principle, idx: number) => {
                    const colors = [
                      { border: 'border-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
                      { border: 'border-green-500', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
                      { border: 'border-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' },
                      { border: 'border-red-500', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' },
                      { border: 'border-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400' }
                    ];
                    const color = colors[idx] || colors[0];

                    return (
                      <div key={idx} className={`p-5 border-l-4 ${color.border} ${color.bg} rounded-r-lg`}>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                          <span className={color.text}>{principle.number}.</span>
                          {principle.title}
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300">
                          {principle.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Best Practices */}
              <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <MdCheckCircle className="h-6 w-6 text-green-600" />
                  {t('aiEthics.bestPractices.title')}
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  {(t('aiEthics.bestPractices.items', { returnObjects: true }) as string[]).map((item: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400 shrink-0">✓</span>
                      <span className="text-gray-700 dark:text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reference */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong className="text-blue-900 dark:text-blue-200">{t('aiEthics.reference.prefix')}</strong> {t('aiEthics.reference.text')}
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
