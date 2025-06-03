import { buildMimcSponge } from 'circomlibjs'
import { MerkleTree } from 'fixed-merkle-tree'
import { leBufferToBigint, hexToBigint, bigintToHex } from './bigint'
import { gunzipSync } from 'fflate'

const MERKLE_TREE_HEIGHT = 32

const zeros = [
  '0x24d599883f039a5cb553f9ec0e5998d58d8816e823bd556164f72aef0ef7d9c0',
  '0x0e5c230fa94b937789a1980f91b9de6233a7d0315f037c7d4917cba089e0042a',
  '0x255da7d5316310ad81de31bfd5b8272b30ce70c742685ac9696446f618399317',
  '0x1dd4b847fd5bdd5d53a661d8268eb5dd6629669922e8a0dcbbeedc8d6a966aaf',
]

async function getLines(path: string) {
  try {
    const res = await fetch(`/${path}`)
    if (res.ok) {
      const text = await res.text()
      return text.split('\n').filter(line => line.trim() !== '')
    }

    const gzRes = await fetch(`/${path}.gz`)
    if (gzRes.ok) {
      const buffer = await gzRes.arrayBuffer()
      const decompressed = gunzipSync(new Uint8Array(buffer))
      const text = new TextDecoder().decode(decompressed)
      return text.split('\n').filter(line => line.trim() !== '')
    }

    return []
  } catch (err) {
    return []
  }
}

// async function readLast() {
  // Read from the Dexie database instead / fetch from API directly for newest data and cache later
  // const db = new Dexie('lottery')
  // const lastRecord = await db.table('last').get(1)
  // if (lastRecord) {
  //   return [lastRecord.nextIndex, lastRecord.blockNumber, hexToBigint(lastRecord.lastRoot), hexToBigint(lastRecord.lastLeaf)]
  // }

//   const lines = await getLines('www/last.csv')
//   const [nextIndex, blockNumber, lastRoot, lastLeaf] = lines[0].split(',')
//   return [parseInt(nextIndex, 16), parseInt(blockNumber, 16), hexToBigint(lastRoot), hexToBigint(lastLeaf)]
// }

// async function getIndexRand(hashstr: string, betIndex: number) {
//   const path = sprintfjs.sprintf('%06x', betIndex >> 8)
//   const path1 = path.slice(0, 2)
//   const path2 = path.slice(2, 4)
//   const path3 = path.slice(4, 6)
//   const lines = await getLines('www/' + path1 + '/' + path2 + '/' + path3 + '.csv')
//   //console.log(hashstr);
//   for (let i = 0; i < lines.length; i++) {
//     const [index, skip, hash, myrand] = lines[i].split(',')
//     if (hash == hashstr) {
//       //console.log(hash);
//       const newIndex = (betIndex & 0xffffff00) + parseInt(index, 16)
//       //console.log(newIndex.toString(16),index);
//       return [newIndex, hexToBigint(myrand)]
//     }
//   }
//   return [0, 0n]
// }

// async function getIndexWaiting(hashstr) {
//   const lines = await getLines('www/waiting.csv')
//   for (let i = 0; i < lines.length; i++) {
//     const [index, hash] = lines[i].split(',')
//     if (hash == hashstr) {
//       return [parseInt(index, 16), 0n]
//     }
//   }
//   return [0, 0n]
// }

// function findBet(inHash, startindex) {
//   const [nextIndex, blockNumber, lastRoot, lastLeaf] = readLast()
//   const hashstr = bigintToHex(inHash).replace(/^0x0*/, '')
//   for (; (startindex & 0xffffff00) < nextIndex; startindex += 0xff) {
//     ;[betIndex, betRand] = getIndexRand(hashstr, startindex)
//     if (betIndex > 0) {
//       return [betIndex, betRand, nextIndex]
//     }
//   }
//   return [...getIndexWaiting(hashstr), nextIndex]
// }

// async function getWaitingList(nextIndex, hashesLength) {
//   const lines = await getLines('www/waiting.csv')
//   const hashes = new Array(hashesLength)
//   lines.forEach(line => {
//     if (!line) return // Skip empty lines
//     const [index, hash] = line.split(',') // assume hash in 2nd column in waiting.csv
//     const indexnum = parseInt(index, 16)
//     if (indexnum >= nextIndex && indexnum < nextIndex + hashesLength) {
//       hashes[indexnum - nextIndex] = hexToBigint(hash)
//     }
//   })
//   return hashes
// }

// async function getLeaves(path) {
//   const lines = await getLines(path)
//   const leaves = lines.map(line => {
//     const [index, hash] = line.split(',')
//     return hexToBigint(hash)
//   })
//   return [leaves]
// }

// async function getLastPath(lastIndex) {
//   const path = sprintfjs.sprintf('%08x', lastIndex)
//   const path1 = path.slice(0, 2)
//   const path1i = parseInt(path1, 16)
//   const path2 = path.slice(2, 4)
//   const path2i = parseInt(path2, 16)
//   const path3 = path.slice(4, 6)
//   const path3i = parseInt(path3, 16)
//   const path4 = path.slice(6, 8)
//   const path4i = parseInt(path4, 16)
//   //console.log(path);

//   const [leaves1] = getLeaves('www/index.csv')
//   const [leaves2] = getLeaves('www/' + path1 + '/index.csv')
//   const [leaves3] = getLeaves('www/' + path1 + '/' + path2 + '/index.csv')
//   const [leaves4] = getLeaves('www/' + path1 + '/' + path2 + '/' + path3 + '.csv')

//   const tree4 = await mimicMerkleTree(hexToBigint(zeros[0]), leaves4, 8)
//   const mpath4 = tree4.path(path4i)
//   const root4 = tree4.root
//   //console.log(bigintToHex(root4));
//   if (leaves3.length == path3i) {
//     //console.log(path3i);
//     leaves3.push(root4)
//   }
//   const tree3 = await mimicMerkleTree(hexToBigint(zeros[1]), leaves3, 8)
//   const root3 = tree3.root
//   const mpath3 = tree3.path(path3i)
//   if (leaves2.length == path2i) {
//     leaves2.push(root3)
//   }
//   const tree2 = await mimicMerkleTree(hexToBigint(zeros[2]), leaves2, 8)
//   const root2 = tree2.root
//   const mpath2 = tree2.path(path2i)
//   if (leaves1.length == path1i) {
//     leaves1.push(root2)
//   }
//   const tree1 = await mimicMerkleTree(hexToBigint(zeros[3]), leaves1, 8)
//   const newroot = tree1.root
//   const mpath1 = tree1.path(path1i)
//   const pathElements = [...mpath4.pathElements, ...mpath3.pathElements, ...mpath2.pathElements, ...mpath1.pathElements]
//   return [...pathElements, newroot]
// }

// async function getPath(index, nextIndex) {
//   const path = sprintfjs.sprintf('%08x', index)
//   const path1 = path.slice(0, 2)
//   const path1i = parseInt(path1, 16)
//   const path2 = path.slice(2, 4)
//   const path2i = parseInt(path2, 16)
//   const path3 = path.slice(4, 6)
//   const path3i = parseInt(path3, 16)
//   const path4 = path.slice(6, 8)
//   const path4i = parseInt(path4, 16)
//   const npath = sprintfjs.sprintf('%08x', nextIndex)
//   const npath1 = npath.slice(0, 2)
//   const npath1i = parseInt(npath1, 16)
//   const npath2 = npath.slice(2, 4)
//   const npath2i = parseInt(npath2, 16)
//   const npath3 = npath.slice(4, 6)
//   const npath3i = parseInt(npath3, 16)

//   const [leaves1] = getLeaves('www/index.csv')
//   const [leaves2] = getLeaves('www/' + path1 + '/index.csv')
//   const [leaves3] = getLeaves('www/' + path1 + '/' + path2 + '/index.csv')
//   const [leaves4] = getLeaves('www/' + path1 + '/' + path2 + '/' + path3 + '.csv')

//   let tree4 = await mimicMerkleTree(hexToBigint(zeros[0]), leaves4, 8)
//   const mpath4 = tree4.path(path4i)
//   if ((index & 0xffffff00) != (nextIndex & 0xffffff00)) {
//     const [nleaves4] = getLeaves('www/' + npath1 + '/' + npath2 + '/' + npath3 + '.csv')
//     tree4 = await mimicMerkleTree(hexToBigint(zeros[0]), nleaves4, 8)
//   }
//   const root4 = tree4.root
//   leaves3.push(root4)
//   let tree3 = await mimicMerkleTree(hexToBigint(zeros[1]), leaves3, 8)
//   const mpath3 = tree3.path(path3i)
//   if ((index & 0xffff0000) != (nextIndex & 0xffff0000)) {
//     const [nleaves3] = getLeaves('www/' + npath1 + '/' + npath2 + '/index.csv')
//     tree3 = await mimicMerkleTree(hexToBigint(zeros[1]), nleaves3, 8)
//   }
//   const root3 = tree3.root
//   leaves2.push(root3)
//   let tree2 = await mimicMerkleTree(hexToBigint(zeros[2]), leaves2, 8)
//   const mpath2 = tree2.path(path2i)
//   const root2 = tree2.root
//   if ((index & 0xff000000) != (nextIndex & 0xff000000)) {
//     const [nleaves2] = getLeaves('www/' + npath1 + '/index.csv')
//     tree2 = await mimicMerkleTree(hexToBigint(zeros[2]), nleaves2, 8)
//   }
//   leaves1.push(root2)
//   const tree1 = await mimicMerkleTree(hexToBigint(zeros[3]), leaves1, 8)
//   const newroot = tree1.root
//   const mpath1 = tree1.path(path1i)
//   const pathElements = [...mpath4.pathElements, ...mpath3.pathElements, ...mpath2.pathElements, ...mpath1.pathElements]
//   return [...pathElements, newroot]
// }

// async function getNewRoot(nextIndex, newLeaves) {
//   const path = sprintfjs.sprintf('%08x', nextIndex - 1)
//   const path1 = path.slice(0, 2)
//   const path2 = path.slice(2, 4)
//   const path3 = path.slice(4, 6)

//   const [leaves1] = getLeaves('www/index.csv')
//   const [leaves2] = getLeaves('www/' + path1 + '/index.csv')
//   const [leaves3] = getLeaves('www/' + path1 + '/' + path2 + '/index.csv')
//   const [leaves4] = getLeaves('www/' + path1 + '/' + path2 + '/' + path3 + '.csv')

//   const roots = new Array(2)

//   const leaves2length = leaves2.length
//   const leaves3length = leaves3.length
//   const leaves4length = leaves4.length
//   leaves4.push(...newLeaves)
//   if (leaves4.length > 256) {
//     const tree4a = await mimicMerkleTree(hexToBigint(zeros[0]), leaves4.slice(0, 256), 8)
//     roots[0] = tree4a.root
//     const tree4b = await mimicMerkleTree(hexToBigint(zeros[0]), leaves4.slice(256, leaves4.length), 8)
//     roots[1] = tree4b.root
//   } else {
//     const tree4a = await mimicMerkleTree(hexToBigint(zeros[0]), leaves4, 8)
//     roots[0] = tree4a.root
//     roots[1] = hexToBigint(zeros[1])
//   }
//   if (leaves4length == 256) {
//     leaves3.push(roots[1])
//   } else {
//     leaves3.push(...roots)
//   }
//   if (leaves3.length > 256) {
//     const tree3a = await mimicMerkleTree(hexToBigint(zeros[1]), leaves3.slice(0, 256), 8)
//     roots[0] = tree3a.root
//     const tree3b = await mimicMerkleTree(hexToBigint(zeros[1]), leaves3.slice(256, leaves3.length), 8)
//     roots[1] = tree3b.root
//   } else {
//     const tree3a = await mimicMerkleTree(hexToBigint(zeros[1]), leaves3, 8)
//     roots[0] = tree3a.root
//     roots[1] = hexToBigint(zeros[2])
//   }
//   if (leaves3length == 256) {
//     leaves2.push(roots[1])
//   } else {
//     leaves2.push(...roots)
//   }
//   if (leaves2.length > 256) {
//     const tree2a = await mimicMerkleTree(hexToBigint(zeros[2]), leaves2.slice(0, 256), 8)
//     roots[0] = tree2a.root
//     const tree2b = await mimicMerkleTree(hexToBigint(zeros[2]), leaves2.slice(256, leaves2.length), 8)
//     roots[1] = tree2b.root
//   } else {
//     const tree2a = await mimicMerkleTree(hexToBigint(zeros[2]), leaves2, 8)
//     roots[0] = tree2a.root
//     roots[1] = hexToBigint(zeros[3])
//   }
//   if (leaves2length == 256) {
//     leaves1.push(roots[1])
//   } else {
//     leaves1.push(...roots)
//   }
//   const tree1 = await mimicMerkleTree(hexToBigint(zeros[3]), leaves1, 8)
//   const newRoot = tree1.root
//   return newRoot
// }

// async function mimicMerkleTree(zero, leaves = [], hight = MERKLE_TREE_HEIGHT) {
//   const mimcsponge = await buildMimcSponge()
//   const mimcspongeMultiHash = (left, right) =>
//     leBufferToBigint(mimcsponge.F.fromMontgomery(mimcsponge.multiHash([left, right])))
//   return new MerkleTree(hight, leaves, {
//     hashFunction: mimcspongeMultiHash,
//     zeroElement: zero,
//   })
// }

export {
  // mimicMerkleTree,
  // readLast,
  // getLeaves,
  // getPath,
  // getLastPath,
  // getIndexWaiting,
  // getIndexRand,
  // findBet,
  // getNewRoot,
  // getWaitingList,
  getLines,
}
