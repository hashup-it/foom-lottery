import { ethers } from 'ethers'
import { pedersenHash } from './utils/pedersen.js'
import { rbigint, bigintToHex, leBigintToBuffer, hexToBigint } from './utils/bigint.js'
import { getData } from './utils/mask.js'
import { mimcRC } from './utils/mimcsponge.js'

////////////////////////////// MAIN ///////////////////////////////////////////

export async function generateCommitment(inputs) {
  // 1. Get secret and ticket and mask
  const data = getData(hexToBigint(inputs[0]), hexToBigint(inputs[1]), rbigint(31))
  const ticket = data.ticket
  const secret = data.secret
  const mask = data.mask
  const amount = data.amount

  // 2. Get hash
  const hash = await pedersenHash(leBigintToBuffer(secret, 31))
  const mimc = await mimcRC(hash, mask)

  // 3. Return abi encoded hash, secret, mask, mimcR, mimcC, ticket
  const res = ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint', 'uint', 'uint', 'uint', 'uint', 'uint'],
    [
      bigintToHex(hash),
      bigintToHex(secret),
      bigintToHex(mask),
      bigintToHex(mimc.R),
      bigintToHex(mimc.C),
      bigintToHex(ticket),
    ]
  )

  console.log('Play data:')
  console.log('  Amount: ', amount)
  console.log('  Ticket: ', '0x' + ticket.toString(16))
  console.log('  Secret: ', '0x' + secret.toString(16))
  console.log('  Mask:   ', '0x' + mask.toString(16))
  console.log('  Hash:   ', '0x' + hash.toString(16))
  console.log('  R:      ', '0x' + mimc.R.toString(16))
  console.log('  C:      ', '0x' + mimc.C.toString(16))

  return {
    amount: amount,
    ticket: ticket,
    secret: secret,
    mask: mask,
    hash: hash,
    R: mimc.R,
    C: mimc.C,
    data: res,
  }
}
