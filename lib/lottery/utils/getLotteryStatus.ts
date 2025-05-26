import { EthLotteryAbi } from '@/abis/eth-lottery'
import { ETH_LOTTERY } from '@/lib/utils/constants/addresses'
import { PublicClient } from 'viem'
import { foundry } from 'viem/chains'

export async function getLotteryStatus(publicClient: PublicClient): Promise<[bigint, bigint, bigint, bigint]> {
  return (await publicClient.readContract({
    address: ETH_LOTTERY[foundry.id],
    abi: EthLotteryAbi,
    functionName: 'getStatus',
  })) as [bigint, bigint, bigint, bigint]
}
