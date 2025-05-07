import { Address, zeroAddress } from 'viem'
import jwt from 'jsonwebtoken'
import type { ITwitterAuth } from '@/hooks/use-sign-in'
import { tryParse } from '@/utils/node'

enum EAuthType {
  Local,
}

const decodeAuth = (token: string) => jwt.decode(token, { complete: true })
const getSignMessage = (nonce: string) => `Prove you own this address

${nonce}`

const getAuthHeaders = (address: Address, type = EAuthType.Local) => {
  switch (type) {
    case EAuthType.Local:
      return {
        authorization: JSON.stringify({
          token: process.env.REACT_APP_DEGEN_ADMIN_KEY || getAuth(address),
        }),
      }
  }
}
const getAuth = (address: Address) => {
  if (typeof window === 'undefined') {
    return null
  }

  return tryParse(localStorage?.getItem(getAuthKey(address))) as { token: string; address: Address }
}
const getAuthKey = (address: Address) => `jwt-appkit`

const getTwitterAuth = () => tryParse<ITwitterAuth>(localStorage.getItem('twitter'))

const isAuthExpired = () => {
  const auth = getAuth(zeroAddress)
  const decoded = decodeAuth(auth?.token || '')
  const payload = decoded?.payload as { exp: number }

  if (payload.exp < Date.now() / 1000) {
    return true
  }

  return false
}

export { decodeAuth, getSignMessage, getAuthHeaders, getAuthKey, getAuth, getTwitterAuth, isAuthExpired }
