import React, { useEffect, useState } from 'react'

interface Props {
  loader?: string
  interval?: number
  time?: string
}

export default function SpinnerText({ loader = '...', interval = 200, time = 'duration-200' }: Props) {
  const [transparentIndex, setTransparentIndex] = useState(0)

  useEffect(() => {
    const _interval = setInterval(() => setTransparentIndex(prev => (prev + 1) % (loader.length + 1)), interval)

    return () => {
      clearInterval(_interval)
    }
  }, [])

  return (
    <span>
      {loader.split('').map((element, index) => (
        <span
          className={`inline-block whitespace-nowrap transition-all ${time} ease-out ${
            transparentIndex === index ? 'opacity-0 -translate-y-[0.125em]' : ''
          }`}
          key={`${element}_${index}`}
        >
          {element}
        </span>
      ))}
    </span>
  )
}
