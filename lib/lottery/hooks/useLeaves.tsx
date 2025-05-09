import { ETH_LOTTERY_ADDRESS } from '@/lib/utils/constants/evm'
import { useQuery } from '@tanstack/react-query'
import { parseAbiItem } from 'viem'
import { usePublicClient } from 'wagmi'

const LOG_BET_HASH_EVENT = parseAbiItem('event LogBetHash(uint256 index, uint256 rand, uint256 leaf)')
const LOG_BET_IN_EVENT = parseAbiItem('event LogBetIn(uint256 index, uint256 R, uint256 C)')

export function useLeaves({ fromBlock = 0n, inR, inC }: { fromBlock?: bigint; inR?: bigint; inC?: bigint }) {
  const publicClient = usePublicClient()

  return useQuery({
    queryKey: ['leaves', fromBlock, inR, inC],
    queryFn: async () => {
      if (!publicClient) {
        throw new Error('No public client')
      }

      if (inR === undefined && inC === undefined) {
        return null
      }

      const [betIns, betHashes] = await Promise.all([
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

      const match = betIns.find((log: any) => log.args.R === inR && log.args.C === inC)

      if (!match) {
        throw new Error('Matching LogBetIn not found')
      }

      const targetIndex = match.args.index

      const leaves: bigint[] = []
      let rand: bigint | undefined
      let leaf: bigint | undefined

      for (const log of betHashes) {
        if (log.args.leaf !== undefined) {
          leaves.push(log.args.leaf)
        }
        if (log.args.index === targetIndex) {
          rand = log.args.rand
          leaf = log.args.leaf
        }
      }

      if (!rand || !leaf) {
        throw new Error('Matching LogBetHash not found')
      }

      return {
        index: targetIndex,
        rand,
        leaf,
        data: leaves,
      }
    },
  })
}
