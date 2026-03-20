import { NextRequest, NextResponse } from 'next/server'
import { getAdminCookieName, verifyAdminSession } from '@/lib/admin-auth'

export async function proxy(request: NextRequest) {
  const session = await verifyAdminSession(request.cookies.get(getAdminCookieName())?.value)
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (pathname === '/' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
}
