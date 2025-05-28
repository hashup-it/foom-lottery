import { buildPedersenHash } from 'circomlibjs'

import { leBufferToBigint } from './bigint'

// Computes the Pedersen hash of the given data, returning the result as a BigInt.
const pedersenHash = async (data: Uint8Array) => {
  const pedersen = await buildPedersenHash()

  const pedersenOutput = pedersen.hash(data)

  const babyJubOutput = leBufferToBigint(
    pedersen.babyJub.F.fromMontgomery(pedersen.babyJub.unpackPoint(pedersenOutput)[0])
  )
  return babyJubOutput
}

export { pedersenHash }
