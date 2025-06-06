'use client'
import { useState } from 'react'
import {
  CardWrapper,
  Title,
  Balance,
  InputBox,
  DetailsRow,
  InfoBlock,
  Label,
  Value,
  BuyButton,
  Footer,
  ReadMoreLink,
} from '../ui/CyberpunkCardLayout'

const betMin = 0.1

const jackpotLevels = [1024, 65536, 4194304] // Small, Medium, Big

const lotteryTiers = [
  { price: 3, odds: ['1/1024', '1/65536', '1/4194304'] },
  { price: 4, odds: ['1/512', '1/65536', '1/4194304'] },
  { price: 6, odds: ['1/256', '1/65536', '1/4194304'] },
  { price: 10, odds: ['1/128', '1/65536', '1/4194304'] },
  { price: 18, odds: ['1/64', '1/65536', '1/4194304'] },
  { price: 34, odds: ['1/32', '1/65536', '1/4194304'] },
  { price: 66, odds: ['1/16', '1/65536', '1/4194304'] },
  { price: 130, odds: ['1/8', '1/65536', '1/4194304'] },
  { price: 258, odds: ['1/4', '1/65536', '1/4194304'] },
  { price: 514, odds: ['1/2', '1/65536', '1/4194304'] },
  { price: 1026, odds: ['1/1', '1/65536', '1/4194304'] },
  { price: 2050, odds: ['1/1024', '1/32', '1/4194304'] },
  { price: 4098, odds: ['1/1024', '1/16', '1/4194304'] },
  { price: 8194, odds: ['1/1024', '1/8', '1/4194304'] },
  { price: 16386, odds: ['1/1024', '1/4', '1/4194304'] },
  { price: 32770, odds: ['1/1024', '1/2', '1/4194304'] },
  { price: 65538, odds: ['1/1024', '1/1', '1/4194304'] },
  { price: 131074, odds: ['1/1024', '1/65536', '1/32'] },
  { price: 262146, odds: ['1/1024', '1/65536', '1/16'] },
  { price: 524290, odds: ['1/1024', '1/65536', '1/8'] },
  { price: 1048578, odds: ['1/1024', '1/65536', '1/4'] },
  { price: 2097154, odds: ['1/1024', '1/65536', '1/2'] },
  { price: 4194306, odds: ['1/1024', '1/65536', '1/1'] },
]

export default function PlayLottery() {
  const [selectedTier, setSelectedTier] = useState(0)
  const [selectedJackpot, setSelectedJackpot] = useState(0) // 0 = small, 1 = medium, 2 = big

  const tier = lotteryTiers[selectedTier]
  const ticketValue = (tier.price * betMin).toFixed(2)
  const potentialWin = (jackpotLevels[selectedJackpot] * betMin).toFixed(2)
  const odds = tier.odds[selectedJackpot]

  return (
    <CardWrapper>
      <Title>Buy lottery ticket</Title>
      <Balance>Your Balance: 0.01252 ETH (3123.42$)</Balance>

      {/* Jackpot selector buttons */}
      <DetailsRow style={{ justifyContent: 'center', marginBottom: '1rem' }}>
        {['Small', 'Medium', 'Big'].map((label, index) => (
          <BuyButton
            key={index}
            onClick={() => setSelectedJackpot(index)}
            style={{
              width: 'auto',
              fontSize: '1rem',
              borderColor: selectedJackpot === index ? '#00ffcc' : '#444',
              background: selectedJackpot === index ? 'rgba(0,255,204,0.15)' : 'transparent',
              margin: '0 0.5rem',
            }}
          >
            {label}
          </BuyButton>
        ))}
      </DetailsRow>

      {/* Tier selector */}
      <label style={{ color: 'white', fontSize: '0.5rem' }}>
        Select power:
        <InputBox
          as="select"
          value={selectedTier}
          onChange={e => setSelectedTier(parseInt(e.target.value))}
        >
          {lotteryTiers.map((tier, index) => (
            <option
              key={index}
              value={index}
            >
              Power {index} (Price: ${(tier.price * betMin).toFixed(2)})
            </option>
          ))}
        </InputBox>
      </label>

      {/* Info row */}
      <DetailsRow>
        <InfoBlock>
          <Label>Ticket value</Label>
          <Value>${ticketValue}</Value>
        </InfoBlock>
        <InfoBlock>
          <Label>Winning odds</Label>
          <Value>{odds}</Value>
        </InfoBlock>
        <InfoBlock>
          <Label>Potential win</Label>
          <Value>${potentialWin}</Value>
        </InfoBlock>
      </DetailsRow>

      <BuyButton>Buy lottery Ticket</BuyButton>

      <Footer>
        <ReadMoreLink>Read more</ReadMoreLink> about ticket ☐
      </Footer>
    </CardWrapper>
  )
}
