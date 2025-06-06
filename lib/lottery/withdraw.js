import { groth16 } from 'snarkjs'
import { hexToBigint, leBigintToBuffer, reverseBits } from './utils/bigint.js'
import { pedersenHash } from './utils/pedersen.js'
import { mimcsponge2 } from './utils/mimcsponge.js'
import { mimicMerkleTree } from './utils/mimcMerkleTree.js'

export async function generateWithdraw(inputs) {
  const secret = hexToBigint(inputs[0])
  const power = hexToBigint(inputs[1])
  const rand = hexToBigint(inputs[2])
  const index = hexToBigint(inputs[3])
  const recipient = hexToBigint(inputs[4])
  const relayer = hexToBigint(inputs[5])
  const fee = BigInt(inputs[6])
  const refund = BigInt(inputs[7])
  const leaves = inputs.slice(8).map(hexToBigint)

  const terces = reverseBits(
    (secret + rand + index) % 21888242871839275222246405745257275088548364400416034343698204186575808495617n,
    31 * 8
  )

  const power1 = 10n
  const power2 = 16n
  const mask =
    power <= power1
      ? ((2n ** (power1 + power2 + 1n) - 1n) << power) & (2n ** (power1 + power2 + 1n) - 1n)
      : (((2n ** power2 - 1n) << (power + power1)) | (2n ** power1 - 1n)) & (2n ** (power1 + power2 + 1n) - 1n)

  const dice = await mimcsponge2(secret, rand + index)
  const maskdice = mask & dice

  const reward1 = maskdice & 0b1111111111n ? 0n : 1n
  const reward2 = maskdice & 0b11111111111111110000000000n ? 0n : 1n
  const reward3 = dice & 0b111111111111111111111100000000000000000000000000n ? 0n : 1n

  const nullifier = await pedersenHash(leBigintToBuffer(terces, 31))

  const tree = await mimicMerkleTree(leaves)
  const merkleProof = tree.path(Number(index))

  const input = {
    root: merkleProof.pathRoot,
    nullifierHash: nullifier,
    reward1,
    reward2,
    reward3,
    recipient,
    relayer,
    fee,
    refund,
    secret,
    power,
    rand,
    pathIndex: index,
    pathElements: merkleProof.pathElements.map(x => x.toString()),
  }

  const { proof, publicSignals } = await groth16.fullProve(
    input,
    '/circuit_artifacts/withdraw_js/withdraw.wasm',
    '/circuit_artifacts/withdraw_final.zkey'
  )

  return {
    proof,
    publicSignals: {
      root: BigInt(publicSignals[0]),
      nullifier: BigInt(publicSignals[1]),
      reward1: BigInt(publicSignals[2]),
      reward2: BigInt(publicSignals[3]),
      reward3: BigInt(publicSignals[4]),
    },
  }
}
