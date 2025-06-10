import { useQuery } from '@tanstack/react-query'
import indexer from '@/lib/indexer'

export function useLastPrayers() {
  return useQuery({
    queryKey: ['lastPrayers'],
    queryFn: async () => {
      const res = await indexer.get('/lottery/prayers')
      return res.data
    },
    staleTime: 4_000,
  })
}
