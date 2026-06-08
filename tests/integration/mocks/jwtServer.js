import jwt from 'jsonwebtoken';

const WEAK_MARKERS = ['change-me', 'your-secret', 'REPLACE_WITH', 'generate_random', 'your_'];

function resolveSecret() {
  const secret = (process.env.JWT_SECRET || '').trim();
  if (!secret || WEAK_MARKERS.some((m) => secret.includes(m))) {
    if (process.env.NODE_ENV === 'production') return null;
    return 'dev-only-insecure-secret';
  }
  return secret;
}

export function createAuthToken(userId, contact) {
  const secret = resolveSecret();
  if (!secret) {
    return { error: 'JWT_SECRET must be set on Vercel (openssl rand -base64 32)' };
  }
  return {
    token: jwt.sign({ userId, contact }, secret, { expiresIn: '7d' }),
  };
}
