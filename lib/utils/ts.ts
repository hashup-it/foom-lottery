const _newLine = () => console.log('')
const _log = (...msg: any) => console.info(`\x1b[33m[Logger]:\x1b[0m`, ...msg)
const _logTable = (headers: string[], values: string[]): void => {
  if (!Array.isArray(headers) || !Array.isArray(values)) {
    console.error('Invalid input: headers and values must be arrays')
    return
  }

  if (headers.length !== values.length) {
    console.error('Headers and values must have the same length')
    return
  }

  const tableData: Record<string, any> = {}
  headers.forEach((header, index) => {
    tableData[header] = values[index]
  })

  console.table([tableData])
}

const _warn = (...msg: any) => console.warn(`\x1b[33m[/!\\ Warn]:\x1b[0m`, ...msg)
const _error = (...msg: any) => console.warn(`\x1b[31m[/!\\ Error]:\x1b[0m`, ...msg)

const parseIntegerSafe = (value: string | number): null | bigint => {
  let result: null | number = null

  try {
    const parsed = parseInt(`${value}`, 10)
    if (!isNaN(parsed)) {
      result = parsed
    }
  } catch {}

  return result === null ? null : BigInt(result)
}

function safeToBigint(number: string | number | bigint): { value: bigint; decimals: number } {
  let str = `${number}`

  str = str.trim().toLowerCase()
  let [base, exp] = str.split('e')
  const exponent: number = parseInt(exp || '0', 10)

  let [intPart, fracPart = ''] = base.split('.')
  intPart = intPart.replace(/^0+/, '') || '0'
  fracPart = fracPart.replace(/0+$/, '')

  let allDigits: string = intPart + fracPart
  let decimalIndex: number = intPart.length
  let newDecimalIndex: number = decimalIndex + exponent

  if (newDecimalIndex < 0) {
    allDigits = allDigits.padStart(allDigits.length + Math.abs(newDecimalIndex), '0')
    newDecimalIndex = 0
  } else if (newDecimalIndex > allDigits.length) {
    allDigits = allDigits.padEnd(newDecimalIndex, '0')
  }

  const bigintStr: string = allDigits.replace(/^0+/, '') || '0'
  const decimals: number = Math.max(0, allDigits.length - newDecimalIndex)

  return {
    value: BigInt(bigintStr),
    decimals,
  }
}

export { _log, _warn, _error, _newLine, parseIntegerSafe, _logTable, safeToBigint }
