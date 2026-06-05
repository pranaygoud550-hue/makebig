# Deploy Make Big — Vercel (frontend) + Render (API)

Split architecture (recommended):

```
Browser → Vercel (Next.js :443)
              ↓ NEXT_PUBLIC_API_URL
         Render (Express server-new.js)
              ↓ MONGODB_URI
         MongoDB Atlas
```

Socket.io and AI co-founder stream connect directly to the Render API URL from the browser.

---

## Prerequisites

- GitHub repo pushed
- MongoDB Atlas cluster + connection string
- Run locally: `npm run deploy:env` to print env blocks from your `.env`

---

## Step 1 — Render (backend API)

1. [render.com](https://render.com) → **New Web Service** → connect repo
2. Settings:

| Field | Value |
|--------|--------|
| Name | `make-big-api` |
| Build Command | `npm install` |
| Start Command | `npm run api:prod` |
| Health Check Path | `/api/health` |

3. Environment — paste from `npm run deploy:env` **RENDER** block. Minimum:

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas connection string |
| `JWT_SECRET` | `openssl rand -base64 32` |
| `FRONTEND_URL` | `https://your-app.vercel.app` (update after Vercel) |
| `CORS_EXTRA_ORIGINS` | same Vercel URL |
| `CORS_ALLOW_VERCEL_PREVIEWS` | `true` |
| `ALLOW_DEV_OTP` | `false` |
| `ANTHROPIC_API_KEY` / `GROQ_API_KEY` | AI co-founder |
| `EMAIL_FROM` / `EMAIL_PASS` | OTP email |

4. Deploy → open `https://make-big-api.onrender.com/api/health`  
   Expect: `"status":"ok"`, `"database":"connected"`

---

## Step 2 — Vercel (frontend)

1. [vercel.com](https://vercel.com) → **Add Project** → import repo
2. Framework: **Next.js** (auto)
3. Environment — paste from `npm run deploy:env` **VERCEL** block. Minimum:

| Key | Value |
|-----|--------|
| `NEXT_PUBLIC_DATA_BACKEND` | `mongo` |
| `NEXT_PUBLIC_API_URL` | `https://make-big-api.onrender.com` |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_SITE_URL` | same as APP_URL |
| `JWT_SECRET` | **same value as Render** |
| `EMAIL_FROM` / `EMAIL_PASS` | OTP fallback routes on Vercel |

4. Deploy → copy production URL

---

## Step 3 — Link CORS

1. Render → **Environment** → set `FRONTEND_URL` to exact Vercel URL
2. Set `CORS_EXTRA_ORIGINS` to same URL (comma-separate custom domains)
3. **Redeploy** Render API

---

## Step 4 — Verify

```bash
API_URL=https://make-big-api.onrender.com npm run verify:deploy
```

Smoke test on Vercel URL:

- Sign up (OTP email or dev code)
- Create project → add task
- Explore tab loads projects
- AI co-founder tab responds
- Network tab shows calls to `*.onrender.com/api/*`, not `localhost:5001`

---

## Stripe (optional)

Set on **Vercel** only:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_PRICE_ID`

Webhook URL: `https://your-app.vercel.app/api/stripe/webhook`

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS error | `FRONTEND_URL` on Render must match Vercel URL exactly |
| API calls localhost | Set `NEXT_PUBLIC_API_URL` on Vercel, redeploy |
| Database disconnected | Atlas IP allowlist `0.0.0.0/0` + check `MONGODB_URI` |
| Socket.io fails | `NEXT_PUBLIC_API_URL` must be Render URL (same host as WS) |
| AI co-founder 503 | Set `ANTHROPIC_API_KEY` or `GROQ_API_KEY` on Render |

---

## Unified Render (alternative)

To serve Next.js + API on one Render URL (`makebig.onrender.com`), use `npm run start:render` with `SERVE_NEXT=true`. See `render.yaml` history or `DEPLOYMENT_STATUS.md`. Split deploy (this doc) is preferred for Vercel CDN + Render API.
