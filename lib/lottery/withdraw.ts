import path from 'path'
import { groth16 } from 'snarkjs'
import { ethers } from 'ethers'
import { hexToBigint, bigintToHex, leBigintToBuffer, reverseBits, leBufferToBigint } from './utils/bigint'
import { pedersenHash } from './utils/pedersen'
import { buildMimcSponge } from 'circomlibjs'
import indexer from '../indexer'
import { AxiosResponse } from 'axios'

interface BetResponse {
  betIndex: number
  betRand: bigint
  nextIndex: number
}

interface PathResponse {
  pathElements: bigint[]
}

async function findBetFromApi(hash: bigint, startIndex: number): Promise<BetResponse> {
  try {
    const response: AxiosResponse<BetResponse> = await indexer.get('/leaf', {
      params: {
        hash: bigintToHex(hash),
        startIndex: startIndex.toString(16),
      },
    })
    return response.data
  } catch (error: any) {
    throw new Error(`Error fetching bet: ${error.message}`)
  }
}

async function getPathFromApi(betIndex: number, nextIndex: number): Promise<bigint[]> {
  try {
    const response: AxiosResponse<PathResponse> = await indexer.get('/proof-path', {
      params: {
        index: betIndex,
        nextIndex: nextIndex,
      },
    })
    return response.data.pathElements
  } catch (error: any) {
    throw new Error(`Error fetching path: ${error.message}`)
  }
}

export async function generateWithdraw({
  secretPowerHex,
  startIndexHex,
  recipientHex,
  relayerHex,
  feeHex,
  refundHex,
}: {
  secretPowerHex: string
  startIndexHex: string
  recipientHex: string
  relayerHex: string
  feeHex: string
  refundHex: string
}) {
  const mimcsponge = await buildMimcSponge()
  const secret_power = hexToBigint(secretPowerHex)
  const secret = secret_power >> 8n
  const power = secret_power & 0x1fn
  const hash = await pedersenHash(leBigintToBuffer(secret, 31))
  const hash_power1 = hash + power + 1n
  const startindex = parseInt(startIndexHex.replace(/^0x0*/, ''), 16)

  const { betIndex, betRand, nextIndex } = await findBetFromApi(hash_power1, startindex)

  if (betIndex > 0 && betRand == 0n) {
    throw 'bet not processed yet for ' + bigintToHex(hash_power1) + ' starting at ' + startindex.toString(16)
  }
  if (betIndex == 0) {
    throw 'bet not found for ' + bigintToHex(hash_power1) + ' starting at ' + startindex.toString(16)
  }

  const bigindex = BigInt(betIndex)
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

  const pathElements = await getPathFromApi(betIndex, nextIndex)

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

  const { proof } = await groth16.fullProve(
    input,
    path.join(__dirname, '../groth16/withdraw.wasm'),
    path.join(__dirname, '../groth16/withdraw_final.zkey')
  )

  const pA = proof.pi_a.slice(0, 2)
  const pB = proof.pi_b.slice(0, 2)
  const pC = proof.pi_c.slice(0, 2)

  const witness = ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint256[2]', 'uint256[2][2]', 'uint256[2]', 'uint[7]'],
    [
      pA,
      [
        [pB[0][1], pB[0][0]],
        [pB[1][1], pB[1][0]],
      ],
      pC,
      [
        bigintToHex(pathElements[32]),
        bigintToHex(nullifierHash),
        bigintToHex(rewardbits),
        recipientHex,
        relayerHex,
        feeHex,
        refundHex,
      ],
    ]
  )
  return witness
}
