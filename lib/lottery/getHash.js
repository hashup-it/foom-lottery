import { pedersenHash } from './utils/pedersen.js'
import { rbigint, bigintToHex, leBigintToBuffer, hexToBigint } from './utils/bigint.js'

export async function getHash(inputs) {
  const [nextIndex, blockNumber, lastRoot, lastLeaf] = readLast()

  let power = hexToBigint(inputs[0])
  let hash = 0n
  let secret = 0n
  let i = 0n
  let secret_power = 0n
  if (power >= 0x1fn) {
    secret_power = power
    hash = await pedersenHash(leBigintToBuffer(secret_power >> 8n, 31))
  } else {
    for (; i < 10000n; i++) {
      secret = rbigint(31)
      hash = await pedersenHash(leBigintToBuffer(secret, 31))
      if ((hash & 0x1fn) == 0n) {
        ticket = i
        break
      }
    }
    if (ticket >= 10000n) {
      throw new Error('Failed to create ticket')
    }
    secret_power = (secret << 8n) | power
  }

  return {
    secret_power: bigintToHex(secret_power),
    hash: bigintToHex(hash),
    nextIndex: bigintToHex(nextIndex),
    blockNumber: bigintToHex(blockNumber),
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
