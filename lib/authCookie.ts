import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export const AUTH_COOKIE_NAME = 'makebig_session';

const MAX_AGE_SEC = 7 * 24 * 60 * 60;

export function authCookieOptions(): Partial<ResponseCookie> {
  const secure = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SEC,
  };
}

export function parseCookieToken(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}
