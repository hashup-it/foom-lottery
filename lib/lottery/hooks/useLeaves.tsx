import { useQuery } from '@tanstack/react-query'

/**
 * TODO: Accept a single path -> path fetcher with caching into dexiejs
 */
export function useLeaves({ fromBlock = 0n }: { fromBlock?: bigint }) {
  return useQuery({
    queryKey: ['leaves', fromBlock],
    queryFn: async () => {
      // const response = await indexer.get('/lottery/leaves', {
      //   params: {
      //     fromBlock: fromBlock.toString(),
      //   },
      // })

      // const { data } = response.data

      // if (Array.isArray(data)) {
      //   await leavesDB.leaves.bulkPut(data)
      // }

      // return response.data

      return []
    },
  })
}
