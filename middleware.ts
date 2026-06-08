import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/authCookie';

export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);

  if (!hasSession && request.nextUrl.pathname.startsWith('/profile')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('auth', 'signin');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/profile/:path*'],
};
