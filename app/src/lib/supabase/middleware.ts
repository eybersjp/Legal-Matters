import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production') {
    const isAuthenticated = request.cookies.get('mock-authenticated')?.value === 'true';
    const path = request.nextUrl.pathname;
    
    if (!isAuthenticated && (path.startsWith('/dashboard') || path.startsWith('/portal'))) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    
    if (isAuthenticated && (path === '/login' || path === '/register')) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // refreshing token
  const { data: { user } } = await supabase.auth.getUser();

  // Route security blocks (Protecting Dashboard and Portal routes)
  const path = request.nextUrl.pathname;
  if (!user && (path.startsWith('/dashboard') || path.startsWith('/portal'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Prevent logged-in users from seeing Auth page again
  if (user && (path === '/login' || path === '/register')) {
    const url = request.nextUrl.clone();
    const role = user.user_metadata?.role;
    url.pathname = role === 'Client' ? '/portal' : '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
