import { ethers } from 'ethers'
import * as circomlibjs from 'circomlibjs'
import { hexToBigint, bigintToHex, leBufferToBigint } from './utils/bigint.js'
import { mimicMerkleTree } from './utils/mimcMerkleTree.js'

////////////////////////////// MAIN ///////////////////////////////////////////

export async function inspectMerklePath() {
  const mimcsponge = await circomlibjs.buildMimcSponge()

  console.log('max field:', '21888242871839275222246405745257275088548364400416034343698204186575808495617n')

  const foom = hexToBigint(ethers.keccak256(ethers.toUtf8Bytes('foom')))
  const zero = leBufferToBigint(mimcsponge.F.fromMontgomery(mimcsponge.multiHash([foom, 0])))
  const one = leBufferToBigint(mimcsponge.F.fromMontgomery(mimcsponge.multiHash([1, 0xf + 1])))

  console.log(foom.toString(), 'foom bigint')
  console.log(zero.toString(), 'mimcsponge([foom,0]) bigint')
  console.log(one.toString(), 'mimcsponge([1,0xf+1]) bigint')
  console.log(bigintToHex(foom), 'foom hex')
  console.log(bigintToHex(zero), 'mimcsponge([foom,0]) hex')

  const tree = await mimicMerkleTree([zero])
  const proof = tree.path(0)

  for (let i = 0; i < 32; i++) {
    console.log('"', bigintToHex(proof.pathElements[i]), '",//', i)
  }

  console.log('"', bigintToHex(proof.pathRoot), '",// ROOT')

  for (let i = 0; i < 32; i++) {
    console.log('"', proof.pathElements[i].toString(), '",//', i)
  }

  console.log('"', proof.pathRoot.toString(), '",// ROOT')

  return {
    pathElements: proof.pathElements.map(x => x.toString()),
    root: proof.pathRoot.toString(),
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  inspectMerklePath()
    .then(output => {
      process.stdout.write(JSON.stringify(output, null, 2))
      process.exit(0)
    })
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}
