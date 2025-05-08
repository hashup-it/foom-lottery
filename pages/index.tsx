import '@reown/appkit-wallet-button/react'
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { createPublicClient, createWalletClient, http, parseEther, type Address, type TransactionReceipt } from 'viem'
import { waitForTransactionReceipt } from 'viem/actions'
import { usePublicClient, useWalletClient } from 'wagmi'

import { _error, _log, _warn } from '@/lib/utils/ts'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EthLotteryAbi } from '@/abis/eth-lottery'
import { ETH_LOTTERY_ADDRESS } from '@/lib/utils/constants/evm'
import { generateCommitment } from '@/lib/lottery/generateCommitment'
import SpinnerText from '@/components/shared/spinner-text'
import type { ICancelBetArgs, ICommitment } from '@/types/lottery'

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
  const [state, setState] = React.useState<ICommitment>()

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

      const result = await play(amount, commitment.ticket)
      setState(commitment)

      return result
    },
    onError: (error: any) => {
      _error(error)
      handleStatus(`Error: ${error.message}`)
    },
    onSuccess: receipt => {
      handleStatus(`TX hash: ${JSON.stringify(receipt, null, 2)}`)
    },
  })

  const cancelBetMutation = useMutation({
    mutationFn: async ({ betIndex, mask, pA, pB, pC, recipient, relayer, fee = 0n, refund = 0n }: ICancelBetArgs) => {
      if (!walletClient || !publicClient) {
        throw new Error('Wallet not connected')
      }

      const { request } = await publicClient.simulateContract({
        address: ETH_LOTTERY_ADDRESS,
        abi: EthLotteryAbi,
        functionName: 'cancelbet',
        args: [betIndex, mask, pA, pB, pC, recipient, relayer, fee, refund],
        value: refund,
        account: walletClient.account.address,
      })

      const txHash = await walletClient.writeContract(request)
      const txReceipt = await waitForTransactionReceipt(publicClient, { hash: txHash })
      setState(undefined)

      return txReceipt
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
                  defaultValue={3}
                />
              </div>
            </div>
          </form>
          <Button
            variant="outline"
            className="mt-2"
            onClick={handleFormSubmit}
          >
            {playLotteryMutation.isPending ? <SpinnerText /> : 'Play'}
          </Button>
          <Button
            disabled={!state}
            variant="outline"
            className="mt-2 mb-4 disabled:!cursor-not-allowed"
            onClick={() =>
              cancelBetMutation.mutateAsync({
                /** TODO: Dynamically find the betIndex using the commmitment's R and C values */
                betIndex: 0,
                mask: state!.mask,
                /** TODO: Calc */
                pA: [69n, 69n],
                pB: [
                  /** TODO: Calc */
                  [69n, 69n],
                  /** TODO: Calc */
                  [69n, 69n],
                ],
                /** TODO: Calc */
                pC: [69n, 69n],
                recipient: walletClient?.account.address as Address,
                relayer: walletClient?.account.address as Address,
                fee: 0n,
                refund: 0n,
              })
            }
          >
            {cancelBetMutation.isPending ? <SpinnerText /> : 'Cancel bet'}
          </Button>
          <Button
            disabled={!state}
            variant="outline"
            className="mt-2 mb-4 disabled:!cursor-not-allowed"
            onClick={() => {}}
          >
            {cancelBetMutation.isPending ? <SpinnerText /> : 'Collect'}
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
