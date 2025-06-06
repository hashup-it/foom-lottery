import { keccak256, encodePacked } from 'viem'

export function keccak256Abi(value: bigint): `0x${string}` {
  return keccak256(encodePacked(['uint256'], [value]))
}

export function keccak256Uint(value: bigint): `0x${string}` {
  return keccak256(encodePacked(['uint256'], [value]))
}
