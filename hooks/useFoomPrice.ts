import { useQuery } from '@tanstack/react-query'
import foomApi from '@/lib/foomApi'
import { isRemote } from '@/lib/utils/environment'
import { _warn } from '@/lib/utils/ts'
import indexer from '@/lib/indexer'

const FOOM_PRICE_DEFAULT = 9.42021586255562e-8

export function useFoomPrice() {
  return useQuery({
    queryKey: ['foomPrice'],
    queryFn: async () => {
      if (!isRemote()) {
        _warn('Returning cached FOOM price, foom-api is not available for local environment')
        return FOOM_PRICE_DEFAULT
      }
      try {
        const res = await indexer.get('/api/price')
        return res.data.foomPrice
      } catch (error) {
        _warn('Error fetching FOOM price, returning default', error)
        return FOOM_PRICE_DEFAULT
      }
    },
    staleTime: 60_000,
  })
}
