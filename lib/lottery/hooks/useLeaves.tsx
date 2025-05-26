import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'
import { parseAbiItem, decodeEventLog } from 'viem'
import { mimcsponge3 } from '@/lib/lottery/utils/mimcsponge'
import { EthLotteryAbi } from '@/abis/eth-lottery'
import { _log } from '@/lib/utils/ts'
import { foundry } from 'viem/chains'
import { ETH_LOTTERY } from '@/lib/utils/constants/addresses'

const LOG_BET_IN_EVENT = parseAbiItem('event LogBetIn(uint256 index, uint256 newHash)')
const LOG_UPDATE_EVENT = parseAbiItem('event LogUpdate(uint256 index, uint256 newRand, uint256 newRoot)')

export function useLeaves({ fromBlock = 0n }: { fromBlock?: bigint }) {
  const publicClient = usePublicClient()

  return useQuery({
    queryKey: ['leaves', fromBlock],
    queryFn: async () => {
      if (!publicClient) throw new Error('No public client')

      const [rawBetIns, rawUpdates] = await Promise.all([
        publicClient.getLogs({
          address: ETH_LOTTERY[foundry.id],
          event: LOG_BET_IN_EVENT,
          fromBlock,
          toBlock: 'latest',
        }),
        publicClient.getLogs({
          address: ETH_LOTTERY[foundry.id],
          event: LOG_UPDATE_EVENT,
          fromBlock,
          toBlock: 'latest',
        }),
      ])

      const betIns = rawBetIns.map(log =>
        decodeEventLog({
          abi: EthLotteryAbi,
          data: log.data,
          topics: log.topics,
        })
      ) as any

      const updates = rawUpdates.map(log =>
        decodeEventLog({
          abi: EthLotteryAbi,
          data: log.data,
          topics: log.topics,
        })
      ) as any

      _log('Decoded BetIns:', betIns)
      _log('Decoded Updates:', updates)

      betIns.sort((a: any, b: any) => (a.args.index as bigint) - (b.args.index as bigint))
      updates.sort((a: any, b: any) => (a.args.index as bigint) - (b.args.index as bigint))

      const leaves: bigint[] = []
      let lastIndex: bigint = -1n
      let lastRand: bigint | undefined
      let lastHash: bigint | undefined

      for (const bet of betIns) {
        const index = bet.args.index as bigint
        const hash = bet.args.newHash as bigint

        const update = updates.find((u: any) => (u.args.index as bigint) >= index)
        if (!update) continue

        const rand = update.args.newRand as bigint
        const leaf = await mimcsponge3(hash, rand, index)

        leaves.push(leaf)
        lastIndex = index
        lastRand = rand
        lastHash = hash
      }

      return {
        index: lastIndex,
        newRand: lastRand,
        newHash: lastHash,
        data: leaves,
        betLogs: betIns
      }
    },
  })
}
