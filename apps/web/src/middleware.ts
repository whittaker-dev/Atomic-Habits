import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isDashboard = pathname.startsWith('/dashboard');

  if (!isAuthPage && !isDashboard) {
    return NextResponse.next();
  }

  const meUrl = new URL('/api/auth/me', request.url);
  const res = await fetch(meUrl, {
    headers: { cookie: request.headers.get('cookie') ?? '' },
  });
  const isAuthenticated = res.ok;

  if (isDashboard && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
