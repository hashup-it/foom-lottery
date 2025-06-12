import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === '/files') {
    return NextResponse.redirect('https://foom.cash/files/', 301)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/files'],
}
