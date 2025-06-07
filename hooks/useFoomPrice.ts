import { useQuery } from '@tanstack/react-query'
import foomApi from '@/lib/foomApi'
import { isRemote } from '@/lib/utils/environment'
import { _warn } from '@/lib/utils/ts'

export function useFoomPrice() {
  return useQuery({
    queryKey: ['foomPrice'],
    queryFn: async () => {
      if (!isRemote()) {
        _warn('Returning cached FOOM price, foom-api is not available for local environment')
        return 9.42021586255562e-8
      }
      const res = await foomApi.get('/stats/price')
      return res.data.foomPrice
    },
    staleTime: 60_000,
  })
}
