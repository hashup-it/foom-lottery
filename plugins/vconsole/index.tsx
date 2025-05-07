import { isDevelopment } from '@/utils/environment'
import { _log } from '@/utils/ts'
import VConsole from 'vconsole'

function Vconsole() {
  if (!process.env.NEXT_PUBLIC_IS_VCONSOLE && !isDevelopment()) {
    return null
  }

  new VConsole({})
  _log('VConsole initialized')

  return null
}

export default Vconsole
