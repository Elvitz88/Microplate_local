import clsx from 'classnames'
import type { WellPrediction } from '../../services/results.service'

type Props = {
  predictions: WellPrediction[]
  columns?: number
}

export default function WellGrid({ predictions, columns = 12 }: Props) {
  
  if (!predictions || !Array.isArray(predictions)) {
    return <div className="text-gray-500 text-sm">No prediction data available</div>;
  }
  
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {predictions.map((p) => {
        const intensity = Math.round(p.confidence * 100)
        return (
          <div
            key={p.id}
            className={clsx(
              'aspect-square rounded-md border transition',
              p.label === 'positive'
                ? 'border-green-200 bg-green-100'
                : 'border-gray-200 bg-gray-100',
              'hover:scale-[1.03]'
            )}
            style={{ opacity: 0.6 + intensity / 200 }}
            title={`${p.label} • ${(p.confidence * 100).toFixed(1)}%`}
          />
        )
      })}
    </div>
  )
}


