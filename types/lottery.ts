export interface ICommitment {
  /** Secret input used to derive the hash */
  secret: bigint
  /** Power input (used in mask, reward calc) */
  power: bigint
  /** Random value used for uniqueness and Merkle path */
  rand: bigint
  /** Leaf index in the Merkle tree */
  index: number
  /** The computed commitment hash (uint256, < 2^256) */
  hash: bigint
  /** Optional full Merkle leaf set for proof generation */
  leaves: bigint[]
}

export interface ICancelBetArgs {
  betIndex: number
  mask: bigint
  pi_a: [bigint, bigint]
  pi_b: [[bigint, bigint], [bigint, bigint]]
  pi_c: [bigint, bigint]
  recipient: `0x${string}`
  relayer: `0x${string}`
  fee?: bigint
  refund?: bigint
}
