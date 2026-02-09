import { forwardRef, type InputHTMLAttributes } from 'react'
import clsx from 'classnames'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  error?: string
  label?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { className, error, label, helperText, leftIcon, rightIcon, ...props },
  ref,
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="text-gray-400">{leftIcon}</div>
          </div>
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all duration-200',
            'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'hover:border-gray-400 dark:hover:border-gray-500',
            error 
              ? 'border-red-500 focus:ring-2 focus:ring-red-500/20 focus:border-red-500' 
              : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
            leftIcon ? 'pl-10' : '',
            rightIcon ? 'pr-10' : '',
            className,
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="text-gray-400">{rightIcon}</div>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  )
})

export default Input


