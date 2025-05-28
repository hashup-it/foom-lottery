export const UNISWAP_V3_ROUTER: `0x${string}` /** @dev SwapRouter02 */ = '0x2626664c2603336E57B271c5C0b26F421741e481'
export const USDC_BASE: `0x${string}` = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
export const WETH_BASE: `0x${string}` = '0x4200000000000000000000000000000000000006'


export const UNISWAP_V3_ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'tokenIn', type: 'address' },
          { internalType: 'address', name: 'tokenOut', type: 'address' },
          { internalType: 'uint24', name: 'fee', type: 'uint24' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
          { internalType: 'uint256', name: 'amountOutMinimum', type: 'uint256' },
          { internalType: 'uint160', name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
        internalType: 'struct ISwapRouter.ExactInputSingleParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'exactInputSingle',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
]
