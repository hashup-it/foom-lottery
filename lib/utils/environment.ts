import { _log } from '@/lib/utils/ts'

const isStaging = () => process.env.NEXT_PUBLIC_IS_STAGING === 'true'
const isProduction = () => process.env.NEXT_PUBLIC_NODE_ENV === 'production' && !isStaging()
const isDevelopment = () => !isProduction() && !isStaging()

const isRemote = () =>
  process.env.VERCEL === '1' ||
  process.env.NEXT_PUBLIC_IS_REMOTE === 'true' ||
  process.env.NEXT_PUBLIC_NODE_REMOTE === 'true'

_log('Environment:', {
  NEXT_PUBLIC_WC_ID: process.env.NEXT_PUBLIC_WC_ID,
  NEXT_PUBLIC_WC_NAME: process.env.NEXT_PUBLIC_WC_NAME,
  NEXT_PUBLIC_INDEXER_API: process.env.NEXT_PUBLIC_INDEXER_API,
  NEXT_PUBLIC_CONTROLLER_API: process.env.NEXT_PUBLIC_CONTROLLER_API,
  NEXT_PUBLIC_RELAYER_API: process.env.NEXT_PUBLIC_RELAYER_API,
  NEXT_PUBLIC_IS_REMOTE: process.env.NEXT_PUBLIC_IS_REMOTE,
})

typeof window === 'undefined'
  ? false
  : (() => {
      _log('Location:', window.location.hostname)
      return window.location.hostname !== 'localhost'
    })()
const isLocal = () => !isRemote()

const ALLOWED_HOSTS: string[] = [
  ...(isStaging() ? ['https://foom-staging.hashup.it'] : []),
  'https://foom.club',
  'https://foom.cash',
  'https://foom-lottery.hashup.it',
  'https://foom.hashup.it',
  'https://foom.degen.pl',
] as const

export { isProduction, isDevelopment, isLocal, isRemote, isStaging, ALLOWED_HOSTS }
