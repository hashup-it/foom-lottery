import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { useAppKitAccount } from '@reown/appkit/react'
import { useWalletClient, usePublicClient } from 'wagmi'
import { useLotteryContract } from '@/lib/lottery/hooks/useLotteryContract'
import { pedersenHash } from '@/lib/lottery/utils/pedersen'
import { leBigintToBuffer } from '@/lib/lottery/utils/bigint'
import indexer from '@/lib/indexer'
import { _log, _error } from '@/lib/utils/ts'
import type { Address, Hex } from 'viem'
import type { ICommitment } from '@/types/lottery'
import { chain, FOOM } from '@/lib/utils/constants/addresses'
import { erc20Abi } from 'viem'
import { UNISWAP_V3_ROUTER, UNISWAP_V3_ROUTER_ABI, WETH_BASE } from '@/lib/utils/constants/uniswap'

export type PlayArgs = Parameters<ReturnType<typeof useLotteryContract>['playMutation']['mutate']>[0]

interface LotteryContextValue {
  isClient: boolean
  status: string
  setStatus: React.Dispatch<React.SetStateAction<string>>
  commitment: ICommitment | undefined
  setCommitment: React.Dispatch<React.SetStateAction<ICommitment | undefined>>
  tickets: string[]
  redeemHex: string
  setRedeemHex: React.Dispatch<React.SetStateAction<string>>
  lotteryHashes: string[]
  setLotteryHashes: React.Dispatch<React.SetStateAction<string[]>>
  commitIndex: number
  setCommitIndex: React.Dispatch<React.SetStateAction<number>>
  account: ReturnType<typeof useAppKitAccount>
  walletClient: ReturnType<typeof useWalletClient>['data']
  publicClient: ReturnType<typeof usePublicClient>
  playAndPrayMutation: ReturnType<typeof useLotteryContract>['playAndPrayMutation']
  cancelBetMutation: ReturnType<typeof useLotteryContract>['cancelBetMutation']
  collectRewardMutation: ReturnType<typeof useLotteryContract>['collectRewardMutation']
  playMutation: ReturnType<typeof useLotteryContract>['playMutation']
  swapUsdcToWeth: (args: { amountIn: bigint; slippage?: number }) => Promise<void>
  handleRedeem: () => Promise<
    | {
        hash: string
        proof: any
      }
    | undefined
  >
  play: (args: PlayArgs) => void
  handleStatus: (data: string) => void
  recipient: Hex | undefined
  setRecipient: React.Dispatch<React.SetStateAction<Hex | undefined>>
}

const LotteryContext = createContext<LotteryContextValue | undefined>(undefined)

export function useLottery() {
  const ctx = useContext(LotteryContext)
  if (!ctx) throw new Error('useLottery must be used within a LotteryProvider')
  return ctx
}

export const LotteryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isClient, setIsClient] = useState(false)
  const [status, setStatus] = useLocalStorage<string>('lotteryStatus', '')
  const [commitment, setCommitment] = useState<ICommitment>()
  const [recipient, setRecipient] = useState<Hex>()
  const [tickets] = useLocalStorage<string[]>('lotteryTickets', [])
  const [redeemHex, setRedeemHex] = useState<string>(process.env.NEXT_PUBLIC_TEMP_TICKET || '')
  const [lotteryHashes, setLotteryHashes] = useState<string[]>([])
  const [commitIndex, setCommitIndex] = useState<number>(lotteryHashes.length)

  const account = useAppKitAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const handleStatus = useCallback((data: string) => setStatus(prev => `> ${data}${prev ? '\n\n' + prev : ''}`), [])
  const { playAndPrayMutation, cancelBetMutation, collectRewardMutation, playMutation } = useLotteryContract({
    onStatus: handleStatus,
  })

  const play = useCallback(
    (args: PlayArgs) => {
      playMutation.mutate(args)
    },
    [playMutation]
  )

  const swapUsdcToWeth = useCallback(
    async ({ amountIn }: { amountIn: bigint; slippage?: number }) => {
      try {
        if (!walletClient || !account?.address || !publicClient) {
          setStatus('Wallet not connected')
          return
        }
        const allowance: bigint = await publicClient.readContract({
          address: WETH_BASE,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [account.address as `0x${string}`, UNISWAP_V3_ROUTER],
        })
        if (allowance < amountIn) {
          setStatus('Approving WETH...')
          const approveTx = await walletClient.writeContract({
            address: WETH_BASE,
            abi: erc20Abi,
            functionName: 'approve',
            args: [UNISWAP_V3_ROUTER, amountIn],
            account: account.address as `0x${string}`,
          })
          await publicClient.waitForTransactionReceipt({ hash: approveTx })
        } else {
          setStatus('Sufficient WETH allowance, skipping approval.')
        }
        setStatus('Swapping WETH to FOOM...')
        const params = {
          tokenIn: WETH_BASE,
          tokenOut: FOOM[chain.id],
          fee: 3000,
          recipient: account.address as `0x${string}`,
          amountIn,
          amountOutMinimum: 0n,
          sqrtPriceLimitX96: 0n,
        }
        const { request } = await publicClient.simulateContract({
          address: UNISWAP_V3_ROUTER,
          abi: UNISWAP_V3_ROUTER_ABI,
          functionName: 'exactInputSingle',
          args: [params],
          value: 0n,
          account: account.address as `0x${string}`,
        })
        const swapTx = await walletClient.writeContract(request)
        await publicClient.waitForTransactionReceipt({ hash: swapTx })
        setStatus('Swap complete!')
      } catch (error) {
        setStatus(`Swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        _error('Swap error:', error)
      }
    },
    [walletClient, account, publicClient]
  )

  const handleRedeem = useCallback(async () => {
    if (!redeemHex) {
      return
    }

    let ticketHashHex = ''
    let result: any = undefined
    try {
      const ticketSecret = BigInt(redeemHex)
      const power = ticketSecret & 0xffn
      const secret = ticketSecret >> 8n
      const ticketHash = await pedersenHash(leBigintToBuffer(secret, 31))

      ticketHashHex = `0x${ticketHash.toString(16)}`
      _log('Ticket hash computed:', ticketHash, ticketHashHex)

      const collector = recipient || (account?.address as Address)
      _log('Using recipient for proof:', collector)
      const mutationResult = await collectRewardMutation.mutateAsync({
        secretPower: ticketSecret,
        recipient: collector,
        relayer: '0x0',
        fee: 0n,
        refund: 0n,
      })
      result = mutationResult
    } catch (error) {
      _error('Failed to fetch startIndex:', error)
    }

    return {
      hash: ticketHashHex,
      proof: result,
    }
  }, [redeemHex, collectRewardMutation, account])

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (commitment?.hash) {
      const hashStr = `0x${commitment?.hash?.toString(16)}`
      if (lotteryHashes.includes(hashStr)) return
      setLotteryHashes(prev => {
        const updated = [...prev, hashStr]
        localStorage.setItem('lotteryHashes', JSON.stringify(updated))
        return updated
      })
    }
  }, [commitment?.hash, lotteryHashes.length])
  useEffect(() => {
    const stored = localStorage.getItem('lotteryHashes')
    if (stored) {
      try {
        const hashes = JSON.parse(stored)
        setLotteryHashes(hashes)
      } catch {
        setLotteryHashes([])
      }
    }
  }, [])
  useEffect(() => {
    if (lotteryHashes.length) {
      const lastHash = lotteryHashes[lotteryHashes.length - 1]
      _log('Last hash:', lastHash)
    }
  }, [lotteryHashes.length])
  useEffect(() => {
    const stored = localStorage.getItem('commitIndex')
    if (stored) {
      setCommitIndex(Number(stored))
    }
  }, [])

  const value: LotteryContextValue = {
    isClient,
    status,
    setStatus,
    commitment,
    setCommitment,
    tickets,
    redeemHex,
    setRedeemHex,
    lotteryHashes,
    setLotteryHashes,
    commitIndex,
    setCommitIndex,
    account,
    walletClient,
    publicClient,
    playAndPrayMutation,
    playMutation,
    cancelBetMutation,
    collectRewardMutation,
    swapUsdcToWeth,
    handleRedeem,
    play,
    handleStatus,
    recipient,
    setRecipient,
  }

  return <LotteryContext.Provider value={value}>{children}</LotteryContext.Provider>
}
