import { useMutation } from '@tanstack/react-query'
import { usePublicClient, useWalletClient } from 'wagmi'
import {
  parseEther,
  type Address,
  type TransactionReceipt,
  encodePacked,
  keccak256,
  erc20Abi,
  formatEther,
  decodeEventLog,
} from 'viem'
import { waitForTransactionReceipt } from 'viem/actions'
import { EthLotteryAbi } from '@/abis/eth-lottery'
import { getHash } from '@/lib/lottery/getHash'
import { getLotteryStatus } from '@/lib/lottery/utils/nextjs/getLotteryStatus'
import { keccak256Abi, keccak256Uint } from '@/lib/solidity'
import { toast } from 'sonner'
import { _error, _log } from '@/lib/utils/ts'
import { chain, FOOM, LOTTERY } from '@/lib/utils/constants/addresses'
import { foundry } from 'viem/chains'
import { BET_MIN } from '@/lib/lottery/constants'
import { fetchLastLeaf } from '@/lib/lottery/fetchLastLeaf'
import { generateWithdraw } from '../withdraw'
import relayerApi from '@/lib/relayer'

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

  /** TODO: make this accept the same as `_log` to enable proper `_log` f call formatting; only just later format params to be concat with spaces and json-stringified if current param is of type `object`. */
  const handleStatus = (data: string) => {
    _log(data)
    onStatus?.(data)
  }

  async function prepareAndPlay({
    power,
    commitmentInput = 0,
    onStatus,
    customArgs = {},
  }: {
    power: number
    commitmentInput?: number
    onStatus?: (msg: string) => void
    customArgs?: Record<string, any>
  }) {
    const multiplier = 2n + 2n ** BigInt(power ?? 0)
    const playAmount = BET_MIN * multiplier

    _log('Playing with:', formatEther(multiplier), '* bet_min', `= ${formatEther(playAmount)} FOOM`)

    if (!walletClient || !publicClient) {
      throw new Error('Wallet not connected')
    }

    const status = (msg: string) => {
      _log(msg)
      onStatus?.(msg)
    }

    status('Generating commitment...')
    const commitment = await getHash([`0x${Number(power).toString(16)}`, commitmentInput])
    status(`Commitment Hash: ${commitment.hash}`)

    const foomBalance = await publicClient.readContract({
      address: FOOM[chain.id],
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [walletClient.account.address],
    })
    status(`FOOM Balance: ${foomBalance}`)

    const currentAllowance = await publicClient.readContract({
      address: FOOM[chain.id],
      abi: erc20Abi,
      functionName: 'allowance',
      args: [walletClient.account.address, LOTTERY[chain.id]],
    })
    status(`Current FOOM Allowance: ${currentAllowance}, needed FOOM allowance: ${playAmount}`)

    let receipt: any = undefined

    status(`Playing with FOOM tokens...`)
    if (currentAllowance < playAmount) {
      const { request: approveRequest } = await publicClient.simulateContract({
        address: FOOM[chain.id],
        abi: erc20Abi,
        functionName: 'approve',
        args: [LOTTERY[chain.id], playAmount],
        account: walletClient.account.address,
      })
      const approveTx = await walletClient.writeContract(approveRequest)
      await waitForTransactionReceipt(publicClient, { hash: approveTx })
      let updatedAllowance = await publicClient.readContract({
        address: FOOM[chain.id],
        abi: erc20Abi,
        functionName: 'allowance',
        args: [walletClient.account.address, LOTTERY[chain.id]],
      })
      status(`Updated FOOM Allowance: ${updatedAllowance}`)
      if (updatedAllowance < playAmount) {
        throw new Error('Updated allowance still insufficient.')
      }
    } else {
      status('Sufficient allowance, skipping approval.')
    }

    const correctNonce = await publicClient.getTransactionCount({
      address: walletClient.account.address,
    })
    _log('Nonce:', correctNonce)

    const { request: playRequest } = await publicClient.simulateContract({
      address: LOTTERY[chain.id],
      abi: EthLotteryAbi,
      functionName: customArgs.functionName || 'play',
      args: [commitment.hash, BigInt(power), ...(customArgs.args ?? [])],
      account: walletClient.account.address,
      nonce: correctNonce,
      ...(customArgs.value !== undefined ? { value: customArgs.value } : {}),
    })
    _log('past simulation, request:', playRequest)

    const playTx = await walletClient.writeContract({
      ...playRequest,
      ...(customArgs.value !== undefined ? { value: customArgs.value } : {}),
    })
    receipt = await waitForTransactionReceipt(publicClient, { hash: playTx })

    const secret = BigInt(commitment.secret_power) >> 8n
    const lastLeaf = await fetchLastLeaf()
    status(
      `Ticket: ${commitment.secret_power}, Next Index: ${lastLeaf[0]}, block number: ${lastLeaf[1]}, Amount: ${multiplier}`
    )

    return {
      receipt,
      secretPower: commitment.secret_power,
      secret,
      hash: commitment.hash,
      startIndex: lastLeaf[0],
      startBlock: lastLeaf[1],
    }
  }

  const playMutation = useMutation({
    mutationFn: async ({ power, commitmentInput = 0 }: { power: number; commitmentInput?: number }) => {
      try {
        return await prepareAndPlay({ power, commitmentInput, onStatus })
      } catch (error: any) {
        _error(error)
        toast(error?.cause?.reason || error?.message || `${error}`)
        handleStatus(`Error: ${error.message}`)
      }
    },
    onSuccess: (data: any) => {
      if (data) {
        const { receipt, ...output } = data
        handleStatus(`Receipt: ${JSON.stringify(receipt, null, 2)}`)
        handleStatus(`Result: ${JSON.stringify(output, null, 2)}`)
        const logs = receipt.logs.map(log => ({ address: log.address, data: log.data, topics: log.topics }))
        _log('Raw TX logs:', logs)
        const decodedLogs = logs
          .map(log => {
            try {
              return decodeEventLog({
                abi: [...EthLotteryAbi, ...erc20Abi],
                data: log.data,
                topics: log.topics,
              })
            } catch (err) {
              return null
            }
          })
          .filter(log => log !== null)
        _log('Decoded Logs:', decodedLogs)
        handleStatus(`Logs: ${JSON.stringify(decodedLogs, null, 2)}`)
      }
    },
  })

  const playAndPrayMutation = useMutation({
    mutationFn: async ({
      power,
      prayValue,
      prayText,
      commitmentInput = 0,
    }: {
      power: number
      prayValue: bigint
      prayText: string
      commitmentInput?: number
    }) => {
      try {
        return await prepareAndPlay({
          power,
          commitmentInput,
          onStatus,
          customArgs: {
            value: prayValue,
            functionName: 'playAndPray',
            args: [prayText],
          },
        })
      } catch (error: any) {
        _error(error)
        toast(error?.cause?.reason || error?.message || `${error}`)
        handleStatus(`Error: ${error.message}`)
      }
    },
    onSuccess: (data: any) => {
      if (data) {
        const { receipt, ...output } = data
        handleStatus(`Receipt: ${JSON.stringify(receipt, null, 2)}`)
        handleStatus(`Result: ${JSON.stringify(output, null, 2)}`)
        const logs = receipt.logs.map(log => ({ address: log.address, data: log.data, topics: log.topics }))
        _log('Raw TX logs:', logs)
        const decodedLogs = logs
          .map(log => {
            try {
              return decodeEventLog({
                abi: [...EthLotteryAbi, ...erc20Abi],
                data: log.data,
                topics: log.topics,
              })
            } catch (err) {
              return null
            }
          })
          .filter(log => log !== null)
        _log('Decoded Logs:', decodedLogs)
        handleStatus(`Logs: ${JSON.stringify(decodedLogs, null, 2)}`)
      }
    },
  })

  const cancelBetMutation = useMutation({
    mutationFn: async ({
      secret,
      power,
      index = 0,
      leaves = [],
    }: {
      secret: bigint
      power: bigint
      index?: number
      leaves?: bigint[]
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
      //     address: LOTTERY[chain.id],
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
      secretPower,
      startIndex,
      recipient,
      relayer,
      fee = 0n,
      refund = 0n,
    }: {
      secretPower: bigint
      startIndex: number
      recipient: string
      relayer: string
      fee?: bigint
      refund?: bigint
    }) => {
      /** @dev proof build */
      /** @dev relayer is always defined as 0x0 to make anyone able to relay this transaction */
      const witness = await generateWithdraw({
        secretPowerHex: `0x${secretPower.toString(16)}`,
        startIndexHex: `0x${startIndex.toString(16)}`,
        recipientHex: recipient,
        relayerHex: relayer || '0x0',
        feeHex: `0x${fee.toString(16)}`,
        refundHex: `0x${refund.toString(16)}`,
        handleStatus,
      })

      /** @dev Relayer handoff */
      handleStatus('Handing off to relayer...')
      const response = await relayerApi.post('/relay/withdraw', {
        proof: {
          a: witness[0],
          b: witness[1],
          c: witness[2],
        },
        inputs: witness[3],
        recipient,
        relayer,
        fee: fee.toString(),
        refund: refund.toString(),
      })

      return response.data
    },
  })

  return {
    playMutation,
    playAndPrayMutation,
    cancelBetMutation,
    collectRewardMutation,
    formatProofForContract,
    keccak256Abi,
    keccak256Uint,
    getLotteryStatus,
    getHash,
  }
}
