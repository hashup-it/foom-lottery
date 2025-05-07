import '@reown/appkit-wallet-button/react'
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { _log, _warn } from '@/lib/utils/ts'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createPublicClient, createWalletClient, http, parseEther } from 'viem'
import { foundry } from 'viem/chains'
import { EthLotteryAbi } from '@/abis/eth-lottery'
import { ETH_LOTTERY_ADDRESS } from '@/lib/utils/constants/evm'
import { useAppKitWallet } from '@reown/appkit-wallet-button/react'
import { usePublicClient, useWalletClient } from 'wagmi'
import { waitForTransactionReceipt } from 'viem/actions'
import { generateCommitment } from '@/lib/lottery/generateCommitment'
import { useMutation } from '@tanstack/react-query'
import SpinnerText from '@/components/shared/spinner-text'

const generateValidBetAmounts = (betMin = 1, maxPower = 22) =>
  Array.from({ length: maxPower + 1 }, (_, i) => betMin * (2 + 2 ** i))
const validAmounts = generateValidBetAmounts()
const schema = z.object({
  amount: z.number().refine(val => validAmounts.includes(val), {
    message: 'Invalid amount — must be a valid bet amount',
  }),
})

export default function Home() {
  const [status, setStatus] = React.useState('')

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  })
  const walletClient = useWalletClient().data
  const publicClient = usePublicClient()

  const play = async (amount: number, commitment: string, setStatus: React.Dispatch<React.SetStateAction<string>>) => {
    if (!walletClient || !publicClient) {
      throw new Error('Wallet not connected')
    }

    const { request } = await publicClient.simulateContract({
      address: ETH_LOTTERY_ADDRESS,
      abi: EthLotteryAbi,
      functionName: 'play',
      args: [commitment, 0],
      value: parseEther(amount.toString()),
      account: walletClient.account.address,
    })

    setStatus(prev => `${prev}\nSending transaction...`)
    const txHash = await walletClient.writeContract(request)
    setStatus(prev => `${prev}\nTransaction sent: ${txHash}`)
    await waitForTransactionReceipt(walletClient, {
      hash: txHash,
    })

    return txHash
  }

  const handleFormSubmit = form.handleSubmit(({ amount }) => {
    playLotteryMutation.mutate(amount)
  })

  const playLotteryMutation = useMutation({
    mutationFn: async (amount: number) => {
      const commitment = await generateCommitment([`0x${Number(amount).toString(16)}`, 0])
      setStatus(prev => `${prev}\nCommitment: ${JSON.stringify(commitment, null, 2)}`)

      return await play(amount, commitment.ticket, setStatus)
    },
    onError: (error: any) => {
      _log(error)
      setStatus(prev => `${prev}\nError: ${error.message}`)
    },
    onSuccess: (txHash: string) => {
      setStatus(prev => `${prev}\nTX hash: ${txHash}`)
    },
  })

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex h-[1em]" />
      <div className="w-full flex items-center justify-start flex-col gap-2">
        <h1 className="text-2xl">FOOM Lottery</h1>
        <appkit-button />
        <div className="flex flex-col gap-2 justify-center mt-8 w-1/4">
          <form onSubmit={form.handleSubmit(data => console.log(data))}>
            <div>
              <label className="text-xs text-tertiary italic">Amount of ETH to deposit</label>
              {form.formState.errors.amount && (
                <p className="text-xs text-red-500 italic mb-2 flex-wrap break-all">
                  {form.formState.errors.amount.message}
                </p>
              )}
              <div className="flex flex-nowrap gap-4">
                <Input
                  type="number"
                  placeholder="ETH amount"
                  {...form.register('amount', { valueAsNumber: true })}
                />
              </div>
            </div>
          </form>

          <Button
            variant="outline"
            className="mt-2"
            onClick={handleFormSubmit}
          >
            {playLotteryMutation.isPending ? <SpinnerText /> : 'Continue'}
          </Button>
        </div>
        <div className="w-1/2 flex flex-col mb-2">
          <p>Status:</p>
          <p className="w-full break-all whitespace-pre-wrap">{status}</p>
        </div>
      </div>
      <div className="flex-grow flex items-end justify-center">
        <p>&copy; FOOM AI corporation 2025</p>
      </div>
    </div>
  )
}
