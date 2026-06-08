import jwt from 'jsonwebtoken';
import { verifySupabaseToken } from './supabase-server';
import { parseCookieToken } from './authCookie';

export interface AuthContact {
  contact: string;
  userId?: string;
}

/** Match Express `backend/middleware/auth.js` so Next API routes accept dev JWTs. */
function getJwtSecret(): string | null {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.includes('change-me') || secret.includes('your-secret')) {
    if (process.env.NODE_ENV === 'production') return null;
    return 'dev-only-insecure-secret';
  }
  return secret;
}

export async function verifyAuthFromRequest(request: Request): Promise<AuthContact | null> {
  const header = request.headers.get('authorization');
  const cookieToken = parseCookieToken(request.headers.get('cookie'));
  const token = header?.startsWith('Bearer ') ? header.slice(7) : cookieToken;
  if (!token) return null;

  const supabaseUser = await verifySupabaseToken(token);
  if (supabaseUser?.contact) {
    return {
      contact: supabaseUser.contact.toLowerCase().trim(),
      userId: supabaseUser.userId,
    };
  }

  const secret = getJwtSecret();
  if (!secret) return null;

  try {
    const decoded = jwt.verify(token, secret) as { contact?: string; userId?: string };
    if (!decoded.contact) return null;
    return {
      contact: decoded.contact.toLowerCase().trim(),
      userId: decoded.userId,
    };
  } catch {
    return null;
  }
}

/** Alias used by some Next.js API proxy routes */
export const verifyAuthToken = verifyAuthFromRequest;
