import { groth16 } from 'snarkjs'
import { mimicMerkleTree } from './utils/mimcMerkleTree.js'
import { mimcsponge2 } from './utils/mimcsponge.js'

export async function generateUpdate({ oldRand, newRand, newHashes, oldLeaves }) {
  const betsUpdate = 8

  let i = 1
  for (; i < betsUpdate; i++) {
    if (newHashes[i] === 0n) break
  }

  const newLeaves = await Promise.all(
    newHashes.slice(1, i).map((h, j) => mimcsponge2(h, newRand + BigInt(oldLeaves.length) + BigInt(j)))
  )

  const tree = await mimicMerkleTree(oldLeaves)
  const oldProof = tree.path(oldLeaves.length - 1)
  tree.bulkInsert(newLeaves)
  const newProof = tree.path(oldLeaves.length + newLeaves.length - 1)

  const input = {
    oldRoot: oldProof.pathRoot,
    newRoot: newProof.pathRoot,
    index: oldLeaves.length - 1,
    oldRand,
    newRand,
    newhashes: newHashes.map(x => x.toString()),
    pathElements: oldProof.pathElements.map(x => x.toString()),
  }

  const { proof } = await groth16.fullProve(
    input,
    '/circuit_artifacts/update_js/update.wasm',
    '/circuit_artifacts/update_final.zkey'
  )

  return {
    proof,
    newRoot: newProof.pathRoot,
  }
}
