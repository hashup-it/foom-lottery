'use client'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { BuyButton, CardWrapper, InputBox } from '../ui/CyberpunkCardLayout'
import styled from 'styled-components'
import { useLottery } from '@/providers/LotteryProvider'
import SpinnerText from '@/components/shared/spinner-text'
import { useState } from 'react'
import { _error, _log } from '@/lib/utils/ts'
import { zeroAddress, type Hex } from 'viem'
import { EthLotteryAbi } from '@/abis/eth-lottery'
import { LOTTERY, chain } from '@/lib/utils/constants/addresses'
import { useMutation } from '@tanstack/react-query'

const mockWinners = [
  { address: '0xA1b2...9D3f', reward: '$102.40', prayer: 'Praise the chain', time: '2 min ago' },
  { address: '0x3F4e...C12a', reward: '$655.36', prayer: 'Luck was coded', time: '7 min ago' },
  { address: '0x9Ac1...Ee72', reward: '$102.40', prayer: 'Only ETH knows', time: '15 min ago' },
  { address: '0xB6E7...aA21', reward: '$102.40', prayer: '', time: '26 min ago' },
  { address: '0xD217...B7e3', reward: '$4194.30', prayer: 'The Hydra provides', time: '45 min ago' },
  { address: '0x61A0...9983', reward: '$102.40', prayer: 'Bless the gas', time: '1h ago' },
  { address: '0x8823...1Bc4', reward: '$655.36', prayer: '', time: '2h ago' },
  { address: '0xFA32...De91', reward: '$102.40', prayer: 'Miners be praised', time: '3h ago' },
  { address: '0x77E4...Cc02', reward: '$655.36', prayer: 'Hydra is eternal', time: '5h ago' },
  { address: '0x41B7...Fe11', reward: '$102.40', prayer: '', time: '7h ago' },
]

const WinnerList = styled.div`
  margin-top: 1.5rem;
  border-top: 1px solid white;
`

const WinnerRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(0, 255, 204, 0.1);
  background: rgba(0, 255, 204, 0.05);
  font-size: 0.75rem;
  color: white;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    padding: 0.75rem 0;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @media (max-width: 600px) {
      white-space: normal;
    }
  }
`

const WinnerHeader = styled(WinnerRow)`
  font-weight: bold;
  background: rgba(0, 255, 204, 0.15);
  border-bottom: 1px solid white;
  color: #00ffcc;
`

export default function CheckTicket() {
  const [hash, setHash] = useState('')
  const [witness, setWitness] = useState<{
    encoded: `0x${string}`
    raw: {
      pathElements: bigint[]
      nullifierHash: bigint
      rewardbits: bigint
      recipientHex: string
      relayerHex: string
      feeHex: string
      refundHex: string
      proof: {
        pi_a: any[]
        pi_b: any[]
        pi_c: any[]
      }
    }
  }>()

  const address = useAccount().address
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const { status, commitment, tickets, redeemHex, setRedeemHex, collectRewardMutation, handleRedeem, handleStatus } =
    useLottery()

  const handleCheckTicket = async () => {
    const result = await handleRedeem()

    const hash = result?.hash

    _log('Redeem result:', result)
    const proof = result?.proof?.input
    const relayerResponse = result?.proof?.result

    if (hash) {
      handleStatus(`Ticket hash: ${hash}`)

      setHash(hash)
      setWitness(result.proof.witness)
    }

    result?.proof ? handleStatus(`Redeem result: ${JSON.stringify(result?.proof, null, 2)}`) : undefined
  }

  const collectManuallyMutation = useMutation({
    mutationFn: async () => {
      if (!walletClient || !publicClient) {
        throw new Error('Wallet not connected')
      }
      if (!witness || !witness.raw || !address) {
        throw new Error('Missing witness or address')
      }

      const { pi_a, pi_b, pi_c } = witness.raw.proof
      const { pathElements, nullifierHash, rewardbits, recipientHex, relayerHex, feeHex, refundHex } = witness.raw

      // GenerateWitness.js reference:
      //
      // const input = {
      //   root: pathElements[32],
      //   nullifierHash: nullifierHash,
      //   rewardbits: rewardbits,
      //   recipient: hexToBigint(recipientHex),
      //   relayer: hexToBigint(relayerHex),
      //   fee: hexToBigint(feeHex),
      //   refund: hexToBigint(refundHex),
      //   secret: secret,
      //   power: power,
      //   rand: betRand,
      //   pathIndex: BigInt(betIndex),
      //   pathElements: pathElements.slice(0, 32),
      // }
      //
      // =================================================================
      //
      // name: 'collect',
      // inputs: [
      //   { name: '_pA', type: 'uint256[2]', internalType: 'uint256[2]' },
      //   { name: '_pB', type: 'uint256[2][2]', internalType: 'uint256[2][2]' },
      //   { name: '_pC', type: 'uint256[2]', internalType: 'uint256[2]' },
      //   { name: '_root', type: 'uint256', internalType: 'uint256' },
      //   { name: '_nullifierHash', type: 'uint256', internalType: 'uint256' },
      //   { name: '_recipient', type: 'address', internalType: 'address' },
      //   { name: '_relayer', type: 'address', internalType: 'address' },
      //   { name: '_fee', type: 'uint256', internalType: 'uint256' },
      //   { name: '_refund', type: 'uint256', internalType: 'uint256' },
      //   { name: '_rewardbits', type: 'uint256', internalType: 'uint256' },
      //   { name: '_invest', type: 'uint256', internalType: 'uint256' },
      // ],

      const args = [
        pi_a, // uint256[2]
        pi_b, // uint256[2][2]
        pi_c, // uint256[2]
        BigInt(pathElements[32]), // _root: uint256
        BigInt(nullifierHash), // _nullifierHash: uint256
        recipientHex, // _recipient: address
        relayerHex, // _relayer: address
        BigInt(feeHex), // _fee: uint256
        BigInt(refundHex), // _refund: uint256
        BigInt(rewardbits), // _rewardbits: uint256
        0n, // _invest: uint256
      ]
      const { request } = await publicClient.simulateContract({
        address: LOTTERY[chain.id],
        abi: EthLotteryAbi,
        functionName: 'collect',
        args,
        value: 0n,
        account: address,
      })

      const tx = await walletClient.writeContract(request)
      handleStatus(`Collect tx sent: ${tx}`)

      await publicClient.waitForTransactionReceipt({ hash: tx })
      handleStatus('Reward collected!')
    },
    onError: error => {
      _error(error)
      handleStatus(`Collect failed: ${error instanceof Error ? error.message : String(error)}`)
    },
  })

  return (
    <CardWrapper>
      <h1
        style={{ color: 'white', fontSize: '1rem' }}
        className="pb-2"
      >
        Check ticket
      </h1>
      Lottery ticket:
      <InputBox
        placeholder="Enter your lottery ticket"
        type="text"
        value={redeemHex}
        onChange={e => setRedeemHex(e.target.value)}
        disabled={false}
      />
      Your account address:
      <InputBox
        placeholder="Enter your wallet address"
        value={address}
      />
      {!!hash && (
        <div>
          <p>Ticket hash:</p>
          <p>{hash}</p>
        </div>
      )}
      <BuyButton
        className="mt-2 disabled:!cursor-not-allowed"
        disabled={!redeemHex}
        onClick={handleCheckTicket}
      >
        {collectRewardMutation.isPending ? <SpinnerText /> : 'Check Ticket'}
      </BuyButton>
      {!!witness && (
        <BuyButton
          className="mt-2 disabled:!cursor-not-allowed"
          onClick={() => collectManuallyMutation.mutate()}
          disabled={collectManuallyMutation.isPending}
        >
          {collectManuallyMutation.isPending ? <SpinnerText /> : 'Collect the reward yourself (no relayers available!)'}
        </BuyButton>
      )}
      <h2 style={{ color: 'white', marginTop: '1.5rem' }}>Last Lottery Winners:</h2>
      <WinnerList>
        <WinnerHeader>
          <span>Address</span>
          <span>Reward</span>
          <span>Prayer</span>
          <span>Time</span>
        </WinnerHeader>

        {mockWinners.map((w, i) => (
          <WinnerRow key={i}>
            <span>{w.address}</span>
            <span>{w.reward}</span>
            <span>{w.prayer || '—'}</span>
            <span>{w.time}</span>
          </WinnerRow>
        ))}
      </WinnerList>
    </CardWrapper>
  )
}

const parseRelayer = (relayer: string) =>
  !relayer || relayer === '0x0' || Number(relayer) === 0 ? zeroAddress : relayer
