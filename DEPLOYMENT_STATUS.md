# Make Big — deployment status & checklist

Last checked against live URLs: **https://makebig.onrender.com** and **https://makebig.vercel.app**

---

## Current status (what we found)

| Check | Render (unified) | Vercel |
|--------|------------------|--------|
| Home page | ✅ 200 — loads | ✅ 200 — loads |
| `/api/health` | ❌ Next.js 404 HTML (Express API not reachable) | N/A |
| `/api/courses` | ❌ 404 — data features broken | ❌ Empty via `/api/public/courses` |
| `/learn` | ❌ 404 — not in deployed build | Depends on deploy |
| Explore data | ❌ Broken (API unreachable) | ❌ Empty projects list |
| Auth / projects / AI | ❌ Broken until API works | ❌ Needs `NEXT_PUBLIC_API_URL` |

**Summary:** The site **shell loads**, but **backend features are not working in production** on the current deploy. Local `npm run dev` (Mongo + Express) works; production needs a **redeploy** with the fixes below.

---

## Recommended architecture (simplest)

**Option A — One service on Render (recommended)**

- URL: `https://makebig.onrender.com`
- `SERVE_NEXT=true` + `npm run start:render` → Express API + Next.js on one port
- MongoDB Atlas for all data
- Socket.io works on same host

**Option B — Split (Render API + Vercel UI)**

- API: `https://make-big-api.onrender.com` → `npm run api:prod`
- UI: Vercel → `NEXT_PUBLIC_API_URL` = Render API URL
- Set Render `FRONTEND_URL` = Vercel URL

Pick **one** primary URL for users; avoid running both without syncing env vars.

---

## Fix before next deploy

### 1. Render environment (required)

```env
NODE_ENV=production
SERVE_NEXT=true
NEXT_PUBLIC_DATA_BACKEND=mongo
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<openssl rand -base64 32>
FRONTEND_URL=https://makebig.onrender.com
NEXT_PUBLIC_API_URL=https://makebig.onrender.com
NEXT_PUBLIC_APP_URL=https://makebig.onrender.com
NEXT_PUBLIC_SITE_URL=https://makebig.onrender.com
ALLOW_DEV_OTP=false          # production: use real OTP
EMAIL_FROM=...
EMAIL_PASS=...
GROQ_API_KEY=...             # AI co-founder
ANTHROPIC_API_KEY=...        # optional, preferred for streaming
```

### 2. Vercel (only if you keep Vercel as frontend)

```env
NEXT_PUBLIC_DATA_BACKEND=mongo
NEXT_PUBLIC_API_URL=https://makebig.onrender.com
NEXT_PUBLIC_APP_URL=https://makebig.vercel.app
NEXT_PUBLIC_SITE_URL=https://makebig.vercel.app
```

Without `NEXT_PUBLIC_API_URL`, server-side proxies hit `localhost:5001` → **empty Explore/courses**.

### 3. Build & start commands

| Platform | Build | Start |
|----------|-------|-------|
| Render unified | `npm install && npm run build` | `npm run start:render` |
| Render API-only | `npm install` | `npm run api:prod` |
| Vercel | `npm run build` | (automatic) |

### 4. Seed production data (once)

From your machine (with `MONGODB_URI` pointing at Atlas):

```bash
npm run seed:demo
```

Adds 21 courses, 3 demo projects, users, posts.

### 5. Verify after deploy

```bash
API_URL=https://makebig.onrender.com npm run verify:deploy
```

Manual smoke test:

1. `https://makebig.onrender.com/api/health` → JSON `"status":"ok"`, `"database":"connected"`
2. `https://makebig.onrender.com/api/courses?limit=5` → JSON with courses array
3. Sign in (OTP)
4. Create/join project → dashboard tasks
5. `/learn` → course list
6. AI Co-founder → streaming reply

---

## Code fix included (API + Next on Render)

`server-new.js` now **does not send `/api/*` to Next.js** when `SERVE_NEXT=true`. Previously, production could return Next 404 HTML for `/api/health` and all API routes.

**Redeploy Render** after pulling latest `main` for this to take effect.

---

## Improvements for “production perfection”

### Security (high priority)

- [ ] Set strong `JWT_SECRET` on Render (not dev fallback)
- [ ] Set `ALLOW_DEV_OTP=false` in production
- [ ] Configure `EMAIL_FROM` / `EMAIL_PASS` or Fast2SMS for real OTP
- [ ] MongoDB Atlas: restrict IP allowlist if possible (not `0.0.0.0/0` forever)
- [ ] Rotate any credentials that ever appeared in chat or commits

### Reliability

- [ ] Render free tier **sleeps** → first visit ~30s cold start; upgrade or use cron ping
- [ ] Add uptime monitor on `/api/health`
- [ ] Run `npm run test` in CI before deploy

### Product / data

- [ ] Run `seed:demo` on Atlas (or import your real data)
- [ ] Confirm `NEXT_PUBLIC_DATA_BACKEND=mongo` everywhere
- [ ] Remove unused Supabase env vars until you migrate

### Performance

- [ ] Enable MongoDB indexes (projects slug, ownerContact, courses slug)
- [ ] Consider Render **Starter** plan for always-on API

### Optional later

- [ ] Custom domain on Render + HTTPS
- [ ] Stripe webhooks URL pointing at production
- [ ] Error tracking (Sentry)
- [ ] Separate staging Render service

---

## Quick decision

| Goal | Action |
|------|--------|
| One URL, simplest | Use **only** `makebig.onrender.com`, redeploy with `render.yaml` |
| Keep Vercel UI | Set Vercel `NEXT_PUBLIC_API_URL` to working Render API, redeploy both |
| Match local dev | `NEXT_PUBLIC_DATA_BACKEND=mongo`, never Supabase stubs in prod |
