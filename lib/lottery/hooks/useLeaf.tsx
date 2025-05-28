import { useQuery } from '@tanstack/react-query'
import { leavesDB } from '@/lib/db/leavesDb'

export function useLeaf(index: number) {
  return useQuery({
    queryKey: ['leaf', index],
    queryFn: async () => {
      const leaf = await leavesDB.leaves.get(index)

      return leaf
    },
    enabled: index !== undefined,
  })
}
