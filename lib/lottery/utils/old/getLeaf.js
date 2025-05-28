import { mimcsponge2 } from './mimcsponge.js'
import { hexToBigint } from '../bigint.js'

/**
 * Computes the leaf used in the Merkle tree: leaf = mimcsponge2(hash, rand + index)
 *
 * @param {string | bigint} index - index (as hex string or bigint)
 * @param {string | bigint} hash - commitment hash (as hex or bigint)
 * @param {string | bigint} rand - random value (as hex or bigint)
 * @returns {Promise<bigint>} - The computed leaf
 */
export async function getLeaf(index, hash, rand) {
  const i = typeof index === 'string' ? hexToBigint(index) : index
  const h = typeof hash === 'string' ? hexToBigint(hash) : hash
  const r = typeof rand === 'string' ? hexToBigint(rand) : rand

  return await mimcsponge2(h, r + i)
}
