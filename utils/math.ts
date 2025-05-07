const preserveNumber = (num: number | string) => (typeof num === 'string' ? num : num.toFixed(10))

export { preserveNumber }
