'use client'
import { BuyButton, CardWrapper, InputBox } from '../ui/CyberpunkCardLayout'
import styled from 'styled-components'

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
  return (
    <CardWrapper>
      <h1 style={{ color: 'white', fontSize: '1rem' }}>Check Ticket</h1>

      <InputBox placeholder="Enter your lottery ticket" />
      <InputBox placeholder="Enter your wallet address" />
      <BuyButton>Check Ticket</BuyButton>

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
