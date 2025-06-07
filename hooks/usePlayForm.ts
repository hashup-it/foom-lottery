import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLotteryContract } from '@/lib/lottery/hooks/useLotteryContract'
import type { ICommitment } from '@/types/lottery'

const playSchema = z.object({
  power: z
    .number()
    .int({ message: 'Value must be an integer' })
    .min(0, { message: 'Value must be at least 0' })
    .max(31, { message: 'Value must be at most 31' }),
})

export function usePlayForm(onStatus?: (msg: string) => void) {
  const [commitment, setCommitment] = useState<ICommitment | undefined>()
  const playForm = useForm<z.infer<typeof playSchema>>({
    resolver: zodResolver(playSchema),
  })
  const { playMutation } = useLotteryContract({ onStatus })
  const power = playForm.watch('power')

  const handlePlayFormSubmit = playForm.handleSubmit(({ power }) => {
    playMutation.mutate(
      { power },
      {
        onSuccess: result => {
          if (result && result.hash) {
            setCommitment({
              secret: BigInt(result.secretPower),
              power: BigInt(power ?? 0),
              hash: BigInt(result.hash),
              rand: 0n,
              index: 0,
              leaves: [],
            })
          }
        },
      }
    )
  })

  return {
    playForm,
    playMutation,
    power,
    commitment,
    setCommitment,
    handlePlayFormSubmit,
  }
}
