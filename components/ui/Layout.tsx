import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import PlayLottery from '../general/PlayLottery'
import CheckTicket from '../general/CheckTicket'
import { useLocalStorage } from 'usehooks-ts'
import { useLastPrayers } from '@/hooks/useLastPrayers'
import { _log } from '@/lib/utils/ts'
import { useLottery } from '@/providers/LotteryProvider'

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 45%);
  grid-template-rows: auto;
  gap: 20px;
  width: 100%;
  justify-content: center;
  margin: 20px 0;

  & > div {
    color: white;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
  }

  & > .full-width {
    grid-column: span 2;
    width: 100%;
  }

  & > .left {
    grid-column: 1 / 2;
  }

  & > .right {
    grid-column: 2 / 3;
  }

  & > .half {
    width: 40%;
  }

  & > .half-left {
    grid-column: 1 / 2.1;
  }

  & > .half-right {
    grid-column: 2 / 3;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;

    & > .full-width,
    & > .left,
    & > .right,
    & > .half,
    & > .half-left,
    & > .half-right {
      grid-column: span 1;
      width: 100%;
    }
`

function trimAddress(address: string) {
  if (!address) return ''
  return address.slice(0, 6) + '...' + address.slice(-4)
}

const Layout: React.FC = () => {
  const [isClient, setIsClient] = useState(false)
  const [tickets] = useLocalStorage<string[]>('lotteryTickets', [])

  const lastPrayers = useLastPrayers()
  const lottery = useLottery()

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <GridContainer>
      <div>
        <PlayLottery />
        <div className="w-full max-w-[835px] flex flex-col mb-2">
          {isClient && (
            <p className="w-full break-all whitespace-pre-wrap italic font-bold">
              <p className="py-2">Your Lottery Tickets:</p>
              <div className="!flex !gap-8 !flex-col text-sm">
                <p>{!!tickets.length ? tickets?.map((t, i) => `${t}`)?.join('\n') : '<none>'}</p>
              </div>

              <p className="py-2">Last Prayers:</p>
              <div className="!flex !gap-8 !flex-col text-sm">
                <p>
                  {lastPrayers.data?.data?.length
                    ? lastPrayers.data.data
                        .map((prayer, i) => `${trimAddress(prayer.meta.user)}: ${prayer.meta.prayer}`)
                        .join('\n')
                    : '<none>'}
                </p>
              </div>
            </p>
          )}
        </div>
      </div>
      <div>
        <CheckTicket />
        <div className="mt-4 flex flex-wrap break-all whitespace-pre-wrap">{lottery.status}</div>
      </div>
      {/* <div className="full-width">Element 3</div>
      <div className="left">Element 4</div>
      <div>
        <div className="right half">Element 5</div>
        <div className="right half">Element 6</div>
      </div>
      <div className="half-left">Element 7</div>
      <div className="half-left">Element 8</div>
      <div className="half-right">Element 9</div> */}
    </GridContainer>
  )
}

export default Layout
