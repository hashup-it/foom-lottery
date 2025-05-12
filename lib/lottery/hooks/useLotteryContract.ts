import { useMutation } from '@tanstack/react-query'
import { usePublicClient, useWalletClient } from 'wagmi'
import { parseEther, type Address, type TransactionReceipt, encodePacked, keccak256 } from 'viem'
import { waitForTransactionReceipt } from 'viem/actions'
import { EthLotteryAbi } from '@/abis/eth-lottery'
import { ETH_LOTTERY_ADDRESS } from '@/lib/utils/constants/evm'
import { generateCommitment } from '@/lib/lottery/generateCommitment'
import { generateWitness } from '@/lib/lottery/generateWitness'
import { getLotteryStatus } from '@/lib/lottery/utils/getLotteryStatus'
import { keccak256Abi, keccak256Uint } from '@/lib/solidity'
import type { ICommitment } from '@/types/lottery'
import { toast } from 'sonner'

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
  const walletClient = useWalletClient().data
  const publicClient = usePublicClient()

  const handleStatus = (data: string) => {
    if (onStatus) onStatus(data)
  }

  const playMutation = useMutation<
    { receipt: TransactionReceipt | undefined; commitment: ICommitment },
    Error,
    { amount: number; commitmentInput?: number }
  >({
    mutationFn: async ({ amount, commitmentInput = 0 }) => {
      try {
        if (!walletClient || !publicClient) throw new Error('Wallet not connected')
        const commitment = await generateCommitment([`0x${Number(amount).toString(16)}`, commitmentInput])
        handleStatus?.(`Commitment: ${JSON.stringify(commitment, null, 2)}`)
        const { request } = await publicClient.simulateContract({
          address: ETH_LOTTERY_ADDRESS,
          abi: EthLotteryAbi,
          functionName: 'play',
          args: [commitment.hash, 0],
          value: parseEther(amount.toString()),
          account: walletClient.account.address,
        })
        handleStatus?.('Sending transaction...')
        const txHash = await walletClient.writeContract(request)
        handleStatus?.(`Transaction sent: ${txHash}`)
        const receipt = await waitForTransactionReceipt(walletClient, { hash: txHash })
        return { receipt, commitment }
      } catch (error: any) {
        toast(error?.cause?.reason || `${error}` || error?.message)
        handleStatus?.(`Error: ${error.message}`)
        throw error
      }
    },
    onSuccess: ({ receipt }) => {
      receipt ? handleStatus?.(`TX hash: ${JSON.stringify(receipt, null, 2)}`) : null
    },
  })

  const cancelBetMutation = useMutation<TransactionReceipt | undefined, Error, { state: ICommitment; leaves: any }>({
    mutationFn: async ({ state, leaves }) => {
      try {
        if (!walletClient || !publicClient || !state) throw new Error('Missing wallet, client, or commitment state')
        const betIndex = leaves?.index
        const { proof } = await generateWitness({ R: state.R, C: state.C, mask: state.mask })
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
        return txReceipt
      } catch (error: any) {
        toast(error?.cause?.reason || `${error}` || error?.message)
        handleStatus?.(`Error: ${error.message}`)
      }
    },
    onSuccess: receipt => {
      receipt ? handleStatus?.(`TX hash: ${JSON.stringify(receipt, null, 2)}`) : null
    },
  })

  const commitMutation = useMutation<TransactionReceipt | undefined, Error, void>({
    mutationFn: async () => {
      try {
        if (!walletClient || !publicClient) throw new Error('Wallet not connected')
        const lotteryStatus = await getLotteryStatus(publicClient)
        const [, commitCount] = lotteryStatus
        const revealSecret = keccak256Uint(commitCount)
        const revealSecretBigInt = BigInt(revealSecret)
        const commitHash = keccak256Uint(revealSecretBigInt)
        const { request } = await publicClient.simulateContract({
          address: ETH_LOTTERY_ADDRESS,
          abi: EthLotteryAbi,
          functionName: 'commit',
          args: [commitHash],
          account: walletClient.account.address,
        })
        const txHash = await walletClient.writeContract(request)
        return await waitForTransactionReceipt(publicClient, { hash: txHash })
      } catch (error: any) {
        toast(error?.cause?.reason || `${error}` || error?.message)
        handleStatus?.(`Error: ${error.message}`)
      }
    },
    onSuccess: receipt => {
      receipt ? handleStatus?.(`TX hash: ${JSON.stringify(receipt, null, 2)}`) : null
    },
  })

  const revealMutation = useMutation<TransactionReceipt | undefined, Error, void>({
    mutationFn: async () => {
      try {
        if (!walletClient || !publicClient) throw new Error('Wallet not connected')
        const [, commitCount] = await getLotteryStatus(publicClient)
        const revealSecretHex = keccak256(encodePacked(['uint256'], [commitCount]))
        const revealSecret = BigInt(revealSecretHex)
        const { request } = await publicClient.simulateContract({
          address: ETH_LOTTERY_ADDRESS,
          abi: EthLotteryAbi,
          functionName: 'reveal',
          args: [revealSecret],
          account: walletClient.account.address,
        })
        const txHash = await walletClient.writeContract(request)
        return await waitForTransactionReceipt(publicClient, { hash: txHash })
      } catch (error: any) {
        toast(error?.cause?.reason || `${error}` || error?.message)
        handleStatus?.(`Error: ${error.message}`)
      }
    },
    onSuccess: receipt => {
      receipt ? handleStatus?.(`TX hash: ${JSON.stringify(receipt, null, 2)}`) : null
    },
  })

  const collectRewardMutation = useMutation<
    TransactionReceipt | undefined,
    Error,
    {
      secret: bigint
      mask: bigint
      rand: bigint
      recipient: `0x${string}`
      relayer: `0x${string}`
      fee?: bigint
      refund?: bigint
      invest?: bigint
      leaves: bigint[]
    }
  >({
    mutationFn: async ({ secret, mask, rand, recipient, relayer, fee = 0n, refund = 0n, invest = 0n, leaves }) => {
      try {
        if (!walletClient || !publicClient) throw new Error('Wallet not connected')
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
      } catch (error: any) {
        toast(error?.cause?.reason || `${error}` || error?.message)
        handleStatus?.(`Error: ${error.message}`)
      }
    },
    onSuccess: receipt => {
      receipt ? handleStatus?.(`TX hash: ${JSON.stringify(receipt, null, 2)}`) : null
    },
  })

  return {
    playMutation,
    cancelBetMutation,
    commitMutation,
    revealMutation,
    collectRewardMutation,
    formatProofForContract,
    keccak256Abi,
    keccak256Uint,
    getLotteryStatus,
    generateCommitment,
    generateWitness,
  }
}
