// Generates a random BigInt of specified byte length
export function rbigint(nbytes) {
  const random = crypto.getRandomValues(new Uint8Array(nbytes))
  return leBufferToBigint(random)
}

// Converts a hex string value to BigInt
export function hexToBigint(value) {
  if (typeof value === 'string') {
    return value.startsWith('0x') ? BigInt(value) : BigInt('0x' + value)
  }
  return BigInt(value)
}

// Converts a BigInt to hex string of specified length (defaults to 32 bytes)
export function bigintToHex(number, length = 32) {
  return '0x' + number.toString(16).padStart(length * 2, '0')
}

// Converts a little-endian Uint8Array (or Buffer) into a BigInt
export function leBufferToBigint(buff) {
  let res = 0n
  for (let i = 0; i < buff.length; i++) {
    res += BigInt(buff[i]) << BigInt(i * 8)
  }
  return res
}

// Converts a BigInt to a little-endian Uint8Array of specified byte length
export function leBigintToBuffer(num, byteLength) {
  if (num < 0n) throw new Error('BigInt must be non-negative')

  const buffer = new Uint8Array(byteLength)
  for (let i = 0; i < byteLength; i++) {
    buffer[i] = Number(num & 0xffn)
    num >>= 8n
  }

  return buffer
}

// Reverses bits in a BigInt up to a given bitLength
export function reverseBits(num, bitLength) {
  let res = 0n
  for (let i = 0; i < bitLength; i++) {
    res = (res << 1n) | (num & 1n)
    num >>= 1n
  }
  return res
}
