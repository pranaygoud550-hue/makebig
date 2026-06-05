import jwt from "jsonwebtoken";
import { verifySupabaseToken } from "../../lib/supabaseServer.js";

const WEAK_MARKERS = [
  "change-me",
  "your-secret",
  "REPLACE_WITH",
  "generate_random",
  "your_",
];

function isWeakSecret(secret) {
  if (!secret?.trim()) return true;
  const s = secret.trim();
  return WEAK_MARKERS.some((marker) => s.includes(marker));
}

function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (isWeakSecret(secret)) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "JWT_SECRET must be set to a strong random value in production (openssl rand -base64 32)"
      );
    }
    console.warn("[auth] JWT_SECRET not set — using insecure dev fallback");
    return "dev-only-insecure-secret";
  }
  return secret.trim();
}

/** Lazy — .env is loaded after ESM imports in server-new.js; read secret on first use. */
let cachedSecret;
function jwtSecret() {
  if (!cachedSecret) cachedSecret = resolveJwtSecret();
  return cachedSecret;
}

export function generateToken(userId, contact) {
  return jwt.sign({ userId, contact }, jwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, jwtSecret());
  } catch (error) {
    return null;
  }
}

export async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  const supabaseUser = await verifySupabaseToken(token);
  if (supabaseUser) {
    req.user = supabaseUser;
    return next();
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid token" });
  }

  req.user = decoded;
  next();
}

// Socket.io auth middleware — token optional for read-only global events
export function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    socket.user = null;
    return next();
  }

  verifySupabaseToken(token)
    .then((supabaseUser) => {
      if (supabaseUser) {
        socket.user = supabaseUser;
        next();
        return;
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error("Invalid token"));
      }

      socket.user = decoded;
      next();
    })
    .catch(() => next(new Error("Invalid token")));
  return;
}
