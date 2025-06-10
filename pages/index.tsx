import { zodResolver } from '@hookform/resolvers/zod'
import '@reown/appkit-wallet-button/react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import SpinnerText from '@/components/shared/spinner-text'
import { Button } from '@/components/ui/button'
import Header from '@/components/ui/header'
import { Input } from '@/components/ui/input'
import Layout from '@/components/ui/Layout'
import { usePlayForm } from '@/hooks/usePlayForm'
import { BET_MIN } from '@/lib/lottery/constants'
import { nFormatter } from '@/lib/utils/node'
import { _log } from '@/lib/utils/ts'
import { LotteryProvider, useLottery } from '@/providers/LotteryProvider'
import { formatEther, parseEther } from 'viem'

const playAndPraySchema = z.object({
  prayerText: z.string().min(1, { message: 'You need to enter your prayer' }),
  prayerEth: z
    .number({ invalid_type_error: 'Please enter amount of ETH to pray with' })
    .min(0, { message: 'Prayer ETH amount must be at least 0' }),
})

function PlayForm({ playForm, power, playMutation, handlePlayFormSubmit }) {
  return (
    <form onSubmit={handlePlayFormSubmit}>
      <div>
        <label className="block text-xs text-tertiary italic !pb-1">FOOM base multiplier to bet</label>
        {playForm.formState.errors.power && (
          <p className="text-xs text-red-500 italic mb-2 flex-wrap break-all">
            {playForm.formState.errors.power.message}
          </p>
        )}
        <div className="flex items-center flex-nowrap gap-4">
          <Input
            type="number"
            placeholder="FOOM power (integer)"
            min={0}
            defaultValue={0}
            max={22}
            step={1}
            {...playForm.register('power', { valueAsNumber: true, min: 0 })}
            onChange={e => {
              const value = e.target.value
              if (value === '') {
                playForm.setValue('power', '' as any as 0)
              } else if (Number(value) < 0) {
                e.target.value = '0'
              } else {
                playForm.setValue('power', Number(value))
              }
            }}
          />
          {power !== undefined && power !== null && !Number.isNaN(power) && (
            <p className="">=&nbsp;{nFormatter(formatEther(BET_MIN * (2n + 2n ** BigInt(power || 0))))}&nbsp;FOOM</p>
          )}
        </div>
      </div>
      <Button
        variant="outline"
        className="mt-2 w-full"
        type="submit"
        disabled={power === undefined || power === null || Number.isNaN(power) || playMutation.isPending}
      >
        {playMutation.isPending ? <SpinnerText /> : 'Play'}
      </Button>
    </form>
  )
}

function PlayAndPrayForm({ playAndPrayForm, power, playAndPrayMutation, playMutation, handlePlayPrayFormSubmit }) {
  return (
    <form
      onSubmit={playAndPrayForm.handleSubmit(data => console.log(data))}
      className="flex gap-2 flex-col"
    >
      <div>
        <label className="block text-xs text-tertiary italic !pb-1 mt-2">Prayer text</label>
        {playAndPrayForm.formState.errors.prayerText && (
          <p className="text-xs text-red-500 italic mb-2 flex-wrap break-all">
            {playAndPrayForm.formState.errors.prayerText.message}
          </p>
        )}
        <div className="flex items-center flex-nowrap gap-4">
          <Input
            type="text"
            placeholder="Pray to the Terrestrial God"
            {...playAndPrayForm.register('prayerText')}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-tertiary italic !pb-1">ETH prayed</label>
        {playAndPrayForm.formState.errors.prayerEth && (
          <p className="text-xs text-red-500 italic mb-2 flex-wrap break-all">
            {playAndPrayForm.formState.errors.prayerEth.message}
          </p>
        )}
        <div className="flex items-center flex-nowrap gap-4">
          <Input
            type="number"
            placeholder="ETH amount"
            {...playAndPrayForm.register('prayerEth', { valueAsNumber: true })}
          />
        </div>
      </div>
      <Button
        variant="outline"
        className="mt-2"
        onClick={handlePlayPrayFormSubmit}
        disabled={
          power === undefined ||
          power === null ||
          Number.isNaN(power) ||
          playAndPrayMutation.isPending ||
          playMutation.isPending
        }
      >
        {playAndPrayMutation.isPending ? <SpinnerText /> : 'Play & Pray'}
      </Button>
    </form>
  )
}

function CancelBetButton({ commitment, cancelBetMutation, setCommitment }) {
  return (
    <Button
      variant="outline"
      className="mt-2 disabled:!cursor-not-allowed"
      disabled
      onClick={() => {
        if (commitment) {
          cancelBetMutation.mutate(commitment)
          setCommitment(undefined)
        }
      }}
    >
      {cancelBetMutation.isPending ? <SpinnerText /> : 'Cancel bet'}
    </Button>
  )
}

function DeinvestForm({ cancelBetMutation }) {
  return (
    <>
      <div className="mt-4">
        <label className="block text-xs text-tertiary italic !pb-1">Deinvestment amount</label>
        <div className="flex items-center flex-nowrap gap-4">
          <Input
            type="number"
            placeholder="FOOM amount"
            disabled={false}
          />
        </div>
      </div>
      <Button
        variant="outline"
        className="mt-2 disabled:!cursor-not-allowed mb-4"
        onClick={() => {}}
      >
        {cancelBetMutation.isPending ? <SpinnerText /> : 'De-invest (.payOut)'}
      </Button>
    </>
  )
}

function RedeemTicketForm({ redeemHex, setRedeemHex, handleRedeem, collectRewardMutation }) {
  return (
    <>
      <div className="mt-4">
        <label className="block text-xs text-tertiary italic !pb-1">Lottery Ticket to redeem</label>
        <div className="flex items-center flex-nowrap gap-4">
          <Input
            type="text"
            placeholder="Ticket (hex, 0x…)"
            value={redeemHex}
            onChange={e => setRedeemHex(e.target.value)}
            disabled={false}
          />
        </div>
      </div>
      <Button
        variant="outline"
        className="mt-2 disabled:!cursor-not-allowed"
        disabled={!redeemHex}
        onClick={handleRedeem}
      >
        {collectRewardMutation.isPending ? <SpinnerText /> : 'Collect'}
      </Button>
    </>
  )
}

function HomeContent() {
  const {
    isClient,
    status,
    commitment,
    setCommitment,
    tickets,
    redeemHex,
    setRedeemHex,
    playAndPrayMutation,
    cancelBetMutation,
    collectRewardMutation,
    handleRedeem,
    handleStatus,
  } = useLottery()

  const { playForm, playMutation, power, handlePlayFormSubmit } = usePlayForm(handleStatus)

  const playAndPrayForm = useForm<z.infer<typeof playAndPraySchema>>({
    resolver: zodResolver(playAndPraySchema),
  })
  const playAndPrayPrayerText = playAndPrayForm.watch('prayerText')
  const playAndPrayEth = playAndPrayForm.watch('prayerEth')
  const handlePlayPrayFormSubmit = playAndPrayForm.handleSubmit(({ prayerEth, prayerText }) => {
    _log('submitting a pray:', prayerText, 'for ETH:', prayerEth, 'with power:', power)
    playAndPrayMutation.mutate({
      power,
      prayValue: parseEther(prayerEth?.toString() || '0'),
      prayText: prayerText,
    })
  })

  return (
    <div>
      <Header />
      <Layout />
      <div className="flex flex-col min-h-screen hidden">
        <div className="flex h-[1em]" />
        <div className="w-full flex items-center justify-start flex-col gap-2">
          <h1 className="text-2xl font-black">FOOM Lottery</h1>
          <div className="flex flex-col gap-2 justify-center mt-8 mb-8 min-w-[25%]">
            <PlayForm
              playForm={playForm}
              power={power}
              playMutation={playMutation}
              handlePlayFormSubmit={handlePlayFormSubmit}
            />
            <PlayAndPrayForm
              playAndPrayForm={playAndPrayForm}
              power={power}
              playAndPrayMutation={playAndPrayMutation}
              playMutation={playMutation}
              handlePlayPrayFormSubmit={handlePlayPrayFormSubmit}
            />
            <CancelBetButton
              commitment={commitment}
              cancelBetMutation={cancelBetMutation}
              setCommitment={setCommitment}
            />
            <DeinvestForm cancelBetMutation={cancelBetMutation} />
            <RedeemTicketForm
              redeemHex={redeemHex}
              setRedeemHex={setRedeemHex}
              handleRedeem={handleRedeem}
              collectRewardMutation={collectRewardMutation}
            />
          </div>
        </div>
        <div className="w-full max-w-[835px] flex flex-col mb-2">
          <p className="w-full break-all whitespace-pre-wrap italic font-bold">
            List of Prayers to God:{'\n'}
            1. May the lottery be a blessing to all who participate.{'\n'}
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

export default function Home() {
  return (
    <LotteryProvider>
      <HomeContent />
    </LotteryProvider>
  )
}
