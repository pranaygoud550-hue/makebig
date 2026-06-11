import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, authCookieOptions } from '@/lib/authCookie';
import { connectMongoServer } from '@/lib/mongoServer';
import { findUserByContact } from '@/lib/userUpsert.js';

function getJwtSecret(): string | null {
  const secret = (process.env.JWT_SECRET || '').trim();
  if (!secret || secret.includes('change-me') || secret.includes('your-secret')) {
    if (process.env.NODE_ENV === 'production') return null;
    return 'dev-only-insecure-secret';
  }
  return secret;
}

export function setAuthCookieOnResponse(
  response: NextResponse,
  token: string
): NextResponse {
  response.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions());
  return response;
}

export function clearAuthCookieOnResponse(response: NextResponse): NextResponse {
  response.cookies.set(AUTH_COOKIE_NAME, '', { ...authCookieOptions(), maxAge: 0 });
  return response;
}

export async function readSessionFromCookie(): Promise<{
  contact: string;
  userId: string;
  user: Record<string, unknown> | null;
} | null> {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const secret = getJwtSecret();
  if (!secret) return null;

  try {
    const decoded = jwt.verify(token, secret) as { contact?: string; userId?: string };
    if (!decoded.contact) return null;

    await connectMongoServer();
    const doc = await findUserByContact(decoded.contact);
    if (!doc) return null;

    return {
      contact: decoded.contact,
      userId: decoded.userId || String(doc._id),
      user: {
        id: String(doc._id),
        name: doc.name,
        contact: doc.contact,
        isLoggedIn: true,
        skills: doc.skills || [],
        hobbies: doc.hobbies || [],
        college: doc.college || '',
        graduationYear: doc.graduationYear || '',
        city: doc.city || '',
        state: doc.state || '',
        plan: doc.plan || 'free',
        badges: doc.badges || [],
        referralCount: doc.referralCount || 0,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
        verifiedSkills: doc.verifiedSkills || [],
        skillTestStatus: doc.skillTestStatus || (doc.verifiedSkills?.length ? 'completed' : 'pending'),
        pendingSkillIds: doc.pendingSkillIds || [],
        notificationPreferences: doc.notificationPreferences || {},
      },
    };
  } catch {
    return null;
  }
}
