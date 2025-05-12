import { zodResolver } from '@hookform/resolvers/zod'
import '@reown/appkit-wallet-button/react'
import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import SpinnerText from '@/components/shared/spinner-text'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { generateCommitment } from '@/lib/lottery/generateCommitment'
import { useLeaves } from '@/lib/lottery/hooks/useLeaves'
import { useLotteryContract } from '@/lib/lottery/hooks/useLotteryContract'
import type { ICommitment } from '@/types/lottery'
import { _log } from '@/lib/utils/ts'

const generateValidBetAmounts = (betMin = 1, maxPower = 22) =>
  Array.from({ length: maxPower + 1 }, (_, i) => betMin * (2 + 2 ** i))
const validAmounts = generateValidBetAmounts()
const schema = z.object({
  amount: z.number().refine(val => validAmounts.includes(val), {
    message: 'Invalid amount — must be a valid bet amount',
  }),
})

export default function Home() {
  const [status, setStatus] = React.useState('')
  const [state, setState] = React.useState<ICommitment>()
  const [tickets, setTickets] = React.useState<string[]>([])

  const handleStatus = (data: string) => setStatus(prev => `${prev}${prev ? '\n\n' : '\n'}> ${data}`)
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  })
  const { playMutation, cancelBetMutation, commitMutation, revealMutation, collectRewardMutation } = useLotteryContract(
    { onStatus: handleStatus }
  )
  const { data: leaves, isLoading: isLeavesLoading } = useLeaves({
    fromBlock: 0n,
    inR: state?.R,
    inC: state?.C,
  })

  const handleFormSubmit = form.handleSubmit(({ amount }) => {
    playMutation.mutate(
      { amount },
      {
        onSuccess: ({ commitment }) => {
          setState(commitment)
        },
      }
    )
  })

  React.useEffect(() => {
    const stored = localStorage.getItem('lotteryTickets')
    if (stored) {
      try {
        setTickets(JSON.parse(stored))
      } catch {
        setTickets([])
      }
    }
  }, [])

  React.useEffect(() => {
    if (state?.ticket) {
      const ticketStr = `0x${state?.ticket?.toString(16)}`
      setTickets(prev => {
        if (prev.includes(ticketStr)) {
          return prev
        }

        const updated = [...prev, ticketStr]
        localStorage.setItem('lotteryTickets', JSON.stringify(updated))
        return updated
      })
    }
  }, [state?.ticket])

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex h-[1em]" />
      <div className="w-full flex items-center justify-start flex-col gap-2">
        <h1 className="text-2xl">FOOM Lottery</h1>
        <appkit-button />

        <div className="flex flex-col gap-2 justify-center mt-8 mb-8 min-w-[25%]">
          <form onSubmit={form.handleSubmit(data => console.log(data))}>
            <div>
              <label className="text-xs text-tertiary italic">Amount of ETH to deposit</label>
              {form.formState.errors.amount && (
                <p className="text-xs text-red-500 italic mb-2 flex-wrap break-all">
                  {form.formState.errors.amount.message}
                </p>
              )}
              <div className="flex flex-nowrap gap-4">
                <Input
                  type="number"
                  placeholder="ETH amount"
                  {...form.register('amount', { valueAsNumber: true })}
                  defaultValue={3}
                />
              </div>
            </div>
          </form>
          <Button
            variant="outline"
            className="mt-2"
            onClick={handleFormSubmit}
          >
            {playMutation.isPending ? <SpinnerText /> : 'Play'}
          </Button>
          <Button
            variant="outline"
            className="mt-2 disabled:!cursor-not-allowed"
            onClick={() => {
              if (state && leaves) {
                cancelBetMutation.mutate({ state, leaves })
                setState(undefined)
              }
            }}
          >
            {cancelBetMutation.isPending ? <SpinnerText /> : 'Cancel bet'}
          </Button>
          <Button
            variant="outline"
            className="mt-2 disabled:!cursor-not-allowed"
            onClick={() => {
              if (state && leaves && leaves.rand && leaves.data) {
                collectRewardMutation.mutate({
                  secret: state.secret,
                  mask: state.mask,
                  rand: BigInt(leaves.rand),
                  recipient: (window as any).ethereum.selectedAddress,
                  relayer: (window as any).ethereum.selectedAddress,
                  fee: 0n,
                  refund: 0n,
                  invest: 0n,
                  leaves: leaves.data,
                })
              }
            }}
          >
            {collectRewardMutation.isPending ? <SpinnerText /> : 'Collect'}
          </Button>
          <Button
            variant="outline"
            className="mt-2 disabled:!cursor-not-allowed mb-4"
            onClick={() => {}}
          >
            {cancelBetMutation.isPending ? <SpinnerText /> : 'Restore leftover ETH (.payOut)'}
          </Button>

          <Button
            variant="outline"
            className="mt-2 disabled:!cursor-not-allowed"
            onClick={() => commitMutation.mutateAsync()}
          >
            {commitMutation.isPending ? <SpinnerText /> : '[Generator]: Commit'}
          </Button>

          <Button
            variant="outline"
            className="mt-2 disabled:!cursor-not-allowed"
            onClick={() => revealMutation.mutateAsync()}
          >
            {revealMutation.isPending ? <SpinnerText /> : '[Generator]: Reveal'}
          </Button>
        </div>
        <div className="w-full max-w-[835px] flex flex-col mb-2">
          <p className="w-full break-all whitespace-pre-wrap italic font-bold">
            Lottery Tickets:{'\n'}
            {!!tickets.length ? tickets?.map((t, i) => `${i + 1}. ${t}`)?.join('\n') : '<none>'}
          </p>
        </div>
        <div className="w-full max-w-[835px] flex flex-col mb-2">
          <p className="w-full break-all whitespace-pre-wrap">Status:{status || '\n<none>'}</p>
        </div>
      </div>

      <div className="flex-grow flex items-end justify-center">
        <p>&copy; FOOM AI corporation 2025</p>
      </div>
    </div>
  )
}
