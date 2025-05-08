import '@reown/appkit-wallet-button/react'
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { _error, _log, _warn } from '@/lib/utils/ts'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createPublicClient, createWalletClient, http, parseEther, type TransactionReceipt } from 'viem'
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

  const handleStatus = (data: string) => setStatus(prev => `${prev}\n\n> ${data}`)

  const play = async (amount: number, commitment: string) => {
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

    handleStatus('Sending transaction...')
    const txHash = await walletClient.writeContract(request)
    handleStatus(`Transaction sent: ${txHash}`)
    const receipt = await waitForTransactionReceipt(walletClient, {
      hash: txHash,
    })

    return receipt
  }

  const handleFormSubmit = form.handleSubmit(({ amount }) => {
    playLotteryMutation.mutate(amount)
  })

  const playLotteryMutation = useMutation<TransactionReceipt, Error, number>({
    mutationFn: async (amount: number) => {
      /** @dev TODO: Need to generate the commitment this many times until it validates correctly with the `0<_secrethash &&_secrethash < FIELD_SIZE` requirement. */
      const commitment = await generateCommitment([
        `0x${Number(amount).toString(16)}`,
        0 /** @dev custom commitment input hash */,
      ])
      handleStatus(`Commitment: ${JSON.stringify(commitment, null, 2)}`)

      return await play(amount, commitment.ticket)
    },
    onError: (error: any) => {
      _error(error)
      handleStatus(`Error: ${error.message}`)
    },
    onSuccess: receipt => {
      handleStatus(`TX hash: ${JSON.stringify(receipt, null, 2)}`)
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
                  defaultValue={1026}
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
          <p className="w-full break-all whitespace-pre-wrap">Status:{status}</p>
        </div>
      </div>
      <div className="flex-grow flex items-end justify-center">
        <p>&copy; FOOM AI corporation 2025</p>
      </div>
    </div>
  )
}
