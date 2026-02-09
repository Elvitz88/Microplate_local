import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tsParser from '@typescript-eslint/parser'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import { defineConfig, globalIgnores } from 'eslint/config'

const pluginMap = {
  'jsx-a11y': jsxA11y,
  'react-hooks': reactHooks,
  'react-refresh': reactRefresh,
  '@typescript-eslint': tseslint.plugin ?? tseslint,
}

const normalizeConfigObject = (config) => {
  if (!config || typeof config !== 'object') {
    return config
  }

  const { languageOptions, parserOptions, plugins, ...rest } = config
  const mergedParserOptions = {
    ...(languageOptions?.parserOptions ?? {}),
    ...(parserOptions ?? {}),
  }

  const normalizedLanguageOptions = {
    ...(languageOptions ?? {}),
    ...(Object.keys(mergedParserOptions).length ? { parserOptions: mergedParserOptions } : {}),
  }

  return {
    ...rest,
    ...(Object.keys(normalizedLanguageOptions).length ? { languageOptions: normalizedLanguageOptions } : {}),
    ...(plugins
      ? {
          plugins:
            Array.isArray(plugins)
              ? plugins.reduce((acc, pluginName) => {
                  if (pluginMap[pluginName]) {
                    acc[pluginName] = pluginMap[pluginName]
                  }
                  return acc
                }, {})
              : plugins,
        }
      : {}),
  }
}

const toConfigArray = (config) => {
  if (Array.isArray(config)) {
    return config.flatMap((entry) => toConfigArray(entry))
  }

  if (!config || typeof config !== 'object') {
    return []
  }

  return [normalizeConfigObject(config)]
}

const combinedExtends = [
  ...toConfigArray(js.configs.recommended),
  ...toConfigArray(tseslint.configs.recommended),
  ...toConfigArray(reactHooks.configs['recommended-latest']),
  ...toConfigArray(reactRefresh.configs.vite),
  ...toConfigArray(jsxA11y.configs.recommended),
]

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: combinedExtends,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: globals.browser,
    },
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
    },
  },
  {
    files: ['src/contexts/ThemeContext.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['src/utils/logger.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
])

