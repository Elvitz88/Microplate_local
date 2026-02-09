import { type ButtonHTMLAttributes } from 'react'
import clsx from 'classnames'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost'
  loading?: boolean
}

export default function Button({
  className,
  children,
  variant = 'primary',
  loading = false,
  disabled,
  ...props
}: Props) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium select-none',
        'transition ease-out duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
        'shadow-sm hover:shadow-md active:scale-[0.98]',
        variant === 'primary' && 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-600 shadow-md dark:bg-primary-600 dark:text-white dark:hover:bg-primary-700',
        variant === 'outline' && 'border border-gray-400 dark:border-gray-600 text-gray-800 dark:text-white bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-gray-400 dark:focus:ring-gray-300',
        variant === 'ghost' && 'text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-gray-300 dark:focus:ring-gray-400',
        className,
      )}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-label={loading ? 'Loading…' : props['aria-label']}
      {...props}
    >
      {children}
    </button>
  )
}


