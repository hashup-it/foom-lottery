import { zodResolver } from '@hookform/resolvers/zod'
import '@reown/appkit-wallet-button/react'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import SpinnerText from '@/components/shared/spinner-text'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLeaves } from '@/lib/lottery/hooks/useLeaves'
import { useLotteryContract } from '@/lib/lottery/hooks/useLotteryContract'
import type { ICommitment } from '@/types/lottery'
import { _log } from '@/lib/utils/ts'
import { useAppKitAccount } from '@reown/appkit/react'
import type { Address } from 'viem'

const schema = z.object({
  power: z
    .number()
    .int({ message: 'Value must be an integer' })
    .min(0, { message: 'Value must be at least 0' })
    .max(31, { message: 'Value must be at most 31' }),
})

export default function Home() {
  const [status, setStatus] = useState('')
  const [commitment, setCommitment] = useState<ICommitment>()
  const [tickets, setTickets] = useState<string[]>([])
  const [redeemHex, setRedeemHex] = useState<string>('')
  const [lotteryHashes, setLotteryHashes] = useState<string[]>([])
  const [commitIndex, setCommitIndex] = useState<number>(lotteryHashes.length)

  const account = useAppKitAccount()

  const handleStatus = (data: string) => setStatus(prev => `${prev}${prev ? '\n\n' : '\n'}> ${data}`)
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  })
  const { playMutation, cancelBetMutation, commitMutation, revealMutation, collectRewardMutation } = useLotteryContract(
    { onStatus: handleStatus }
  )
  const { data: leaves, isLoading: isLeavesLoading } = useLeaves({
    fromBlock: 0n,
    inHash: BigInt(lotteryHashes?.at(-1) || 0),
  })
  const power = form.watch('power')

  const handleMutateCommit = async () => {
    _log('Committing at hash length:', lotteryHashes.length)

    await commitMutation.mutateAsync(undefined, {
      onSuccess: receipt => {
        if (!receipt) {
          return
        }

        setCommitIndex(lotteryHashes.length)
        localStorage.setItem('commitIndex', lotteryHashes.length.toString())
      },
    })
  }

  const handleMutateReveal = async () => {
    if (leaves?.data === undefined || leaves?.newRand === undefined) {
      return
    }

    const oldRand = BigInt(leaves.newRand)
    const oldLeaves = leaves.data.map(BigInt)

    // TODO: need to track the hashes committed since the last reveal **using the Indexer** – pad with 0n if there are less than 8, e.g. do:[hash1, hash2, hash3, 0n, 0n, 0n, 0n, 0n].
    const committedHashes = lotteryHashes.slice(commitIndex)
    const padded = committedHashes.slice(0, 8).map(BigInt)
    const newHashes = [...padded, ...Array(8 - padded.length).fill(0n)]
    _log('New hashes to be revealed:', newHashes.map(h => `0x${h.toString(16)}`), 'from commit index:', commitIndex)

    await revealMutation.mutateAsync({
      oldRand,
      oldLeaves,
      newHashes,
    })

    setCommitIndex(0)
    localStorage.setItem('commitIndex', '0')
  }

  const handleFormSubmit = form.handleSubmit(({ power }) => {
    _log('Playing with:', 2 + 2 ** power, '* bet_min', ` = ${2 + 2 ** power}`)

    playMutation.mutate(
      { power },
      {
        onSuccess: result => {
          if (result && result.hash) {
            setCommitment({
              secret: result.secretPower,
              power: BigInt(power ?? 0),
              rand: leaves?.newRand!,
              index: Number(leaves?.index),
              hash: result.hash,
              leaves: leaves?.data!,
            })
          }
        },
      }
    )
  })

  useEffect(() => {
    const stored = localStorage.getItem('lotteryTickets')
    if (stored) {
      try {
        setTickets(JSON.parse(stored))
      } catch {
        setTickets([])
      }
    }
  }, [])

  useEffect(() => {
    if (commitment?.secret) {
      const ticketStr = `0x${commitment?.secret?.toString(16)}`
      setTickets(prev => {
        if (prev.includes(ticketStr)) {
          return prev
        }

        const updated = [...prev, ticketStr]
        localStorage.setItem('lotteryTickets', JSON.stringify(updated))
        return updated
      })
    }
  }, [commitment?.secret])

  /** Store the user hashes */
  useEffect(() => {
    if (commitment?.hash) {
      const hashStr = `0x${commitment?.hash?.toString(16)}`

      if (lotteryHashes.includes(hashStr)) {
        return
      }

      setLotteryHashes(prev => {
        const updated = [...prev, hashStr]
        localStorage.setItem('lotteryHashes', JSON.stringify(updated))

        return updated
      })
    }
  }, [commitment?.hash, lotteryHashes.length])

  /** Log user's latest hash stored in localstorage on page load. */
  useEffect(() => {
    const stored = localStorage.getItem('lotteryHashes')
    if (stored) {
      try {
        const hashes = JSON.parse(stored)
        setLotteryHashes(hashes)
      } catch {
        setLotteryHashes([])
      }
    }
  }, [])

  /** Print user's last hash from the hashes state */
  useEffect(() => {
    if (lotteryHashes.length) {
      const lastHash = lotteryHashes[lotteryHashes.length - 1]
      _log('Last hash:', lastHash)
    }
  }, [lotteryHashes.length])

  useEffect(() => {
    const stored = localStorage.getItem('commitIndex')
    if (stored) {
      setCommitIndex(Number(stored))
    }
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex h-[1em]" />
      <div className="w-full flex items-center justify-start flex-col gap-2">
        <h1 className="text-2xl">FOOM Lottery</h1>
        <appkit-button />

        <div className="flex flex-col gap-2 justify-center mt-8 mb-8 min-w-[25%]">
          <form onSubmit={form.handleSubmit(data => console.log(data))}>
            <div>
              <label className="block text-xs text-tertiary italic !pb-1">ETH base multiplier to bet</label>
              {form.formState.errors.power && (
                <p className="text-xs text-red-500 italic mb-2 flex-wrap break-all">
                  {form.formState.errors.power.message}
                </p>
              )}
              <div className="flex items-center flex-nowrap gap-4">
                <Input
                  type="number"
                  placeholder="ETH power (integer)"
                  {...form.register('power', { valueAsNumber: true })}
                />
                {power !== undefined && power !== null && !Number.isNaN(power) && (
                  <p className="">=&nbsp;{2 + 2 ** power}</p>
                )}
              </div>
            </div>
          </form>
          <Button
            variant="outline"
            className="mt-2"
            onClick={handleFormSubmit}
            disabled={power === undefined || power === null || Number.isNaN(power) || playMutation.isPending}
          >
            {playMutation.isPending ? <SpinnerText /> : 'Play'}
          </Button>
          <Button
            variant="outline"
            className="mt-2 disabled:!cursor-not-allowed"
            onClick={() => {
              if (commitment && leaves) {
                cancelBetMutation.mutate({
                  secret: commitment.secret,
                  power: commitment.power,
                  index: commitment.index || Number(leaves.index),
                  leaves: leaves.data,
                })
                setCommitment(undefined)
              }
            }}
          >
            {cancelBetMutation.isPending ? <SpinnerText /> : 'Cancel bet'}
          </Button>
          <div className="mt-4">
            <label className="block text-xs text-tertiary italic !pb-1">Lottery Ticket to redeem</label>
            <div className="flex items-center flex-nowrap gap-4">
              <Input
                type="text"
                placeholder="Ticket (hex, 0x…)"
                value={redeemHex}
                onChange={e => setRedeemHex(e.target.value)}
                disabled={isLeavesLoading}
              />
            </div>
          </div>
          <Button
            variant="outline"
            className="mt-2 disabled:!cursor-not-allowed"
            disabled={isLeavesLoading || !redeemHex}
            onClick={() => {
              _log('Having Leaves:', leaves, leaves?.newRand, leaves?.data)

              if (leaves && leaves.newRand && leaves.data) {
                collectRewardMutation.mutate({
                  secret: BigInt(redeemHex),
                  power: BigInt(redeemHex) & 0xffn,
                  rand: BigInt(leaves.newRand),
                  recipient: account.address as Address,
                  relayer: account.address as Address,
                  fee: 0n,
                  refund: 0n,
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
            onClick={handleMutateCommit}
          >
            {commitMutation.isPending ? <SpinnerText /> : '[Generator]: Commit'}
          </Button>

          <Button
            variant="outline"
            className="mt-2 disabled:!cursor-not-allowed"
            onClick={handleMutateReveal}
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
