export interface ICommitment {
  /** @dev The ETH amount used for the bet (e.g., 3) */
  amount: bigint
  /** @dev Ticket = (secret << 8) | index — reconstructable input */
  ticket: bigint
  /** @dev Secret input used to compute commitment and proof */
  secret: bigint
  mask: bigint
  hash: bigint
  R: bigint
  C: bigint
  data: string
}

export interface ICancelBetArgs {
  betIndex: number
  mask: bigint
  pA: [bigint, bigint]
  pB: [[bigint, bigint], [bigint, bigint]]
  pC: [bigint, bigint]
  recipient: `0x${string}`
  relayer: `0x${string}`
  fee?: bigint
  refund?: bigint
}
