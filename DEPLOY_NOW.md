# Deploy Make Big now

Your repo: **https://github.com/pranaygoud550-hue/makebig**

---

## Step 0 — Push code to GitHub (one command)

In Terminal (paste token **only in Terminal**, never in chat):

```bash
cd "/Users/deshinipranaygoud/Desktop/make big"
export GITHUB_TOKEN=ghp_YOUR_TOKEN_HERE
node scripts/push-github.mjs
node scripts/generate-deploy-env.mjs
```

The second command prints env vars to copy into Render and Vercel.

---

## Step 1 — Render API (~15 min)

1. Open [render.com](https://render.com) → sign in with GitHub.
2. **New** → **Web Service** → select repo **`pranaygoud550-hue/makebig`**.
3. Settings:

   | Field | Value |
   |--------|--------|
   | Name | `make-big-api` |
   | Region | Singapore or closest to India |
   | Branch | `main` |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `npm run api:prod` |
   | Instance type | Free |
   | Health Check Path | `/api/health` |

4. **Environment** → paste vars from `generate-deploy-env.mjs` (Render block).
5. **Create Web Service** → wait until **Live**.
6. Test: `https://make-big-api.onrender.com/api/health`  
   Expect: `"status":"ok"` and `"database":"connected"`.

---

## Step 2 — Vercel frontend (~10 min)

1. Open [vercel.com](https://vercel.com) → **Add New Project** → import **`makebig`**.
2. Framework: **Next.js** (auto).
3. **Environment Variables** → paste Vercel block from `generate-deploy-env.mjs`.
4. Set `NEXT_PUBLIC_API_URL` to your Render URL (e.g. `https://make-big-api.onrender.com`).
5. **Deploy** → copy your Vercel URL (e.g. `https://makebig-xxx.vercel.app`).

---

## Step 3 — Link frontend ↔ API

1. **Render** → `make-big-api` → **Environment** → set `FRONTEND_URL` to your **exact** Vercel URL (no trailing slash).
2. **Manual Deploy** → Redeploy.
3. **Vercel** → update `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_SITE_URL` to the Vercel URL → Redeploy.

---

## Step 4 — Smoke test

| Test | Pass? |
|------|-------|
| Site loads on phone | |
| Sign up works (OTP on screen or email) | |
| Create project → dashboard opens | |
| Add task, post update | |

```bash
API_URL=https://make-big-api.onrender.com node scripts/verify-deploy-ready.mjs
```

---

## Share with friends

Send your **Vercel URL** in WhatsApp. First API load after sleep may take ~30s (Render free tier).

Full reference: [DEPLOY.md](./DEPLOY.md)
