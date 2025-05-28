import { isRemote } from '@/lib/utils/environment'
import { zeroAddress, type Address } from 'viem'
import { base, baseSepolia, type Chain, foundry, mainnet } from 'viem/chains'

const LOTTERY: { [key: Chain['id']]: Address } = {
  [foundry.id]: '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0',
  [baseSepolia.id]: zeroAddress /** TODO: */,
  [base.id]: zeroAddress /** TODO: */,
}

const FOOM: { [key: Chain['id']]: Address } = {
  [foundry.id]: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
  [baseSepolia.id]: zeroAddress /** TODO: */,
  [base.id]: '0x02300aC24838570012027E0A90D3FEcCEF3c51d2',
}

const chain = isRemote() ? base : foundry

export { LOTTERY, FOOM, chain }
