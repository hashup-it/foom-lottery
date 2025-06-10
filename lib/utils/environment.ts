import { _log } from '@/lib/utils/ts'

const isStaging = () => process.env.NEXT_PUBLIC_IS_STAGING === 'true'
const isProduction = () => process.env.NODE_ENV === 'production' && !isStaging()
const isDevelopment = () => !isProduction() && !isStaging()
/** TODO: Do not use the Vercel variable for foom.cash deployments (vps server) */
const isRemote = () =>
  process.env.VERCEL === '1' || process.env.FORCE_REMOTE === 'true' || process.env.NODE_REMOTE === 'true'
_log('Environment:', process.env)
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
