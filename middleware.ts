import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

let locales = ['it', 'en', 'es']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameHasLocale) return

  // Reindirizza se non c'è la lingua nell'URL
  request.nextUrl.pathname = `/it${pathname}`
  return NextResponse.redirect(request.nextUrl)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
