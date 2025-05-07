import type { AppContext, AppProps } from 'next/app'
import NextApp from 'next/app'
import '@reown/appkit-wallet-button/react'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'

import '@/styles/globals.css'
import '@/lib/utils/node'
import { Providers } from '@/providers'

interface IAppProps extends AppProps {
  cookies: string | null
}

const ibmPlexSans = IBM_Plex_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
})

const ibmPlexMono = IBM_Plex_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
})

const Vconsole = dynamic(() => import('@/plugins/vconsole'), {
  ssr: false,
})

function App({ Component, pageProps }: IAppProps) {
  const [isDebug, setIsDebug] = useState(false)
  const cookies = pageProps.cookies ?? ''

  useEffect(() => {
    setIsDebug(localStorage?.getItem('isDebug') === 'true')
  }, [])

  return (
    <Providers {...{ cookies }}>
      {isDebug && <Vconsole />}
      <main className={`${ibmPlexSans.className} ${ibmPlexMono.className}`}>
        <Component {...pageProps} />
      </main>
    </Providers>
  )
}

App.getInitialProps = async (appContext: AppContext): Promise<IAppProps> => {
  const appProps = await NextApp.getInitialProps(appContext)
  const cookies = appContext.ctx.req?.headers?.cookie || ''

  return {
    ...appProps,
    pageProps: {
      ...appProps.pageProps,
      cookies,
    },
  } as any
}

export default App
