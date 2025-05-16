import { ethers } from 'ethers'
import { pedersenHash } from './utils/pedersen.js'
import { rbigint, bigintToHex, leBigintToBuffer, hexToBigint } from './utils/bigint.js'

export async function getHash(inputs) {
  let power = hexToBigint(inputs[0])
  let hash = 0n
  let secret = 0n
  let ticket = 0n
  let secret_power = 0n

  if (power >= 0x1fn) {
    secret_power = power
    console.log('Genearing Pedersen hash…')
    hash = await pedersenHash(leBigintToBuffer(secret_power >> 8n, 31))
  } else {
    for (; ticket < 10000n; ticket++) {
      secret = rbigint(31)
      console.log(`Genearing Pedersen hash no. ${ticket}…`)
      hash = await pedersenHash(leBigintToBuffer(secret, 31))
      if ((hash & 0x1fn) === 0n) {
        break
      }
    }
    if (ticket >= 10000n) {
      throw new Error('Failed to find ticket')
    }
    secret_power = (secret << 8n) | power
  }

  return {
    hash,
    secret_power,
    secret,
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  getHash(process.argv.slice(2))
    .then(res => {
      process.stdout.write(res)
      process.exit(0)
    })
    .catch(err => {
      console.error(err)
      process.exit(1)
    })
}
