import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const locales = ['it', 'en', 'es']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameHasLocale) return

  // Reindirizza se non c'è la lingua nell'URL. Permanente (308): con un rinvio temporaneo Google tiene
  // la radice come pagina canonica e scarta /it come duplicato
  request.nextUrl.pathname = `/it${pathname}`
  return NextResponse.redirect(request.nextUrl, 308)
}

export const config = {
  matcher: [
    '/((?!api|_next|.*\\..*).*)',
  ],
}
