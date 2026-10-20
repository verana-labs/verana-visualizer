import { type NextRequest, NextResponse } from 'next/server'
import { legacyRedirect } from '@/lib/legacy-redirects'

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const target = legacyRedirect(pathname, searchParams)
  if (!target) return NextResponse.next()
  return NextResponse.redirect(new URL(target, request.url), 308)
}

export const config = {
  matcher: [
    '/did-directory',
    '/permissions',
    '/dashboard',
    '/trust-registries',
    '/network-graph',
    '/governance/:path*',
    '/ecosystem',
    '/developer-activity',
  ],
}
