import { EthLotteryAbi } from '@/abis/eth-lottery'
import { ETH_LOTTERY_ADDRESS } from '@/lib/utils/constants/evm'
import { PublicClient } from 'viem'

export async function getLotteryStatus(publicClient: PublicClient): Promise<[bigint, bigint, bigint, bigint]> {
  return (await publicClient.readContract({
    address: ETH_LOTTERY_ADDRESS,
    abi: EthLotteryAbi,
    functionName: 'getStatus',
  })) as [bigint, bigint, bigint, bigint]
}
