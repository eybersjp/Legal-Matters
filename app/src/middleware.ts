import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/portal(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (process.env.E2E_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production') {
    const isAuthenticated = req.cookies.get('mock-authenticated')?.value === 'true';
    if (isAuthenticated) {
      return NextResponse.next();
    }
    if (isProtectedRoute(req)) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (isProtectedRoute(req)) {
    await auth.protect()
  }
  return NextResponse.next();
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
}
