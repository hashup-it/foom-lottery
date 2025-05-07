import { AppKitProvider } from '@/providers/app-kit'
import { type ReactNode } from 'react'

export const Providers = ({ children, cookies }: { children: ReactNode; cookies: string | null }) => (
  <AppKitProvider {...{ cookies }}>{children}</AppKitProvider>
)
