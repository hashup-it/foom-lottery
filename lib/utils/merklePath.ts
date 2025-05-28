import { leavesDB } from '@/lib/db/leavesDb'

export interface MerkleProof {
  leaf?: string
  pathElements: string[]
  pathIndices: number[]
}

export async function loadProofPath(index: number, depth: number = 32): Promise<MerkleProof> {
  const leafEntry = await leavesDB.leaves.get(index)

  const pathElements: string[] = []
  const pathIndices: number[] = []

  let nodeIndex = index

  for (let level = 0; level < depth; level++) {
    const isRightNode = nodeIndex % 2 === 1
    const siblingIndex = isRightNode ? nodeIndex - 1 : nodeIndex + 1

    const sibling = await leavesDB.leaves.get(siblingIndex)

    pathElements.push(sibling?.leaf ?? '0x0')
    pathIndices.push(isRightNode ? 1 : 0)

    nodeIndex = Math.floor(nodeIndex / 2)
  }

  return {
    leaf: leafEntry?.leaf,
    pathElements,
    pathIndices,
  }
}
