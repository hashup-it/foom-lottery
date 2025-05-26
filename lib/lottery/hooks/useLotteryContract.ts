import { useMutation } from '@tanstack/react-query'
import { usePublicClient, useWalletClient } from 'wagmi'
import { parseEther, type Address, type TransactionReceipt, encodePacked, keccak256 } from 'viem'
import { waitForTransactionReceipt } from 'viem/actions'
import { EthLotteryAbi } from '@/abis/eth-lottery'
import { generateWithdraw } from '@/lib/lottery/withdraw'
import { generateUpdate } from '@/lib/lottery/update'
import { getHash } from '@/lib/lottery/getHash'
import { getLotteryStatus } from '@/lib/lottery/utils/getLotteryStatus'
import { keccak256Abi, keccak256Uint } from '@/lib/solidity'
import { toast } from 'sonner'
import { _error, _log } from '@/lib/utils/ts'
import type { mask } from 'ethers'
import { ETH_LOTTERY } from '@/lib/utils/constants/addresses'
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

        handleStatus(`Generating commitment...`)
        const { hash, secret_power } = await getHash([`0x${Number(power).toString(16)}`, commitmentInput])
        const clampedHash = hash % 2n ** 256n

        handleStatus(`Commitment Hash: 0x${hash.toString(16)}`)

        const amount = 2 + 2 ** Number(power)
        const { request } = await publicClient.simulateContract({
          address: ETH_LOTTERY[foundry.id],
          abi: EthLotteryAbi,
          functionName: 'play',
          args: [clampedHash, BigInt(power)],
          value: parseEther(`${amount}`),
          account: walletClient.account.address,
        })

        handleStatus('Sending transaction...')
        const txHash = await walletClient.writeContract(request)
        handleStatus(`Transaction sent: ${txHash}`)

        const receipt = await waitForTransactionReceipt(publicClient, { hash: txHash })

        const secret = secret_power >> 8n

        return { receipt, secretPower: secret_power, secret, hash }
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
      try {
        if (!walletClient || !publicClient) throw new Error('Wallet/client missing')

        // Generate ZK proof using rand = 0n for cancel
        const {
          proof,
          publicSignals: { root, nullifier, reward1, reward2, reward3 },
        } = await generateWithdraw({
          secret,
          power,
          rand: 0n,
          recipient: walletClient.account.address,
          relayer: walletClient.account.address,
          fee: 0n,
          refund: 0n,
          leaves,
        })

        const { pi_a, pi_b, pi_c } = formatProofForContract(proof)
        const recipient = walletClient.account.address as Address
        const relayer = walletClient.account.address as Address
        const fee = 0n
        const refund = 0n

        const { request } = await publicClient.simulateContract({
          address: ETH_LOTTERY[foundry.id],
          abi: EthLotteryAbi,
          functionName: 'cancelbet',
          args: [index, pi_a, pi_b, pi_c, recipient, relayer, fee, refund],
          value: refund,
          account: walletClient.account.address,
        })

        const txHash = await walletClient.writeContract(request)
        return await waitForTransactionReceipt(publicClient, { hash: txHash })
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
      try {
        if (!walletClient || !publicClient) throw new Error('Wallet not connected')

        const withdrawOutput = await generateWithdraw({
          secret,
          power,
          rand,
          recipient,
          relayer,
          fee,
          refund,
          leaves,
        })

        if (typeof withdrawOutput !== 'object' || !withdrawOutput.proof || !withdrawOutput.publicSignals) {
          throw new Error('Invalid withdraw proof format')
        }

        const {
          proof,
          publicSignals: { root, nullifier, reward1, reward2, reward3 },
        } = withdrawOutput

        const { pi_a, pi_b, pi_c } = formatProofForContract(proof)

        const { request } = await publicClient.simulateContract({
          address: ETH_LOTTERY[foundry.id],
          abi: EthLotteryAbi,
          functionName: 'collect',
          args: [pi_a, pi_b, pi_c, root, nullifier, reward1, reward2, reward3, recipient, relayer, fee, refund],
          value: refund,
          account: walletClient.account.address,
        })

        const txHash = await walletClient.writeContract(request)
        return await waitForTransactionReceipt(publicClient, { hash: txHash })
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

  const commitMutation = useMutation({
    mutationFn: async () => {
      try {
        if (!walletClient || !publicClient) throw new Error('Wallet not connected')
        const [, commitCount] = await getLotteryStatus(publicClient)
        const revealSecret = keccak256Uint(commitCount)
        const commitHash = keccak256Uint(BigInt(revealSecret))
        const { request } = await publicClient.simulateContract({
          address: ETH_LOTTERY[foundry.id],
          abi: EthLotteryAbi,
          functionName: 'commit',
          args: [commitHash],
          account: walletClient.account.address,
        })
        const txHash = await walletClient.writeContract(request)
        const result = await waitForTransactionReceipt(publicClient, { hash: txHash })

        await walletClient.writeContract({
          address: ETH_LOTTERY[foundry.id],
          abi: EthLotteryAbi,
          functionName: 'rememberHash',
          account: walletClient.account.address,
        })
        _log('Remember hash succeeded.')

        return result
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

  const revealMutation = useMutation({
    mutationFn: async ({
      oldRand,
      oldLeaves,
      newHashes,
    }: {
      oldRand: bigint
      oldLeaves: bigint[]
      newHashes: bigint[]
    }) => {
      try {
        if (!walletClient || !publicClient) throw new Error('Wallet not connected')

        const [nextIndex, , , commitBlock] = await getLotteryStatus(publicClient)
        const revealSecret = BigInt(keccak256(encodePacked(['uint256'], [nextIndex])))

        const block = await publicClient.getBlock({ blockNumber: BigInt(commitBlock) })
        const commitBlockHash = block.hash!
        const newRand = BigInt(keccak256(encodePacked(['uint256', 'bytes32'], [revealSecret, commitBlockHash])))

        const { proof, newRoot } = await generateUpdate({
          oldRand,
          newRand,
          newHashes,
          oldLeaves,
        })

        const { pi_a, pi_b, pi_c } = formatProofForContract(proof)

        const { request } = await publicClient.simulateContract({
          address: ETH_LOTTERY[foundry.id],
          abi: EthLotteryAbi,
          functionName: 'reveal',
          args: [revealSecret, pi_a, pi_b, pi_c, newRoot],
          account: walletClient.account.address,
        })

        await walletClient.writeContract({
          address: ETH_LOTTERY[foundry.id],
          abi: EthLotteryAbi,
          functionName: 'rememberHash',
          account: walletClient.account.address,
        })
        _log('Remember hash succeeded.')

        _log('Writing reveal TX...')
        const txHash = await walletClient.writeContract(request)
        const result = await waitForTransactionReceipt(publicClient, { hash: txHash })

        return result
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

  return {
    playMutation,
    cancelBetMutation,
    collectRewardMutation,
    commitMutation,
    revealMutation,
    formatProofForContract,
    keccak256Abi,
    keccak256Uint,
    getLotteryStatus,
    getHash,
    generateWithdraw,
  }
}
