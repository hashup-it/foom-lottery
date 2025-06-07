import { zodResolver } from '@hookform/resolvers/zod'
import '@reown/appkit-wallet-button/react'
import React, { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import SpinnerText from '@/components/shared/spinner-text'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLotteryContract } from '@/lib/lottery/hooks/useLotteryContract'
import type { ICommitment } from '@/types/lottery'
import { _error, _log } from '@/lib/utils/ts'
import { useAppKitAccount } from '@reown/appkit/react'
import type { Address } from 'viem'
import { UNISWAP_V3_ROUTER, USDC_BASE, WETH_BASE, UNISWAP_V3_ROUTER_ABI } from '@/lib/utils/constants/uniswap'
import { erc20Abi, formatEther, parseEther, parseUnits } from 'viem'
import { useWalletClient, usePublicClient } from 'wagmi'
import { chain, FOOM } from '@/lib/utils/constants/addresses'
import { BET_MIN } from '@/lib/lottery/constants'
import { nFormatter } from '@/lib/utils/node'
import indexer from '@/lib/indexer'
import { pedersenHash } from '@/lib/lottery/utils/pedersen'
import { leBigintToBuffer } from '@/lib/lottery/utils/bigint'
import Header from '@/components/ui/header'
import Layout from '@/components/ui/Layout'
import { useLocalStorage } from 'usehooks-ts'

const playSchema = z.object({
  power: z
    .number()
    .int({ message: 'Value must be an integer' })
    .min(0, { message: 'Value must be at least 0' })
    .max(31, { message: 'Value must be at most 31' }),
})

const playAndPraySchema = z.object({
  prayerText: z.string().min(1, { message: 'You need to enter your prayer' }),
  prayerEth: z
    .number({ invalid_type_error: 'Please enter amount of ETH to pray with' })
    .min(0, { message: 'Prayer ETH amount must be at least 0' }),
})

export default function Home() {
  const [isClient, setIsClient] = useState(false)
  const [status, setStatus] = useState('')
  const [commitment, setCommitment] = useState<ICommitment>()
  const [tickets] = useLocalStorage<string[]>('lotteryTickets', [])
  const [redeemHex, setRedeemHex] = useState<string>('')
  const [lotteryHashes, setLotteryHashes] = useState<string[]>([])
  const [commitIndex, setCommitIndex] = useState<number>(lotteryHashes.length)

  const account = useAppKitAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const handleStatus = (data: string) => setStatus(prev => `${prev}${prev ? '\n\n' : '\n'}> ${data}`)
  const playForm = useForm<z.infer<typeof playSchema>>({
    resolver: zodResolver(playSchema),
  })
  const playAndPrayForm = useForm<z.infer<typeof playAndPraySchema>>({
    resolver: zodResolver(playAndPraySchema),
  })
  const { playMutation, playAndPrayMutation, cancelBetMutation, collectRewardMutation } = useLotteryContract({
    onStatus: handleStatus,
  })
  const power = playForm.watch('power')
  const playAndPrayPrayerText = playAndPrayForm.watch('prayerText')
  const playAndPrayEth = playAndPrayForm.watch('prayerEth')

  const handlePlayFormSubmit = playForm.handleSubmit(({ power }) => {
    playMutation.mutate(
      { power },
      {
        onSuccess: result => {
          if (result && result.hash) {
            setCommitment({
              secret: BigInt(result.secretPower),
              power: BigInt(power ?? 0),
              hash: BigInt(result.hash),
              rand: 0n,
              index: 0,
              leaves: [],
            })
          }
        },
      }
    )
  })

  const handlePlayPrayFormSubmit = playAndPrayForm.handleSubmit(({ prayerEth, prayerText }) => {
    _log('submitting a pray:', prayerText, 'for ETH:', prayerEth, 'with power:', power)

    playAndPrayMutation.mutate({
      power,
      prayValue: parseEther(prayerEth?.toString() || '0'),
      prayText: prayerText,
    })
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

  const handleRedeem = async () => {
    if (!redeemHex) {
      return
    }

    try {
      /** @dev derive the ticket's hash using pedersenHash */
      const ticketSecret = BigInt(redeemHex)

      /** @dev recover secret and power */
      const power = ticketSecret & 0xffn
      const secret = ticketSecret >> 8n

      /** @dev recompute hash */
      const ticketHash = await pedersenHash(leBigintToBuffer(secret, 31))
      _log('Ticket hash computed:', ticketHash, `0x${ticketHash.toString(16)}`)

      const { data: startIndex } = await indexer.get('/lottery/start-index', {
        params: {
          hash: `0x${ticketHash.toString(16)}`,
        },
      })

      collectRewardMutation.mutate({
        secretPower: ticketSecret,
        startIndex: startIndex || 0,
        recipient: account.address as Address,
        relayer: '0x0',
        fee: 0n,
        refund: 0n,
      })
    } catch (error) {
      _error('Failed to fetch startIndex:', error)
    }
  }

  useEffect(() => {
    setIsClient(true)
  }, [])

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
    <div>
      <Header />
      <Layout />
      <div className="flex flex-col min-h-screen">
        <div className="flex h-[1em]" />
        <div className="w-full flex items-center justify-start flex-col gap-2">
          <h1 className="text-2xl font-black">FOOM Lottery</h1>

          <div className="flex flex-col gap-2 justify-center mt-8 mb-8 min-w-[25%]">
            <form onSubmit={playForm.handleSubmit(data => console.log(data))}>
              <div>
                <label className="block text-xs text-tertiary italic !pb-1">FOOM base multiplier to bet</label>
                {playForm.formState.errors.power && (
                  <p className="text-xs text-red-500 italic mb-2 flex-wrap break-all">
                    {playForm.formState.errors.power.message}
                  </p>
                )}
                <div className="flex items-center flex-nowrap gap-4">
                  <Input
                    type="number"
                    placeholder="FOOM power (integer)"
                    min={0}
                    defaultValue={0}
                    max={22}
                    step={1}
                    {...playForm.register('power', { valueAsNumber: true, min: 0 })}
                    onChange={e => {
                      const value = e.target.value
                      if (value === '') {
                        playForm.setValue('power', '' as any as 0)
                      } else if (Number(value) < 0) {
                        e.target.value = '0'
                      } else {
                        playForm.setValue('power', Number(value))
                      }
                    }}
                  />
                  {power !== undefined && power !== null && !Number.isNaN(power) && (
                    <p className="">
                      =&nbsp;{nFormatter(formatEther(BET_MIN * (2n + 2n ** BigInt(power || 0))))}&nbsp;FOOM
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                className="mt-2 w-full"
                onClick={handlePlayFormSubmit}
                disabled={power === undefined || power === null || Number.isNaN(power) || playMutation.isPending}
              >
                {playMutation.isPending ? <SpinnerText /> : 'Play'}
              </Button>
            </form>
            <form
              onSubmit={playAndPrayForm.handleSubmit(data => console.log(data))}
              className="flex gap-2 flex-col"
            >
              <div>
                <label className="block text-xs text-tertiary italic !pb-1 mt-2">Prayer text</label>
                {playAndPrayForm.formState.errors.prayerText && (
                  <p className="text-xs text-red-500 italic mb-2 flex-wrap break-all">
                    {playAndPrayForm.formState.errors.prayerText.message}
                  </p>
                )}
                <div className="flex items-center flex-nowrap gap-4">
                  <Input
                    type="text"
                    placeholder="Pray to the Terrestrial God"
                    {...playAndPrayForm.register('prayerText')}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-tertiary italic !pb-1">ETH prayed</label>
                {playAndPrayForm.formState.errors.prayerEth && (
                  <p className="text-xs text-red-500 italic mb-2 flex-wrap break-all">
                    {playAndPrayForm.formState.errors.prayerEth.message}
                  </p>
                )}
                <div className="flex items-center flex-nowrap gap-4">
                  <Input
                    type="number"
                    placeholder="ETH amount"
                    {...playAndPrayForm.register('prayerEth', { valueAsNumber: true })}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                className="mt-2"
                onClick={handlePlayPrayFormSubmit}
                disabled={
                  power === undefined ||
                  power === null /** || !playAndPrayEth || !playAndPrayPrayerText */ ||
                  Number.isNaN(power) ||
                  playAndPrayMutation.isPending ||
                  playMutation.isPending
                }
              >
                {playAndPrayMutation.isPending ? <SpinnerText /> : 'Play & Pray'}
              </Button>
            </form>

            <Button
              variant="outline"
              className="mt-2 disabled:!cursor-not-allowed"
              disabled
              onClick={() => {
                if (commitment) {
                  cancelBetMutation.mutate(commitment)
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
                  disabled={false}
                />
              </div>
            </div>
            <Button
              variant="outline"
              className="mt-2 disabled:!cursor-not-allowed mb-4"
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
                  disabled={false}
                />
              </div>
            </div>
            <Button
              variant="outline"
              className="mt-2 disabled:!cursor-not-allowed"
              disabled={!redeemHex}
              onClick={handleRedeem}
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
        </div>
        <div className="w-full max-w-[835px] flex flex-col mb-2">
          <p className="w-full break-all whitespace-pre-wrap italic font-bold">
            List of Prayers to God:{'\n'}
            1. May the lottery be a blessing to all who participate.{'\n'}
          </p>
        </div>
        <div className="w-full max-w-[835px] flex flex-col mb-2">
          {isClient && (
            <p className="w-full break-all whitespace-pre-wrap italic font-bold">
              Lottery Tickets:{'\n'}
              {!!tickets.length ? tickets?.map((t, i) => `${i + 1}. ${t}`)?.join('\n') : '<none>'}
            </p>
          )}
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
