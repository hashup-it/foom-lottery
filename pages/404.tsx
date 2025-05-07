import Link from 'next/link'

export default function Page() {
  return (
    <div className="flex flex-col w-full justify-center items-center min-h-screen">
      <div className="flex h-full flex-grow items-end text-lg">
        Please go&nbsp;
        <Link
          href="/"
          className="link underline"
        >
          Home
        </Link>
        . There is nothing here
      </div>
    </div>
  )
}
