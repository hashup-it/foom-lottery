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
import styled from 'styled-components'
import { usePublicClient, useAccount, useBalance } from 'wagmi'

const SliderWrapper = styled.div`
  width: 300px;
  margin: 20px;
`

const StyledSlider = styled.input.attrs({ type: 'range' })`
  width: 100%;
  height: 4px; /* wysokość suwaka */

  &::-webkit-slider-thumb {
    appearance: none;
    width: 10px;
    height: 16px;
    background-color: black;
    border-radius: 2px;
    cursor: pointer;
    border: none;
    margin-top: -6px; /* wyśrodkowanie względem tracka */
  }

  &::-moz-range-thumb {
    width: 10px;
    height: 16px;
    background-color: black;
    border-radius: 2px;
    cursor: pointer;
    border: none;
  }

  &::-webkit-slider-runnable-track {
    height: 4px;
    background-color: #ccc;
    border-radius: 2px;
  }

  &::-moz-range-track {
    height: 4px;
    background-color: #ccc;
    border-radius: 2px;
  }
`

const Labels = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 0 10px;
  font-size: 10px;
  color: white;
`

const ValueLabel = styled.div`
  margin-top: 10px;
  text-align: center;
  font-weight: bold;
`

const betMin = 1_000_000
const jackpotLevels = [1024, 65536, 4194304]

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

const tierRanges = {
  0: { start: 0, end: 10 },
  1: { start: 11, end: 16 },
  2: { start: 17, end: 22 },
}

const getPricesByTier = tierName => {
  const tierMap = { Small: 0, Medium: 1, Big: 2 }
  const tierIndex = tierMap[tierName]
  const { start, end } = tierRanges[tierIndex]
  return lotteryTiers.slice(start, end + 1).map(t => t.price)
}

function getBestTierForJackpot(jackpotIndex) {
  let bestTier = 0,
    bestOdds = Infinity
  lotteryTiers.forEach((tier, idx) => {
    const oddsStr = tier.odds[jackpotIndex]
    const denominator = parseInt(oddsStr.split('/')[1])
    if (denominator < bestOdds) {
      bestOdds = denominator
      bestTier = idx
    }
  })
  return bestTier
}

function isJackpotButtonHighlighted(index, selectedTier) {
  if (index === 0) return selectedTier <= 10
  if (index === 1) return selectedTier > 10 && selectedTier <= 16
  if (index === 2) return selectedTier > 16
  return false
}

export default function PlayLottery() {
  const [selectedTier, setSelectedTier] = useState(0)
  const [selectedJackpot, setSelectedJackpot] = useState(0)
  const [currentTicket, setCurrentTicket] = useState('Small')
  const [steps, setSteps] = useState(getPricesByTier('Small'))
  const [stepIndex, setStepIndex] = useState(0)

  const lottery = useLottery()
  const foomBalanceQuery = useFoomBalance()
  const foomPriceQuery = useFoomPrice()
  const foomPriceBigint = foomPriceQuery.data ? safeToBigint(foomPriceQuery.data) : undefined

  const foomBalanceUsd =
    foomBalanceQuery.data !== undefined && foomPriceBigint !== undefined
      ? formatUnits(foomBalanceQuery.data * foomPriceBigint.value, 18 + foomPriceBigint.decimals)
      : undefined

  const value = steps[stepIndex] || 0

  const { address } = useAccount()
  const { data: ethBalanceData } = useBalance({ address })

  useEffect(() => {
    const idx = getPricesByTier(currentTicket).indexOf(value)
    if (idx !== -1) setSelectedTier(idx + tierRanges[selectedJackpot].start)
  }, [stepIndex])

  const handleTicketChange = ticket => {
    setCurrentTicket(ticket)
    const prices = getPricesByTier(ticket)
    setSteps(prices)
    setStepIndex(0)
  }

  const getTicketValue = priceTier => {
    if (!foomPriceBigint) return '0.00'
    return Number(
      formatUnits(BigInt(priceTier) * BigInt(betMin) * foomPriceBigint.value, foomPriceBigint.decimals)
    ).toFixed(2)
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
      <Balance className="flex flex-col">
        <p>
          Your Balance: {nFormatter(foomBalanceQuery.data) ?? <SpinnerText />} FOOM ($
          {foomBalanceUsd !== undefined ? Number(foomBalanceUsd).toFixed(2) : <SpinnerText />})
        </p>
        <p>Your ETH Balance: {ethBalanceData ? `${ethBalanceData.formatted} ETH` : <SpinnerText />}</p>
      </Balance>

      <DetailsRow style={{ justifyContent: 'center', marginBottom: '1rem' }}>
        {['Small', 'Medium', 'Big'].map((label, index) => (
          <BuyButton
            key={index}
            onClick={() => {
              setSelectedJackpot(index)
              setSelectedTier(getBestTierForJackpot(index))
              handleTicketChange(label)
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

      <StyledSlider
        className="mb-2"
        min={0}
        max={steps.length - 1}
        value={stepIndex}
        step={1}
        onChange={e => setStepIndex(parseInt(e.target.value))}
      />

      {/* <ValueLabel>Price: {value}</ValueLabel> */}

      {/* <label style={{ color: 'white', fontSize: '0.5rem' }}>
        Select power:
        <InputBox
          as="select"
          value={selectedTier}
          onChange={e => setSelectedTier(parseInt(e.target.value))}
        >
          {lotteryTiers.map((tier, index) => (
            <option key={index} value={index}>
              Power {index} (Price: ${getTicketValue(tier.price)})
            </option>
          ))}
        </InputBox>
      </label> */}

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
        onClick={() => {
          lottery.play({ power: selectedTier })
          // lottery.play({ power: selectedTier, price: value })
        }}
      >
        {lottery.playMutation.isPending ? <SpinnerText /> : 'Buy lottery Ticket'}
      </BuyButton>

      <Footer>
        <ReadMoreLink>Read more</ReadMoreLink> about ticket ☐
      </Footer>
    </CardWrapper>
  )
}
