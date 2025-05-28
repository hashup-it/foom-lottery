import { useMutation } from '@tanstack/react-query'
import { usePublicClient, useWalletClient } from 'wagmi'
import { parseEther, type Address, type TransactionReceipt, encodePacked, keccak256, erc20Abi } from 'viem'
import { waitForTransactionReceipt } from 'viem/actions'
import { EthLotteryAbi } from '@/abis/eth-lottery'
// import { generateWithdraw } from '@/lib/lottery/withdraw'
import { getHash } from '@/lib/lottery/getHash'
import { getLotteryStatus } from '@/lib/lottery/utils/nextjs/getLotteryStatus'
import { keccak256Abi, keccak256Uint } from '@/lib/solidity'
import { toast } from 'sonner'
import { _error, _log } from '@/lib/utils/ts'
import { FOOM, LOTTERY } from '@/lib/utils/constants/addresses'
import { foundry } from 'viem/chains'

export type FormattedProof = {
  pi_a: [bigint, bigint]
  pi_b: [[bigint, bigint], [bigint, bigint]]
  pi_c: [bigint, bigint]
}

export function formatProofForContract(proof: any): FormattedProof {
  return {
    pi_a: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
    pi_b: [
      [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
      [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
    ],
    pi_c: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])],
  }
}

export function useLotteryContract({
  onStatus,
}: {
  onStatus?: (msg: string) => void
} = {}) {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const handleStatus = (data: string) => {
    onStatus?.(data)
  }

  const playMutation = useMutation({
    mutationFn: async ({ power, commitmentInput = 0 }: { power: number; commitmentInput?: number }) => {
      try {
        if (!walletClient || !publicClient) {
          throw new Error('Wallet not connected')
        }

        handleStatus('Generating commitment...')
        const commitment = await getHash([`0x${Number(power).toString(16)}`, commitmentInput])
        const clampedHash = BigInt(commitment.hash) % 2n ** 256n

        handleStatus(`Commitment Hash: ${commitment.hash}`)

        const multiplier = 2 + 2 ** Number(power)
        const amount = BigInt(multiplier)

        const foomBalance = await publicClient.readContract({
          address: FOOM[foundry.id],
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [walletClient.account.address],
        })
        handleStatus(`FOOM Balance: ${foomBalance}`)

        let receipt

        handleStatus(`Playing with FOOM tokens...`)

        const { request: approveRequest } = await publicClient.simulateContract({
          address: FOOM[foundry.id],
          abi: erc20Abi,
          functionName: 'approve',
          args: [LOTTERY[foundry.id], amount],
          account: walletClient.account.address,
        })

        const approveTx = await walletClient.writeContract(approveRequest)
        await waitForTransactionReceipt(publicClient, { hash: approveTx })

        handleStatus(`FOOM approval tx: ${approveTx}`)

        const { request: playRequest } = await publicClient.simulateContract({
          address: LOTTERY[foundry.id],
          abi: EthLotteryAbi,
          functionName: 'play',
          args: [clampedHash, BigInt(power)],
          account: walletClient.account.address,
        })

        const playTx = await walletClient.writeContract(playRequest)
        receipt = await waitForTransactionReceipt(publicClient, {
          hash: playTx,
        })

        const secret = BigInt(commitment.secret_power) >> 8n
        handleStatus(`Ticket: ${commitment.secret_power}, Next Index: ${commitment.nextIndex}, Amount: ${multiplier}`)

        return { receipt, secretPower: commitment.secret_power, secret, hash: commitment.hash, startIndex: commitment.nextIndex }
      } catch (error: any) {
        _error(error)
        toast(error?.cause?.reason || error?.message || `${error}`)
        handleStatus(`Error: ${error.message}`)
      }
    },
    onSuccess: receipt => {
      if (receipt) handleStatus(`Receipt: ${JSON.stringify(receipt, null, 2)}`)
    },
  })

  const cancelBetMutation = useMutation({
    mutationFn: async ({
      secret,
      power,
      index,
      leaves,
    }: {
      secret: bigint
      power: bigint
      index: number
      leaves: bigint[]
    }) => {
      // try {
      //   if (!walletClient || !publicClient) throw new Error('Wallet/client missing')

      //   const {
      //     proof,
      //     publicSignals: { root, nullifier, reward1, reward2, reward3 },
      //   } = await generateWithdraw({
      //     secret,
      //     power,
      //     rand: 0n,
      //     recipient: walletClient.account.address,
      //     relayer: walletClient.account.address,
      //     fee: 0n,
      //     refund: 0n,
      //     leaves,
      //   })

      //   const { pi_a, pi_b, pi_c } = formatProofForContract(proof)
      //   const recipient = walletClient.account.address as Address
      //   const relayer = walletClient.account.address as Address
      //   const fee = 0n
      //   const refund = 0n

      //   const { request } = await publicClient.simulateContract({
      //     address: LOTTERY[foundry.id],
      //     abi: EthLotteryAbi,
      //     functionName: 'cancelbet',
      //     args: [index, pi_a, pi_b, pi_c, recipient, relayer, fee, refund],
      //     value: refund,
      //     account: walletClient.account.address,
      //   })

      //   const txHash = await walletClient.writeContract(request)
      //   return await waitForTransactionReceipt(publicClient, { hash: txHash })
      // } catch (error: any) {
      //   _error(error)
      //   toast(error?.cause?.reason || error?.message || `${error}`)
      //   handleStatus(`Error: ${error.message}`)
      // }
    },
    onSuccess: receipt => {
      // if (receipt) handleStatus(`Receipt: ${JSON.stringify(receipt, null, 2)}`)
    },
  })

  const collectRewardMutation = useMutation({
    mutationFn: async ({
      secret,
      power,
      rand,
      recipient,
      relayer,
      fee = 0n,
      refund = 0n,
      leaves,
    }: {
      secret: bigint
      power: bigint
      rand: bigint
      recipient: Address
      relayer: Address
      fee?: bigint
      refund?: bigint
      leaves: bigint[]
    }) => {
      // try {
      //   if (!walletClient || !publicClient) throw new Error('Wallet not connected')

      //   const withdrawOutput = await generateWithdraw({
      //     secret,
      //     power,
      //     rand,
      //     recipient,
      //     relayer,
      //     fee,
      //     refund,
      //     leaves,
      //   })

      //   if (typeof withdrawOutput !== 'object' || !withdrawOutput.proof || !withdrawOutput.publicSignals) {
      //     throw new Error('Invalid withdraw proof format')
      //   }

      //   const {
      //     proof,
      //     publicSignals: { root, nullifier, reward1, reward2, reward3 },
      //   } = withdrawOutput

      //   const { pi_a, pi_b, pi_c } = formatProofForContract(proof)

      //   const { request } = await publicClient.simulateContract({
      //     address: LOTTERY[foundry.id],
      //     abi: EthLotteryAbi,
      //     functionName: 'collect',
      //     args: [pi_a, pi_b, pi_c, root, nullifier, reward1, reward2, reward3, recipient, relayer, fee, refund],
      //     value: refund,
      //     account: walletClient.account.address,
      //   })

      //   const txHash = await walletClient.writeContract(request)
      //   return await waitForTransactionReceipt(publicClient, { hash: txHash })
      // } catch (error: any) {
      //   _error(error)
      //   toast(error?.cause?.reason || error?.message || `${error}`)
      //   handleStatus(`Error: ${error.message}`)
      // }
    },
    onSuccess: receipt => {
      // if (receipt) handleStatus(`Receipt: ${JSON.stringify(receipt, null, 2)}`)
    },
  })

  return {
    playMutation,
    cancelBetMutation,
    collectRewardMutation,
    formatProofForContract,
    keccak256Abi,
    keccak256Uint,
    getLotteryStatus,
    getHash,
  }
}
