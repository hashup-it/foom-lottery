/**
 * @dev NOTE: need to reconsider logic
 */

// #!/usr/bin/node
// import path from 'path'
// import { groth16 } from 'snarkjs'
// import { ethers } from 'ethers'
// import { hexToBigint, bigintToHex, leBigintToBuffer, reverseBits, leBufferToBigint } from './utils/bigint'
// import { pedersenHash } from './utils/pedersen'
// import { getPath, findBet } from './utils/mimcMerkleTree'
// import { buildMimcSponge } from 'circomlibjs'

// ////////////////////////////// MAIN ///////////////////////////////////////////
// // forge-ffi-scripts/withdraw.js 0x3beeeb6bffb83c559c3c63c9d0049ec50286776b2517c6d6ec2e0f00660d7309 0x1e0 0x1 0x0 0x0 0x0
// // forge-ffi-scripts/withdraw.js 0x03f6600c7331bd61106b32556f2676d57e81cf2b0bf6df800e6fcb4c53f56b009 0x01e0 0x01 0x0 0x0 0x0
// // forge-ffi-scripts/withdraw.js 0x09340709afb154bbd3f9ccc089c0d5f2809f63fee47f88f2effe2dfeda432e16 0x0ff 0x01 0x0 0x0 0x0
// // forge-ffi-scripts/withdraw.js 0x0872cabfcaa22225e755412927cc3595379767452f8813f4fa0af1d8b9ce9540a 0x0ff 0x01 0x0 0x0 0x0

// async function main() {
//   const mimcsponge = await buildMimcSponge()
//   const inputs = process.argv.slice(2, process.argv.length)
//   const secret_power = hexToBigint(inputs[0]) // TODO: compute hash and read from www
//   const secret = secret_power >> 8n
//   const power = secret_power & 0x1fn
//   const hash = await pedersenHash(leBigintToBuffer(secret, 31))
//   const hash_power1 = hash + power + 1n
//   const startindex = parseInt(inputs[1].replace(/^0x0*/, ''), 16) // could be int instead of hex later
//   const [betIndex, betRand, nextIndex] = findBet(hash_power1, startindex)
//   if (betIndex > 0 && betRand == 0n) {
//     throw 'bet not processed yet for ' + bigintToHex(hash_power1) + ' starting at ' + startindex.toString(16)
//   }
//   if (betIndex == 0) {
//     throw 'bet not found for ' + bigintToHex(hash_power1) + ' starting at ' + startindex.toString(16)
//   }
//   const bigindex = BigInt(betIndex)
//   const dice = await leBufferToBigint(mimcsponge.F.fromMontgomery(mimcsponge.multiHash([secret, betRand, bigindex])))

//   // 1.5. calculate reward
//   const power1 = 10n
//   const power2 = 16n
//   const power3 = 22n
//   const mask =
//     power <= power1
//       ? ((2n ** (power1 + power2 + power3 + 1n) - 1n) << power) & (2n ** (power1 + power2 + power3 + 1n) - 1n)
//       : power <= power2
//         ? (((2n ** (power2 + power3 + 1n) - 1n) << (power + power1)) | (2n ** power1 - 1n)) &
//           (2n ** (power1 + power2 + power3 + 1n) - 1n)
//         : (((2n ** (power3 + 1n) - 1n) << (power + power1 + power2)) | (2n ** (power1 + power2) - 1n)) &
//           (2n ** (power1 + power2 + power3 + 1n) - 1n)
//   const maskdice = mask & dice
//   const rew1 = maskdice & 0b1111111111n ? 0n : 1n
//   const rew2 = maskdice & 0b11111111111111110000000000n ? 0n : 1n
//   const rew3 = maskdice & 0b111111111111111111111100000000000000000000000000n ? 0n : 1n
//   const rewardbits = 4n * rew3 + 2n * rew2 + rew1

//   const terces = reverseBits(dice, 31 * 8)
//   const nullifierHash = await pedersenHash(leBigintToBuffer(terces, 31))

//   const pathElements = await getPath(betIndex, nextIndex)

//   // 4. Format witness input to exactly match circuit expectations
//   const input = {
//     // Public inputs
//     root: pathElements[32],
//     nullifierHash: nullifierHash,
//     rewardbits: rewardbits,
//     recipient: hexToBigint(inputs[2]),
//     relayer: hexToBigint(inputs[3]),
//     fee: hexToBigint(inputs[4]),
//     refund: hexToBigint(inputs[5]),
//     // Private inputs
//     secret: secret,
//     power: power,
//     rand: betRand,
//     pathIndex: BigInt(betIndex),
//     pathElements: pathElements.slice(0, 32),
//   }

//   // 5. Create groth16 proof for witness
//   const { proof } = await groth16.fullProve(
//     input,
//     path.join(__dirname, '../groth16/withdraw.wasm'),
//     path.join(__dirname, '../groth16/withdraw_final.zkey')
//   )

//   const pA = proof.pi_a.slice(0, 2)
//   const pB = proof.pi_b.slice(0, 2)
//   const pC = proof.pi_c.slice(0, 2)

//   // 6. Return abi encoded witness
//   const witness = ethers.AbiCoder.defaultAbiCoder().encode(
//     ['uint256[2]', 'uint256[2][2]', 'uint256[2]', 'uint[7]'],
//     [
//       pA,
//       // Swap x coordinates: this is for proof verification with the Solidity precompile for EC Pairings, and not required
//       // for verification with e.g. snarkJS.
//       [
//         [pB[0][1], pB[0][0]],
//         [pB[1][1], pB[1][0]],
//       ],
//       pC,
//       [
//         bigintToHex(pathElements[32]),
//         bigintToHex(nullifierHash),
//         bigintToHex(rewardbits),
//         inputs[2],
//         inputs[3],
//         inputs[4],
//         inputs[5],
//       ],
//     ]
//   )
//   return witness
// }

// main()
//   .then(wtns => {
//     process.stdout.write(wtns)
//     process.exit(0)
//   })
//   .catch(error => {
//     console.error(error)
//     process.exit(1)
//   })
