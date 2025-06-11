import path from 'path'
import { groth16 } from 'snarkjs'
import { ethers } from 'ethers'
import {
  hexToBigint,
  bigintToHex,
  leBigintToBuffer,
  reverseBits,
  leBufferToBigint,
  bigintToHexRaw,
} from './utils/bigint'
import { pedersenHash } from './utils/pedersen'
import { buildMimcSponge } from 'circomlibjs'
import indexer from '../indexer'
import { AxiosResponse } from 'axios'
import { _log, _warn } from '@/lib/utils/ts'
import { toast } from 'sonner'
import { encodeAbiParameters, hexToBigInt } from 'viem'

// {
//   betIndex: number
//   betRand: bigint
//   nextIndex: number
// }
type BetResponse = [number, bigint, number]

// MIMC tree Element[]
type PathResponse = bigint[]

async function findBetFromApi(hash: bigint, startIndex?: number /** @deprecated auto-detected from the bet hash */): Promise<BetResponse> {
  try {
    const response: AxiosResponse<BetResponse> = await indexer.get('/lottery/leaf-pro', {
      params: {
        hash: bigintToHex(hash),
      },
    })

    const result = response.data
    return result
  } catch (error: any) {
    throw new Error(`Error fetching bet: ${error.message}`)
  }
}

async function getPathFromApi(betIndex: number, nextIndex: number): Promise<bigint[]> {
  try {
    const response: AxiosResponse<PathResponse> = await indexer.get('/lottery/proof-path', {
      params: {
        index: betIndex,
        nextIndex: nextIndex,
      },
    })
    return response.data
  } catch (error: any) {
    throw new Error(`Error fetching path: ${error.message}`)
  }
}

export async function generateWithdraw({
  secretPowerHex,
  recipientHex,
  relayerHex,
  feeHex,
  refundHex,
  handleStatus,
}: {
  secretPowerHex: string
  recipientHex: string
  relayerHex: string
  feeHex: string
  refundHex: string
  handleStatus?: (msg: string) => void
}) {
  const mimcsponge = await buildMimcSponge()
  const secret_power = hexToBigint(secretPowerHex)
  const secret = secret_power >> 8n
  const power = secret_power & 0x1fn
  const hash = await pedersenHash(leBigintToBuffer(secret, 31))
  const hash_power1 = hash + power + 1n

  const [betIndex, betRand, nextIndex] = await findBetFromApi(hash_power1)
  _log('Bet found:', {
    betIndex,
    betRand,
    nextIndex,
  })

  _log('results', {
    betIndex,
    betRand,
    nextIndex,
    hash_power1: bigintToHexRaw(hash_power1),
  })

  if (betIndex > 0 && betRand == 0n) {
    const message = `Bet with hash ${bigintToHexRaw(hash)} is still being processed. Please wait.`
    _warn(message)
    toast(message)
    throw 'bet not processed yet for ' + bigintToHex(hash_power1)
  }
  if (betIndex == 0) {
    toast(`Your bet was not found!`)
    _warn(`Bet with hash ${bigintToHexRaw(hash)} not found`)
    throw 'bet not found for ' + bigintToHex(hash_power1)
  }

  const bigindex = BigInt(betIndex)

  _log('bigindex:', bigindex)
  const dice = await leBufferToBigint(mimcsponge.F.fromMontgomery(mimcsponge.multiHash([secret, betRand, bigindex])))

  const power1 = 10n
  const power2 = 16n
  const power3 = 22n
  const mask =
    power <= power1
      ? ((2n ** (power1 + power2 + power3 + 1n) - 1n) << power) & (2n ** (power1 + power2 + power3 + 1n) - 1n)
      : power <= power2
        ? (((2n ** (power2 + power3 + 1n) - 1n) << (power + power1)) | (2n ** power1 - 1n)) &
          (2n ** (power1 + power2 + power3 + 1n) - 1n)
        : (((2n ** (power3 + 1n) - 1n) << (power + power1 + power2)) | (2n ** (power1 + power2) - 1n)) &
          (2n ** (power1 + power2 + power3 + 1n) - 1n)
  const maskdice = mask & dice
  const rew1 = maskdice & 0b1111111111n ? 0n : 1n
  const rew2 = maskdice & 0b11111111111111110000000000n ? 0n : 1n
  const rew3 = maskdice & 0b111111111111111111111100000000000000000000000000n ? 0n : 1n
  const rewardbits = 4n * rew3 + 2n * rew2 + rew1

  const terces = reverseBits(dice, 31 * 8)
  const nullifierHash = await pedersenHash(leBigintToBuffer(terces, 31))

  _log('getting:', betIndex, nextIndex)
  const pathElements = await getPathFromApi(betIndex, nextIndex)

  const hexPathElements = pathElements.map(el => `0x${BigInt(`${el}`).toString(16)}`)
  handleStatus?.(`Path elements: ${JSON.stringify(hexPathElements, null, 2)}`)
  _log('Path elements:', hexPathElements)

  const input = {
    root: pathElements[32],
    nullifierHash: nullifierHash,
    rewardbits: rewardbits,
    recipient: hexToBigint(recipientHex),
    relayer: hexToBigint(relayerHex),
    fee: hexToBigint(feeHex),
    refund: hexToBigint(refundHex),
    secret: secret,
    power: power,
    rand: betRand,
    pathIndex: BigInt(betIndex),
    pathElements: pathElements.slice(0, 32),
  }

  handleStatus?.(`Proofing input: ${JSON.stringify({ ...input, secret: '<hidden>' }, null, 2)}`)
  _log('Proofing input:', { ...input, secret: '<hidden>' })

  const { proof } = await groth16.fullProve(
    input,
    'circuit_artifacts/withdraw_js/withdraw.wasm',
    'circuit_artifacts/withdraw_final.zkey'
  )

  handleStatus?.(`Proof: ${JSON.stringify(proof, null, 2)}`)
  _log('Proof:', proof)

  const pA = proof.pi_a.slice(0, 2).map(BigInt) as [bigint, bigint]
  const pB = proof.pi_b.slice(0, 2).map((arr: string[]) => arr.slice(0, 2).map(BigInt) as [bigint, bigint]) as [
    [bigint, bigint],
    [bigint, bigint],
  ]
  const pC = proof.pi_c.slice(0, 2).map(BigInt) as [bigint, bigint]

  const witness = encodeAbiParameters(
    [{ type: 'uint256[2]' }, { type: 'uint256[2][2]' }, { type: 'uint256[2]' }, { type: 'uint256[7]' }],
    [
      pA,
      [
        [pB[0][1], pB[0][0]],
        [pB[1][1], pB[1][0]],
      ],
      pC,
      [
        BigInt(pathElements[32]),
        BigInt(nullifierHash),
        BigInt(rewardbits),
        BigInt(recipientHex),
        BigInt(relayerHex),
        BigInt(feeHex),
        BigInt(refundHex),
      ],
    ]
  )

  handleStatus?.(`Encoded witness: ${witness}`)
  return witness
}
