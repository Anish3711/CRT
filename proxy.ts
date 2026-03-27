import { NextResponse } from 'next/server'

export function proxy() {
  const response = NextResponse.next()
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('CDN-Cache-Control', 'no-store')
  response.headers.set('Vercel-CDN-Cache-Control', 'no-store')
  return response
}

export const config = {
  matcher: ['/api/:path*'],
}
