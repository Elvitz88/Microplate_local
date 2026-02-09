import { useQuery } from '@tanstack/react-query'
import { resultsService } from '../services/results.service'

type SampleResult = Awaited<ReturnType<typeof resultsService.getSample>>

export function useSampleResult(sampleNo?: string) {
  return useQuery<SampleResult>({
    queryKey: ['sampleResult', sampleNo],
    queryFn: () => {
      if (!sampleNo) throw new Error('No sample number')
      return resultsService.getSample(sampleNo)
    },
    enabled: !!sampleNo,
  })
}


