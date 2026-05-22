import jwt from 'jsonwebtoken';
import { verifySupabaseToken } from './supabaseServer';

export interface AuthContact {
  contact: string;
  userId?: string;
}

export async function verifyAuthFromRequest(request: Request): Promise<AuthContact | null> {
  const header = request.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;

  const supabaseUser = await verifySupabaseToken(token);
  if (supabaseUser?.contact) {
    return {
      contact: supabaseUser.contact.toLowerCase().trim(),
      userId: supabaseUser.userId,
    };
  }

  const secret = process.env.JWT_SECRET;
  if (!secret || secret.includes('change-me') || secret.includes('your-secret')) {
    return null;
  }

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
