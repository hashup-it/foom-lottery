import type { AppContext, AppProps } from 'next/app'
import NextApp from 'next/app'
import '@reown/appkit-wallet-button/react'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

import '@/styles/globals.css'
import '@/lib/utils/node'
import { Providers } from '@/providers'
import { Toaster } from '@/components/ui/sonner'
import BackgroundWrapper from '@/components/ui/backgroundWrapper'
import { GlobalStyles } from '@/styles/globalStyled'

interface IAppProps extends AppProps {
  cookies: string | null
}

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
    <BackgroundWrapper>
      <GlobalStyles />
      <Providers {...{ cookies }}>  
        {isDebug && <Vconsole />}
        <main>  
          <Component {...pageProps} />
        </main>
        <Toaster />

      </Providers>
    </BackgroundWrapper> 
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
