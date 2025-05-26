import { zeroAddress, type Address } from 'viem'
import { base, baseSepolia, type Chain, foundry, mainnet } from 'viem/chains'

const ETH_LOTTERY: { [key: Chain['id']]: Address } = {
  [foundry.id]: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
  [baseSepolia.id]: zeroAddress /** TODO: */,
  [base.id]: zeroAddress /** TODO: */,
}

export { ETH_LOTTERY }
