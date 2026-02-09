import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { MdDarkMode, MdLightMode, MdPalette, MdSecurity, MdNotifications, MdStorage, MdBackup, MdDelete, MdDownload, MdSave, MdSettings, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md'
import { useTheme } from '../contexts/ThemeContext'

interface SettingsState {
  notifications: {
    email: boolean
    push: boolean
    desktop: boolean
  }
  privacy: {
    profileVisibility: 'public' | 'private'
    showEmail: boolean
    twoFactor: boolean
  }
  data: {
    autoBackup: boolean
    dataRetention: number
    exportFormat: 'json' | 'csv' | 'pdf'
  }
}

interface SettingsMessage {
  type: 'success' | 'error'
  key: string
  fallback?: string
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const translate = (key: string) => t(`settingsPage.${key}`)
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState<SettingsState>({
    notifications: {
      email: true,
      push: true,
      desktop: false
    },
    privacy: {
      profileVisibility: 'private',
      showEmail: false,
      twoFactor: false
    },
    data: {
      autoBackup: true,
      dataRetention: 365,
      exportFormat: 'json'
    }
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<SettingsMessage | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)

  const notificationItems = t('settingsPage.notifications.items', { returnObjects: true }) as Record<
    keyof SettingsState['notifications'],
    { title: string; description: string }
  >
  const profileVisibilityOptions = t('settingsPage.privacy.profileVisibility.options', { returnObjects: true }) as Record<
    SettingsState['privacy']['profileVisibility'],
    string
  >
  const exportFormatOptions = t('settingsPage.data.exportFormat.options', { returnObjects: true }) as Record<
    SettingsState['data']['exportFormat'],
    string
  >
  const themeOptions = t('settingsPage.appearance.options', { returnObjects: true }) as Record<
    'light' | 'dark' | 'system',
    string
  >

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
  }

  const handleNotificationChange = (key: keyof SettingsState['notifications'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }))
  }

  const handlePrivacyChange = (key: keyof SettingsState['privacy'], value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      privacy: { ...prev.privacy, [key]: value }
    }))
  }

  const handleDataChange = (key: keyof SettingsState['data'], value: boolean | number | string) => {
    setSettings(prev => ({
      ...prev,
      data: { ...prev.data, [key]: value }
    }))
  }

  const handleSaveSettings = async () => {
    setLoading(true)
    setMessage(null)
    
    try {
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      setMessage({ type: 'success', key: 'messages.saveSuccess' })
    } catch {
      setMessage({ type: 'error', key: 'messages.saveError' })
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', key: 'messages.passwordRequired' })
      return
    }
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', key: 'messages.passwordMismatch' })
      return
    }

    setLoading(true)
    setMessage(null)
    
    try {
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      setMessage({ type: 'success', key: 'messages.passwordSuccess' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      setMessage({
        type: 'error',
        key: 'messages.passwordError',
        fallback: errorObj?.message
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExportData = () => {
    
    const data = {
      exportDate: new Date().toISOString(),
      settings,
      message: translate('dataActions.exportMessage')
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `microplate-settings-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDeleteAccount = () => {
    if (window.confirm(translate('messages.deleteConfirm'))) {
      
      setMessage({ type: 'error', key: 'messages.deleteNotImplemented' })
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{translate('title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{translate('subtitle')}</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          {message.fallback ? `${translate(message.key)}: ${message.fallback}` : translate(message.key)}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {}
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <MdPalette className="w-5 h-5" />
            {translate('appearance.title')}
          </h3>
          
          <div className="space-y-6">
            {}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {translate('appearance.themeLabel')}
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === 'light'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <MdLightMode className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                  <span className="text-sm font-medium">{themeOptions.light}</span>
                </button>
                
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === 'dark'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <MdDarkMode className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                  <span className="text-sm font-medium">{themeOptions.dark}</span>
                </button>
                
                <button
                  onClick={() => handleThemeChange('system')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === 'system'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <MdSettings className="w-6 h-6 mx-auto mb-2 text-gray-500" />
                  <span className="text-sm font-medium">{themeOptions.system}</span>
                </button>
              </div>
            </div>
          </div>
        </Card>

        {}
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <MdNotifications className="w-5 h-5" />
            {translate('notifications.title')}
          </h3>
          
          <div className="space-y-4">
            {Object.entries(settings.notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {notificationItems[key as keyof SettingsState['notifications']]?.title ?? key}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {notificationItems[key as keyof SettingsState['notifications']]?.description ?? ''}
                  </div>
                </div>
                <button
                  onClick={() => handleNotificationChange(key as keyof SettingsState['notifications'], !value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {}
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <MdSecurity className="w-5 h-5" />
            {translate('privacy.title')}
          </h3>
          
          <div className="space-y-4">
            {}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {translate('privacy.profileVisibility.label')}
              </label>
              <select
                value={settings.privacy.profileVisibility}
                onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Object.entries(profileVisibilityOptions).map(([optionKey, label]) => (
                  <option key={optionKey} value={optionKey}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{translate('privacy.showEmail.title')}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{translate('privacy.showEmail.description')}</div>
              </div>
              <button
                onClick={() => handlePrivacyChange('showEmail', !settings.privacy.showEmail)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.privacy.showEmail ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.privacy.showEmail ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{translate('privacy.twoFactor.title')}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{translate('privacy.twoFactor.description')}</div>
              </div>
              <button
                onClick={() => handlePrivacyChange('twoFactor', !settings.privacy.twoFactor)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.privacy.twoFactor ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.privacy.twoFactor ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>

        {}
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <MdStorage className="w-5 h-5" />
            {translate('data.title')}
          </h3>
          
          <div className="space-y-4">
            {}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{translate('data.autoBackup.title')}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{translate('data.autoBackup.description')}</div>
              </div>
              <button
                onClick={() => handleDataChange('autoBackup', !settings.data.autoBackup)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.data.autoBackup ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.data.autoBackup ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {translate('data.dataRetention.label')}
              </label>
              <Input
                type="number"
                value={settings.data.dataRetention}
                onChange={(e) => handleDataChange('dataRetention', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {translate('data.exportFormat.label')}
              </label>
              <select
                value={settings.data.exportFormat}
                onChange={(e) => handleDataChange('exportFormat', e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Object.entries(exportFormatOptions).map(([optionKey, label]) => (
                  <option key={optionKey} value={optionKey}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </div>

      {}
      <Card className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <MdLock className="w-5 h-5" />
          {translate('password.title')}
        </h3>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="relative">
            <Input
              type={showPasswords ? 'text' : 'password'}
              placeholder={translate('password.current')}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPasswords ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
            </button>
          </div>
          
          <div className="relative">
            <Input
              type={showPasswords ? 'text' : 'password'}
              placeholder={translate('password.new')}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPasswords ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
            </button>
          </div>
          
          <Button 
            onClick={handleChangePassword} 
            disabled={loading || !currentPassword || !newPassword}
            className="flex items-center gap-2"
          >
            <MdSave className="w-4 h-4" />
            {loading ? translate('password.loading') : translate('password.button')}
          </Button>
        </div>
      </Card>

      {}
      <Card className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <MdBackup className="w-5 h-5" />
          {translate('dataActions.title')}
        </h3>
        
        <div className="grid md:grid-cols-3 gap-4">
          <Button 
            onClick={handleExportData}
            variant="outline" 
            className="flex items-center gap-2"
          >
            <MdDownload className="w-4 h-4" />
            {translate('dataActions.export')}
          </Button>
          
          <Button 
            onClick={handleSaveSettings}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <MdSave className="w-4 h-4" />
            {loading ? translate('dataActions.saveLoading') : translate('dataActions.save')}
          </Button>
          
          <Button 
            onClick={handleDeleteAccount}
            variant="outline"
            className="flex items-center gap-2 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
          >
            <MdDelete className="w-4 h-4" />
            {translate('dataActions.delete')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
