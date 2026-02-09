import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authService } from '../services/auth.service'
import logger from '../utils/logger'

export default function SsoCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [message, setMessage] = useState('Completing sign in...')

  useEffect(() => {
    // TOKEN-BASED SSO: Backend sends tokens via URL parameters
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')

    if (!accessToken) {
      setMessage('Missing SSO tokens.')
      logger.error('SSO callback failed: No access token in URL')
      return
    }

    const finalize = async () => {
      try {
        // Store tokens in localStorage
        localStorage.setItem('access_token', accessToken)
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken)
        }

        // Set tokens for all API services
        authService.setTokensForAllServices(accessToken)

        // Dispatch storage event for other components
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'access_token',
          newValue: accessToken,
          storageArea: localStorage
        }))

        logger.info('SSO login successful, tokens stored')
        navigate('/capture', { replace: true })
      } catch (error) {
        logger.error('SSO callback failed', { error })
        setMessage('SSO login failed.')
      }
    }

    finalize()
  }, [navigate, searchParams])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </div>
  )
}
