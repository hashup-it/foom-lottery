import '@reown/appkit-wallet-button/react'
import React from 'react'

import { _log, _warn } from '@/utils/ts'

export default function Home() {
  return (
    <div className="flex flex-col">
      <div>header</div>
      <div className="w-full flex items-center justify-start flex-col">content</div>
      <div>&copy; FOOM AI corporation 2025</div>
    </div>
  )
}
