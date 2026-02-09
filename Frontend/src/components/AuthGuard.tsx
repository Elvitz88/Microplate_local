import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/auth.service'
import { logger } from '../utils/logger'

type Props = {
  children: React.ReactNode
}

export default function AuthGuard({ children }: Props) {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      logger.debug('AuthGuard: Checking authentication...')
      
      const token = authService.loadTokenFromStorage()
      logger.debug('AuthGuard: Token present:', !!token)
      
      if (!token) {
        logger.debug('AuthGuard: No token, redirecting to auth')
        setIsAuthenticated(false)
        navigate('/auth', { replace: true })
        return
      }
      
      
      const isValid = authService.isTokenValid()
      logger.debug('AuthGuard: Token valid:', isValid)
      
      if (!isValid) {
        logger.debug('AuthGuard: Token invalid, trying to refresh...')
        
        try {
          await authService.refreshToken()
          logger.debug('AuthGuard: Token refreshed successfully')
          setIsAuthenticated(true)
        } catch (error) {
          logger.error('AuthGuard: Token refresh failed, logging out', error)
          
          authService.logout()
          setIsAuthenticated(false)
          navigate('/auth', { replace: true })
        }
        return
      }
      
      logger.debug('AuthGuard: Authentication successful')
      setIsAuthenticated(true)
    }

    checkAuth()
  }, [navigate])

  
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    )
  }

  
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
