import logger from '../utils/logger'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  actualTheme: 'light' | 'dark'
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme
    return saved || 'system'
  })

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme') as Theme
    const currentTheme = saved || 'system'
    
    if (currentTheme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return currentTheme
  })

  useEffect(() => {
    const root = document.documentElement
    logger.debug('ThemeContext: Applying theme:', theme)

    let cleanup: (() => void) | undefined

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      const applySystemTheme = (isDark: boolean) => {
        logger.debug('ThemeContext: System preference apply:', isDark)
        setActualTheme(isDark ? 'dark' : 'light')
        root.classList.toggle('dark', isDark)
      }

      applySystemTheme(mediaQuery.matches)

      const handleChange = (e: MediaQueryListEvent) => {
        logger.debug('ThemeContext: System preference changed:', e.matches)
        applySystemTheme(e.matches)
      }

      mediaQuery.addEventListener('change', handleChange)
      cleanup = () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      const isDark = theme === 'dark'
      logger.debug('ThemeContext: Manual theme:', theme, 'isDark:', isDark)

      setActualTheme(theme)
      root.classList.toggle('dark', isDark)
    }

    return cleanup
  }, [theme])

  useEffect(() => {
    localStorage.setItem('theme', theme)
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: theme }))
  }, [theme])

  const isDark = actualTheme === 'dark'

  const value: ThemeContextType = {
    theme,
    setTheme,
    actualTheme,
    isDark
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
