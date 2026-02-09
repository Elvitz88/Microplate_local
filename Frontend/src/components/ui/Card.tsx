import { type PropsWithChildren } from 'react'
import clsx from 'classnames'

type Props = PropsWithChildren<{
  className?: string
}>

export default function Card({ className, children }: Props) {
  return (
    <div className={clsx('bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700', className)}>
      {children}
    </div>
  )
}


