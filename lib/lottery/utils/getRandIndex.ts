type BetInLog = {
  args: {
    index: bigint
    newHash: bigint
  }
}

export function getRandIndex(hashPower1: bigint, betLogs: BetInLog[]) {
  for (let i = 0; i < betLogs.length; i++) {
    if (betLogs[i].args.newHash === hashPower1) {
      return {
        index: betLogs[i].args.index,
        leafIndex: i,
      }
    }
  }
  return {
    index: 0n,
    leafIndex: 0,
  }
}
