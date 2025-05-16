const isStaging = () => process.env.NEXT_PUBLIC_IS_STAGING === 'true'
const isProduction = () => process.env.NODE_ENV === 'production' && !isStaging()
const isDevelopment = () => !isProduction() && !isStaging()
const isRemote = () => process.env.VERCEL === '1'
const isLocal = () => !isRemote()

const ALLOWED_HOSTS: string[] = [...(isStaging() ? ['https://foom-staging.hashup.it'] : []), 'https://foom.club', 'https://foom-lottery.hashup.it', 'https://foom.hashup.it', 'https://foom.degen.pl'] as const

export { isProduction, isDevelopment, isLocal, isRemote, isStaging, ALLOWED_HOSTS }
