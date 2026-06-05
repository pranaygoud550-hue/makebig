import cors from "cors";

function normalizeOrigin(origin) {
  if (!origin) return "";
  return origin.replace(/\/$/, "");
}

const FRONTEND_URLS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  process.env.FRONTEND_URL,
  ...(process.env.CORS_EXTRA_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
]
  .filter(Boolean)
  .map(normalizeOrigin);

const allowVercelPreviews =
  process.env.CORS_ALLOW_VERCEL_PREVIEWS === "true" ||
  process.env.CORS_ALLOW_VERCEL_PREVIEWS === "1";

/** Allow any localhost port in development (Next.js often picks 3002–3005+). */
function isLocalDevOrigin(origin) {
  if (!origin) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function isVercelPreviewOrigin(origin) {
  if (!allowVercelPreviews || !origin) return false;
  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === "https:" && hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  if (FRONTEND_URLS.includes(normalized)) return true;
  if (isVercelPreviewOrigin(normalized)) return true;
  if (process.env.NODE_ENV !== "production" && isLocalDevOrigin(origin)) return true;
  return false;
}

export const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked origin: ${origin}`));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
};

export const corsMiddleware = cors(corsOptions);

export const socketCorsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) callback(null, true);
    else callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
};
