import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'
import { parseAbiItem, decodeEventLog } from 'viem'
import { mimcsponge2 } from '@/lib/lottery/utils/mimcsponge'
import { ETH_LOTTERY_ADDRESS } from '@/lib/utils/constants/evm'
import { EthLotteryAbi } from '@/abis/eth-lottery'
import { _log } from '@/lib/utils/ts'

const LOG_BET_HASH_EVENT = parseAbiItem('event LogBetHash(uint256 index, uint256 newRand, uint256 newHash)')
const LOG_BET_IN_EVENT = parseAbiItem('event LogBetIn(uint256 index, uint256 newHash)')

export function useLeaves({ fromBlock = 0n }: { fromBlock?: bigint }) {
  const publicClient = usePublicClient()

  return useQuery({
    queryKey: ['leaves', fromBlock],
    queryFn: async () => {
      if (!publicClient) throw new Error('No public client')

      const [rawBetIns, rawBetHashes] = await Promise.all([
        publicClient.getLogs({
          address: ETH_LOTTERY_ADDRESS,
          event: LOG_BET_IN_EVENT,
          fromBlock,
          toBlock: 'latest',
        }),
        publicClient.getLogs({
          address: ETH_LOTTERY_ADDRESS,
          event: LOG_BET_HASH_EVENT,
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
      )
      const betHashes = rawBetHashes.map(log =>
        decodeEventLog({
          abi: EthLotteryAbi,
          data: log.data,
          topics: log.topics,
        })
      )

      _log('Decoded BetIns:', betIns)
      _log('Decoded BetHashes:', betHashes)

      const leaves: bigint[] = []
      let lastIndex: bigint = -1n
      let lastRand: bigint | undefined
      let lastHash: bigint | undefined

      for (const log of betHashes) {
        const {
          index,
          newRand: rand,
          newHash: hash,
        } = log.args as any as {
          index: bigint
          newRand: bigint
          newHash: bigint
        }

        const leaf = await mimcsponge2(hash, rand + index)
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
      }
    },
  })
}
