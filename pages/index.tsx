import '@reown/appkit-wallet-button/react'
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { _log, _warn } from '@/utils/ts'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  })

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex h-[1em]" />
      <div className="w-full flex items-center justify-start flex-col gap-2">
        <h1 className="text-2xl">FOOM Lottery</h1>
        <appkit-button />
        <div className="flex flex-col gap-2 justify-center mt-8 w-1/4">
          <form onSubmit={form.handleSubmit(data => console.log(data))}>
            <div>
              <label className="text-xs text-tertiary italic">Amount of ETH deposited</label>
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
                />
              </div>
            </div>
          </form>

          <Button
            variant="outline"
            className="mt-2"
            onClick={form.handleSubmit(data => console.log(data))}
          >
            Continue
          </Button>
        </div>
        <div className="w-1/2 flex flex-col gap-1">
          <p>Status:</p>
          <p className="whitespace-pre w-full">{status}</p>
        </div>
      </div>
      <div className="flex-grow flex items-end justify-center">
        <p>&copy; FOOM AI corporation 2025</p>
      </div>
    </div>
  )
}
