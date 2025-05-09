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
import { generateWitness } from '@/lib/lottery/generateWitness'
import { useLeaves } from '@/lib/lottery/hooks/useLeaves'

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
  const { data: leaves, isLoading: isLeavesLoading } = useLeaves({
    fromBlock: 0n /** @dev FoomLottery.sol deployment block */,
    inR: state?.R,
    inC: state?.C,
  })

  const handleStatus = (data: string) => setStatus(prev => `${prev}${prev ? '\n\n' : '\n'}> ${data}`)

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
      const commitment = await generateCommitment([
        `0x${Number(amount).toString(16)}`,
        0 /** @dev custom commitment input hash */,
      ])
      handleStatus(`Commitment: ${JSON.stringify(commitment, null, 2)}`)

      const result = await play(amount, `${commitment.hash}`)
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

  type FormattedProof = {
    pi_a: [bigint, bigint],
    pi_b: [[bigint, bigint], [bigint, bigint]],
    pi_c: [bigint, bigint]
  }

  function formatProofForContract(proof: any): FormattedProof {
    return {
      pi_a: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
      pi_b: [
        [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
        [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
      ],
      pi_c: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])]
    }
  }

  const cancelBetMutation = useMutation({
    mutationFn: async () => {
      if (!walletClient || !publicClient || !state) {
        throw new Error('Missing wallet, client, or commitment state')
      }

      const betIndex = leaves?.index

      const { proof } = await generateWitness({
        R: state.R,
        C: state.C,
        mask: state.mask,
      })

      const { pi_a: pA, pi_b: pB, pi_c: pC } = formatProofForContract(proof)

      const recipient = walletClient.account.address as Address
      const relayer = walletClient.account.address as Address
      const fee = 0n
      const refund = 0n

      const { request } = await publicClient.simulateContract({
        address: ETH_LOTTERY_ADDRESS,
        abi: EthLotteryAbi,
        functionName: 'cancelbet',
        args: [betIndex, state.mask, pA, pB, pC, recipient, relayer, fee, refund],
        value: refund,
        account: walletClient.account.address,
      })

      const txHash = await walletClient.writeContract(request)
      const txReceipt = await waitForTransactionReceipt(publicClient, { hash: txHash })

      setState(undefined)
      return txReceipt
    },
  })

  const collectRewardMutation = useMutation({
    mutationFn: async ({
      secret,
      mask,
      rand,
      recipient,
      relayer,
      fee = 0n,
      refund = 0n,
      invest = 0n,
      leaves,
    }: {
      secret: bigint
      mask: bigint
      rand: bigint
      recipient: `0x${string}`
      relayer: `0x${string}`
      fee?: bigint
      refund?: bigint
      invest?: bigint
      leaves: bigint[]
    }) => {
      if (!walletClient || !publicClient) {
        throw new Error('Wallet not connected')
      }

      const {
        proof,
        publicSignals: { root, nullifierHash, rew1, rew2, rew3 },
      } = await generateWitness([secret, mask, rand, recipient, relayer, fee, refund, ...leaves])

      const pA = proof.pi_a.slice(0, 2) as [bigint, bigint]
      const pB = [
        [proof.pi_b[0][1], proof.pi_b[0][0]],
        [proof.pi_b[1][1], proof.pi_b[1][0]],
      ] as [[bigint, bigint], [bigint, bigint]]
      const pC = proof.pi_c.slice(0, 2) as [bigint, bigint]

      const { request } = await publicClient.simulateContract({
        address: ETH_LOTTERY_ADDRESS,
        abi: EthLotteryAbi,
        functionName: 'collect',
        args: [pA, pB, pC, root, nullifierHash, recipient, relayer, fee, refund, rew1, rew2, rew3, invest],
        value: refund,
        account: walletClient.account.address,
      })

      const txHash = await walletClient.writeContract(request)
      const txReceipt = await waitForTransactionReceipt(publicClient, { hash: txHash })

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
            onClick={() => cancelBetMutation.mutateAsync()}
          >
            {cancelBetMutation.isPending ? <SpinnerText /> : 'Cancel bet'}
          </Button>
          <Button
            disabled={!state}
            variant="outline"
            className="mt-2 mb-4 disabled:!cursor-not-allowed"
            onClick={() => {
              if (!state || !leaves) {
                return
              }

              collectRewardMutation.mutate({
                secret: state.secret,
                mask: state.mask,
                rand: BigInt(leaves.rand),
                recipient: walletClient?.account.address as Address,
                relayer: walletClient?.account.address as Address,
                fee: 0n,
                refund: 0n,
                invest: 0n,
                leaves: leaves.data,
              })
            }}
          >
            {collectRewardMutation.isPending ? <SpinnerText /> : 'Collect'}
          </Button>

          <Button
            disabled={!state}
            variant="outline"
            className="mt-2 mb-4 disabled:!cursor-not-allowed"
            onClick={() => {}}
          >
            {cancelBetMutation.isPending ? <SpinnerText /> : 'Admin: commit & reveal'}
          </Button>
          <Button
            disabled={!state}
            variant="outline"
            className="mt-2 mb-4 disabled:!cursor-not-allowed"
            onClick={() => {}}
          >
            {cancelBetMutation.isPending ? <SpinnerText /> : 'Restore leftover ETH (.payOut)'}
          </Button>
        </div>
        <div className="w-1/2 flex flex-col mb-2">
          <p className="w-full break-all whitespace-pre-wrap italic font-bold">Lottery Ticket: {state?.ticket}</p>
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
