import { zodResolver } from '@hookform/resolvers/zod'
import '@reown/appkit-wallet-button/react'
import React, { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import SpinnerText from '@/components/shared/spinner-text'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLeaves } from '@/lib/lottery/hooks/useLeaves'
import { useLotteryContract } from '@/lib/lottery/hooks/useLotteryContract'
import type { ICommitment } from '@/types/lottery'
import { _error, _log } from '@/lib/utils/ts'
import { useAppKitAccount } from '@reown/appkit/react'
import type { Address } from 'viem'
import { UNISWAP_V3_ROUTER, USDC_BASE, WETH_BASE, UNISWAP_V3_ROUTER_ABI } from '@/lib/utils/constants/uniswap'
import { erc20Abi, formatEther } from 'viem'
import { useWalletClient, usePublicClient } from 'wagmi'
import { chain, FOOM } from '@/lib/utils/constants/addresses'
import { isDevelopment } from '@/lib/utils/environment'
import { base } from 'viem/chains'
import { BET_MIN } from '@/lib/lottery/constants'
import { nFormatter } from '@/lib/utils/node'

const schema = z.object({
  power: z
    .number()
    .int({ message: 'Value must be an integer' })
    .min(0, { message: 'Value must be at least 0' })
    .max(31, { message: 'Value must be at most 31' }),
})

export default function Home() {
  const [status, setStatus] = useState('')
  const [commitment, setCommitment] = useState<ICommitment>()
  const [tickets, setTickets] = useState<string[]>([])
  const [redeemHex, setRedeemHex] = useState<string>('')
  const [lotteryHashes, setLotteryHashes] = useState<string[]>([])
  const [commitIndex, setCommitIndex] = useState<number>(lotteryHashes.length)

  const account = useAppKitAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const handleStatus = (data: string) => setStatus(prev => `${prev}${prev ? '\n\n' : '\n'}> ${data}`)
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  })
  const { playMutation, cancelBetMutation, collectRewardMutation } = useLotteryContract({ onStatus: handleStatus })
  const { data: leaves, isLoading: isLeavesLoading } = useLeaves({})
  const power = form.watch('power')

  const handleFormSubmit = form.handleSubmit(({ power }) => {
    playMutation.mutate(
      { power },
      {
        onSuccess: result => {
          if (result && result.hash) {
            setCommitment({
              secret: BigInt(result.secretPower),
              power: BigInt(power ?? 0),
              rand: leaves?.newRand!,
              index: Number(leaves?.index),
              hash: BigInt(result.hash),
              leaves: leaves?.data!,
            })
          }
        },
      }
    )
  })

  async function swapUsdcToWeth({ amountIn }: { amountIn: bigint; slippage?: number }) {
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
  }

  useEffect(() => {
    const stored = localStorage.getItem('lotteryTickets')
    if (stored) {
      try {
        setTickets(JSON.parse(stored))
      } catch {
        setTickets([])
      }
    }
  }, [])

  useEffect(() => {
    if (commitment?.secret) {
      const ticketStr = `0x${commitment?.secret?.toString(16)}`
      setTickets(prev => {
        if (prev.includes(ticketStr)) {
          return prev
        }

        const updated = [...prev, ticketStr]
        localStorage.setItem('lotteryTickets', JSON.stringify(updated))
        return updated
      })
    }
  }, [commitment?.secret])

  /** Store the user hashes */
  useEffect(() => {
    if (commitment?.hash) {
      const hashStr = `0x${commitment?.hash?.toString(16)}`

      if (lotteryHashes.includes(hashStr)) {
        return
      }

      setLotteryHashes(prev => {
        const updated = [...prev, hashStr]
        localStorage.setItem('lotteryHashes', JSON.stringify(updated))

        return updated
      })
    }
  }, [commitment?.hash, lotteryHashes.length])

  /** Log user's latest hash stored in localstorage on page load. */
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

  /** Print user's last hash from the hashes state; NOTE: This should be handled by backend only. */
  useEffect(() => {
    if (lotteryHashes.length) {
      const lastHash = lotteryHashes[lotteryHashes.length - 1]
      _log('Last hash:', lastHash)
    }
  }, [lotteryHashes.length])

  /** NOTE: This should be handled by backend only */
  useEffect(() => {
    const stored = localStorage.getItem('commitIndex')
    if (stored) {
      setCommitIndex(Number(stored))
    }
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex h-[1em]" />
      <div className="w-full flex items-center justify-start flex-col gap-2">
        <h1 className="text-2xl font-black">FOOM Lottery</h1>
        <appkit-button />

        <div className="flex flex-col gap-2 justify-center mt-8 mb-8 min-w-[25%]">
          <form onSubmit={form.handleSubmit(data => console.log(data))}>
            <div>
              <label className="block text-xs text-tertiary italic !pb-1">FOOM base multiplier to bet</label>
              {form.formState.errors.power && (
                <p className="text-xs text-red-500 italic mb-2 flex-wrap break-all">
                  {form.formState.errors.power.message}
                </p>
              )}
              <div className="flex items-center flex-nowrap gap-4">
                <Input
                  type="number"
                  defaultValue={0}
                  placeholder="FOOM power (integer)"
                  {...form.register('power', { valueAsNumber: true })}
                />
                {power !== undefined && power !== null && !Number.isNaN(power) && (
                  <p className="">
                    =&nbsp;{nFormatter(formatEther(BET_MIN * (2n + 2n ** BigInt(power || 0))))}&nbsp;FOOM
                  </p>
                )}
              </div>
            </div>
          </form>
          <Button
            variant="outline"
            className="mt-2"
            onClick={handleFormSubmit}
            disabled={power === undefined || power === null || Number.isNaN(power) || playMutation.isPending}
          >
            {playMutation.isPending ? <SpinnerText /> : 'Play & Pray'}
          </Button>
          <Button
            variant="outline"
            className="mt-2"
            onClick={handleFormSubmit}
            disabled={power === undefined || power === null || Number.isNaN(power) || playMutation.isPending}
          >
            {playMutation.isPending ? <SpinnerText /> : 'Play'}
          </Button>
          <Button
            variant="outline"
            className="mt-2 disabled:!cursor-not-allowed"
            disabled
            onClick={() => {
              if (commitment && leaves) {
                cancelBetMutation.mutate({
                  secret: commitment.secret,
                  power: commitment.power,
                  index: commitment.index || Number(leaves.index),
                  leaves: leaves.data,
                })
                setCommitment(undefined)
              }
            }}
          >
            {cancelBetMutation.isPending ? <SpinnerText /> : 'Cancel bet'}
          </Button>
          <div className="mt-4">
            <label className="block text-xs text-tertiary italic !pb-1">Deinvestment amount</label>
            <div className="flex items-center flex-nowrap gap-4">
              <Input
                type="number"
                placeholder="FOOM amount"
                disabled={isLeavesLoading}
              />
            </div>
          </div>
          <Button
            variant="outline"
            className="mt-2 disabled:!cursor-not-allowed mb-4"
            disabled
            onClick={() => {}}
          >
            {cancelBetMutation.isPending ? <SpinnerText /> : 'De-invest (.payOut)'}
          </Button>
          <div className="mt-4">
            <label className="block text-xs text-tertiary italic !pb-1">Lottery Ticket to redeem</label>
            <div className="flex items-center flex-nowrap gap-4">
              <Input
                type="text"
                placeholder="Ticket (hex, 0x…)"
                value={redeemHex}
                onChange={e => setRedeemHex(e.target.value)}
                disabled={isLeavesLoading}
              />
            </div>
          </div>
          <Button
            variant="outline"
            className="mt-2 disabled:!cursor-not-allowed"
            disabled={isLeavesLoading || !redeemHex || true}
            onClick={() => {
              _log('Having Leaves:', leaves, leaves?.newRand, leaves?.data)

              if (leaves && leaves.newRand && leaves.data) {
                collectRewardMutation.mutate({
                  secret: BigInt(redeemHex),
                  power: BigInt(redeemHex) & 0xffn,
                  rand: BigInt(leaves.newRand),
                  recipient: account.address as Address,
                  relayer: account.address as Address,
                  fee: 0n,
                  refund: 0n,
                  leaves: leaves.data,
                })
              }
            }}
          >
            {collectRewardMutation.isPending ? <SpinnerText /> : 'Collect'}
          </Button>
          <Button
            variant="outline"
            className="mt-2"
            onClick={async () => {
              await swapUsdcToWeth({ amountIn: 38_000_000_000_000_000n })
            }}
          >
            Swap WETH→FOOM / ~$100
          </Button>
        </div>
        <div className="w-full max-w-[835px] flex flex-col mb-2">
          <p className="w-full break-all whitespace-pre-wrap italic font-bold">
            List of Prayers to God:{'\n'}
            1. May the lottery be a blessing to all who participate.{'\n'}
          </p>
        </div>
        <div className="w-full max-w-[835px] flex flex-col mb-2">
          <p className="w-full break-all whitespace-pre-wrap italic font-bold">
            Lottery Tickets:{'\n'}
            {!!tickets.length ? tickets?.map((t, i) => `${i + 1}. ${t}`)?.join('\n') : '<none>'}
          </p>
        </div>
        <div className="w-full max-w-[835px] flex flex-col mb-2">
          <p className="w-full break-all whitespace-pre-wrap">Status:{status || '\n<none>'}</p>
        </div>
      </div>

      <div className="flex-grow flex items-end justify-center">
        <p>&copy; FOOM AI corporation 2025</p>
      </div>
    </div>
  )
}
