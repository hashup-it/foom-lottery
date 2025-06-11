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
import { _error, _log, _warn } from '@/lib/utils/ts'
import { chain, FOOM, LOTTERY } from '@/lib/utils/constants/addresses'
import { BET_MIN } from '@/lib/lottery/constants'
import { fetchLastLeaf } from '@/lib/lottery/fetchLastLeaf'
import { generateWithdraw } from '../withdraw'
import relayerApi from '@/lib/relayer'
import { useLocalStorage } from 'usehooks-ts'
import type { AxiosResponse } from 'axios'
import { UNISWAP_V3_QUOTER, UNISWAP_V3_QUOTER_ABI, WETH_BASE } from '@/lib/utils/constants/uniswap'

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
  const [_, setTickets] = useLocalStorage<string[]>('lotteryTickets', [])

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
    const status = (msg: string) => {
      _log(msg)
      onStatus?.(msg)
    }

    if (!walletClient || !publicClient) {
      throw new Error('Wallet not connected')
    }

    const playAmount = await getAmountEthForPower(power)
    _log('Playing with:', '<uniswap return value>', '* bet_min', `= ${formatEther(playAmount)} ETH`)

    status('Generating commitment...')
    const commitment = await getHash([`0x${Number(power).toString(16)}`, commitmentInput])

    const ticketStr = commitment.secret_power
    setTickets(prev => {
      if (!prev.includes(ticketStr)) {
        return [...prev, ticketStr]
      }
      return prev
    })

    status(`Commitment Hash: ${commitment.hash}`)
    status(`Ticket: ${commitment.secret_power}`)

    const correctNonce = await publicClient.getTransactionCount({
      address: walletClient.account.address,
    })
    _log('Nonce:', correctNonce)

    const args = {
      address: LOTTERY[chain.id],
      abi: EthLotteryAbi,
      functionName: 'playETH',
      args: [BigInt(commitment.hash), BigInt(power)],
      account: walletClient.account.address,
      value: playAmount,
    }
    _log('Args:', args)
    const result = await publicClient.simulateContract(args)
    const { request: playRequest } = result
    _log('result:', result)
    _log('past simulation, request:', playRequest)

    const playTx = await walletClient.writeContract({
      ...playRequest,
      value: playAmount,
    })
    const receipt = await waitForTransactionReceipt(publicClient, { hash: playTx })

    const secret = BigInt(commitment.secret_power) >> 8n

    /** @dev TBD: Is this needed here? */
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

        if (error?.cause?.cause?.code === 4001) {
          toast('Cancelled')
        } else if (error?.cause?.cause?.name === 'InsufficientFundsError') {
          toast(
            `You don't have enough ETH to play! (you need ${formatEther(await getAmountEthForPower(power))} ETH + gas fees)`
          )
        } else {
          toast('There is not enough liquidity in the pool to play this bet. Please, try again later.')
        }

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
        toast(error?.cause?.cause?.code === 4001 ? 'Cancelled' : error?.cause?.reason || error?.message || `${error}`)
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

  /**
   * Solely calls proof generation.
   */
  const collectRewardMutation = useMutation({
    mutationFn: async ({
      secretPower,
      recipient,
      relayer,
      fee = 0n,
      refund = 0n,
    }: {
      secretPower: bigint
      recipient: string
      relayer: string
      fee?: bigint
      refund?: bigint
    }) => {
      /** @dev proof build */
      /** @dev relayer is always defined as 0x0 to make anyone able to relay this transaction */
      _log('Generating withdraw proof…')
      const witness = await generateWithdraw({
        secretPowerHex: `0x${secretPower.toString(16)}`,
        recipientHex: recipient,
        relayerHex: relayer || '0x0',
        feeHex: `0x${fee.toString(16)}`,
        refundHex: `0x${refund.toString(16)}`,
        handleStatus,
      })

      /** @dev Relayer handoff */
      handleStatus('Handing off to chosen relayer…')
      const handoffObject = witness.encoded
      let response: AxiosResponse<any, any> | undefined = undefined

      try {
        response = await relayerApi.post('/relay/withdraw', handoffObject)
      } catch (error) {
        _warn(error)
      }

      _log('Relayer API response:', '<no API picked for `collect()` call>')
      return {
        witness,
        result: response?.data,
      }
    },
  })

  async function getEthInForFoomOut(amountOut: bigint): Promise<bigint> {
    if (!publicClient) {
      throw new Error('No public client')
    }

    const result = await publicClient.readContract({
      address: UNISWAP_V3_QUOTER,
      abi: UNISWAP_V3_QUOTER_ABI,
      functionName: 'quoteExactOutputSingle',
      args: [
        {
          tokenIn: WETH_BASE,
          tokenOut: FOOM[chain.id],
          amount: amountOut,
          fee: 3000n,
          sqrtPriceLimitX96: 0n,
        },
      ],
    })

    if (!Array.isArray(result) || typeof result?.[0] !== 'bigint') {
      throw new Error('Unexpected result from Uniswap Quoter')
    }

    _log('Uniswap V3 quote result:', result)
    return result[0]
  }

  /**
   * Calculates amount of ETH to deposit for the play of given power to happen.
   * @dev yields >= the amount of ETH that swaps to enough FOOMs via Uniswap V3
   */
  async function getAmountEthForPower(power: number | bigint): Promise<bigint> {
    if (power > 22) {
      throw new Error('Invalid bet amount')
    }

    const amountFoomNeeded = BET_MIN * (2n + 2n ** BigInt(power))
    const amountEthNeeded = await getEthInForFoomOut(amountFoomNeeded)
    /** @dev 3% buffer to add to avoid underflow */
    const amount = amountEthNeeded + (amountEthNeeded * 3n) / 100n

    return amount
  }

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
