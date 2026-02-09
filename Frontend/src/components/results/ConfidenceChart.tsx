import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import type { WellPrediction } from '../../services/results.service'

type Props = {
  predictions: WellPrediction[]
}

export default function ConfidenceChart({ predictions }: Props) {
  const bins = Array.from({ length: 10 }, (_, i) => ({
    bucket: `${i * 10}-${(i + 1) * 10}%`,
    count: 0,
  }))
  
  if (predictions && Array.isArray(predictions)) {
    predictions.forEach((p) => {
      const idx = Math.min(9, Math.floor(p.confidence * 10))
      bins[idx].count += 1
    })
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bins}>
          <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}


