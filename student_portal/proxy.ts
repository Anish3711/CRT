import { NextRequest, NextResponse } from 'next/server'
import { getAdminCookieName, verifyAdminSession } from '@/lib/admin-auth'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('CDN-Cache-Control', 'no-store')
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store')
    return response
  }

  const session = await verifyAdminSession(request.cookies.get(getAdminCookieName())?.value)

  if (pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (pathname === '/' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/api/:path*'],
}
