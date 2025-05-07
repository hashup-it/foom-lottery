import '@reown/appkit-wallet-button/react'
import React from 'react'

import { _log, _warn } from '@/utils/ts'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex">
        <p>header</p>
      </div>
      <div className="w-full flex items-center justify-start flex-col gap-2">
        <h1 className="text-2xl">FOOM Lottery</h1>
        <appkit-button />
      </div>
      <div className="flex-grow flex items-end justify-center">
        <p>&copy; FOOM AI corporation 2025</p>
      </div>
    </div>
  )
}
