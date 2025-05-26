import indexer from '@/lib/indexer'
import { useQuery } from '@tanstack/react-query'

export function useLeaves({ fromBlock = 0n }: { fromBlock?: bigint }) {
  return useQuery({
    queryKey: ['leaves', fromBlock],
    queryFn: async () => {
      const response = await indexer.get('/lottery/leaves', {
        params: {
          fromBlock: fromBlock.toString(),
        },
      })

      return response.data
    },
  })
}
