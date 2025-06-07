import { useQuery } from '@tanstack/react-query'
import { useAppKitAccount } from '@reown/appkit/react'
import { usePublicClient } from 'wagmi'
import { FOOM } from '@/lib/utils/constants/addresses'
import { erc20Abi } from 'viem'
import { chain } from '@/lib/utils/constants/addresses'
import { _log } from '@/lib/utils/ts'

export function useFoomBalance() {
  const account = useAppKitAccount()
  const publicClient = usePublicClient()

  return useQuery({
    queryKey: ['foomBalance', account?.address],
    enabled: !!account?.address && !!publicClient,
    queryFn: async () => {
      if (!account?.address || !publicClient) {
        return 0n
      }

      const balance = await publicClient.readContract({
        address: FOOM[chain.id],
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [account.address as `0x${string}`],
      })

      _log('FOOM balance:', balance)

      return balance as bigint
    },
    staleTime: 30_000,
  })
}
