function shortenNumber(num: number | string): string {
  let numStr = num.toString()

  if (num === 0) {
    return '0'
  }

  if (numStr.includes('.') && /^0\.0+/.test(numStr)) {
    let decimalPart = numStr.split('.')[1]
    let leadingZeros = decimalPart.match(/^0+/)
    let significantDigits = decimalPart.replace(/^0+/, '')

    if (!significantDigits) {
      return '0'
    }

    let zerosCount = leadingZeros ? leadingZeros[0].length : 0
    significantDigits = significantDigits.replace(/0+$/, '')

    return `0.(0^${zerosCount})${significantDigits}`
  }

  if (numStr.includes('.')) {
    numStr = numStr.replace(/(\.\d*?[1-9])0+$/, '$1')
    numStr = numStr.replace(/\.0+$/, '')
  }

  return numStr
}

export { shortenNumber }
