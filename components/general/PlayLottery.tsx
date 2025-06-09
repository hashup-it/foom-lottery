'use client'
import { useEffect, useState } from 'react'
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
import { useFoomBalance } from '@/hooks/useFoomBalance'
import { _log, safeToBigint } from '@/lib/utils/ts'
import SpinnerText from '@/components/shared/spinner-text'
import { useFoomPrice } from '@/hooks/useFoomPrice'
import { formatUnits } from 'viem'
import { nFormatter } from '@/lib/utils/node'
import { useLottery } from '@/providers/LotteryProvider'

/** @dev 1 million FOOM ~= 0.10 USD */
const betMin = 1_000_000

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

/**
 * finds the best tier for a given jackpot index
 * @param jackpotIndex 1-3
 * @returns
 */
function getBestTierForJackpot(jackpotIndex: number) {
  let bestTier = 0
  let bestOdds = Infinity
  lotteryTiers.forEach((tier, idx) => {
    const oddsStr = tier.odds[jackpotIndex]
    const denominator = parseInt(oddsStr.split('/')[1], 10)
    if (denominator < bestOdds) {
      bestOdds = denominator
      bestTier = idx
    }
  })
  return bestTier
}

function isJackpotButtonHighlighted(index: number, selectedTier: number) {
  if (index === 0) {
    return selectedTier <= 10
  }
  if (index === 1) {
    return selectedTier > 10 && selectedTier <= 16
  }
  if (index === 2) {
    return selectedTier > 16
  }
  return false
}

export default function PlayLottery() {
  const [selectedTier, setSelectedTier] = useState(0)
  const [selectedJackpot, setSelectedJackpot] = useState(0) // 0 = small, 1 = medium, 2 = big

  const lottery = useLottery()

  const foomBalanceQuery = useFoomBalance()
  const foomPriceQuery = useFoomPrice()

  const foomPriceBigint = foomPriceQuery.data ? safeToBigint(foomPriceQuery.data) : undefined
  const foomBalanceUsd =
    foomBalanceQuery.data !== undefined && foomPriceBigint !== undefined
      ? formatUnits(foomBalanceQuery.data * foomPriceBigint.value, 18 + foomPriceBigint.decimals)
      : undefined

  const getTicketValue = (priceTier: number) => {
    if (!foomPriceBigint) {
      return '0.00'
    }
    return (
      Number(formatUnits(BigInt(priceTier) * BigInt(betMin) * foomPriceBigint.value, foomPriceBigint.decimals)).toFixed(
        2
      ) || '0.00'
    )
  }

  const tier = lotteryTiers[selectedTier]
  const ticketValue = getTicketValue(tier.price)
  const potentialWin = (
    jackpotLevels[selectedJackpot] *
    betMin *
    Number(formatUnits(foomPriceBigint?.value || 0n, foomPriceBigint?.decimals || 0))
  ).toFixed(2)
  const odds = tier.odds[selectedJackpot]

  return (
    <CardWrapper>
      {/** TODO: Use ETH instead of FOOM */}
      <Title>Buy lottery ticket</Title>
      <Balance>
        Your Balance: {nFormatter(foomBalanceQuery.data) ?? <SpinnerText />} FOOM ($
        {foomBalanceUsd !== undefined ? Number(foomBalanceUsd).toFixed(2) : <SpinnerText />})
      </Balance>

      {/* Jackpot selector buttons */}
      <DetailsRow style={{ justifyContent: 'center', marginBottom: '1rem' }}>
        {['Small', 'Medium', 'Big'].map((label, index) => (
          <BuyButton
            key={index}
            onClick={() => {
              setSelectedJackpot(index)
              setSelectedTier(getBestTierForJackpot(index))
            }}
            style={{
              width: 'auto',
              fontSize: '1rem',
              borderColor: isJackpotButtonHighlighted(index, selectedTier) ? '#00ffcc' : '#444',
              background: isJackpotButtonHighlighted(index, selectedTier) ? 'rgba(0,255,204,0.15)' : 'transparent',
              color: isJackpotButtonHighlighted(index, selectedTier) ? '#00ffcc' : 'white',
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
              Power {index} (Price: ${getTicketValue(tier.price)})
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

      <BuyButton
        disabled={lottery.playMutation.isPending}
        className="disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() =>
          lottery.play({
            power: selectedTier,
          })
        }
      >
        {lottery.playMutation.isPending ? <SpinnerText /> : 'Buy lottery Ticket'}
      </BuyButton>

      <Footer>
        <ReadMoreLink>Read more</ReadMoreLink> about ticket ☐
      </Footer>
    </CardWrapper>
  )
}
