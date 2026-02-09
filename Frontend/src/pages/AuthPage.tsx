import { MdLogin } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { authService } from '../services/auth.service';

export default function AuthPage() {
  const { t } = useTranslation();
  const handleSsoLogin = () => {
    const continueUrl = `${window.location.origin}/auth/sso/callback`;
    window.location.href = authService.getSsoLoginUrl(continueUrl);
  };

  const AuthForm = (
    <div className="w-full lg:w-1/2 p-8 lg:p-12 relative overflow-y-auto max-h-screen">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,38,108,0.08),_transparent_55%)] pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-slate-100 rounded-xl shadow-sm">
            <MdLogin className="w-6 h-6 text-slate-700" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">HAIlytics</h1>
            <p className="text-sm text-slate-500">Analytics-first Hemagglutination Inhibition</p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Secure access</p>
          <h2 className="text-3xl font-semibold text-slate-900 leading-tight">
            Welcome back
          </h2>
          <p className="text-slate-500 max-w-sm">
            Sign in with your corporate Microsoft account to access the Microplate analysis suite.
          </p>
        </div>

        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full !py-3 !text-base flex items-center justify-center gap-3 border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500 bg-white dark:bg-slate-700"
            onClick={handleSsoLogin}
            aria-label="Sign in with Microsoft"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center">
              <svg viewBox="0 0 23 23" aria-hidden="true" className="h-5 w-5">
                <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
                <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
                <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
              </svg>
            </span>
            <span className="text-slate-800 dark:text-slate-100">Sign in with Microsoft</span>
          </Button>
          <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
            <span>SSO only</span>
            <span>Encrypted session</span>
          </div>
        </div>
      </div>
    </div>
  );

  const BrandingPanel = (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B1B4B] via-[#1331A3] to-[#1A66FF]" />
      <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
      <div className="relative z-10 text-white p-12 flex flex-col justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/70">Microplate AI</p>
          <h2 className="text-4xl font-semibold leading-tight mt-6">
            Unlock Insights Instantly
          </h2>
          <p className="text-lg text-white/80 mt-4 max-w-sm">
            Rapid, precise microplate analysis that turns images into confident decisions.
          </p>
        </div>
        <div className="mt-10">
          {/* AI Ethics Notice */}
          <div className="bg-amber-500/20 border border-amber-400/30 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-amber-300 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-100 mb-2">
                  {t('aiEthics.loginNotice.title')}
                </p>
                <p className="text-sm text-white/90 leading-relaxed" dangerouslySetInnerHTML={{
                  __html: t('aiEthics.loginNotice.message')
                }} />
                <p className="text-xs text-amber-200 mt-3 italic">
                  {t('aiEthics.loginNotice.compliance')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center px-6 py-12">
      <div className="max-w-5xl w-full mx-auto">
        <Card className="shadow-[0_30px_80px_rgba(15,23,42,0.2)] border border-white/70 bg-white/90 backdrop-blur overflow-hidden">
          <div className="flex flex-col lg:flex-row min-h-[540px]">
            {BrandingPanel}
            {AuthForm}
          </div>
        </Card>
      </div>
    </div>
  );
}


