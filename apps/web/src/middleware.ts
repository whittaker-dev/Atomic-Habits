import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  const meUrl = new URL('/api/auth/me', request.url);
  const res = await fetch(meUrl, {
    headers: { cookie: request.headers.get('cookie') ?? '' },
  });

  if (!res.ok) {
    return NextResponse.redirect(new URL('/register', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
