# Make Big — deploy this week (Vercel + Render + MongoDB Atlas)

Follow this in order. Total time: **~2–4 hours** spread over the week.

---

## Architecture

```
Browser → Vercel (Next.js)  →  NEXT_PUBLIC_API_URL
                ↓
         Render (server-new.js)  →  MONGODB_URI (Atlas)
```

---

## Day 1 — MongoDB Atlas (~30 min)

1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) → create free cluster.
2. **Database Access** → add user (username + strong password).
3. **Network Access** → **Add IP Address** → `0.0.0.0/0` (allow Render; tighten later if you want).
4. **Connect** → **Drivers** → copy connection string:
   ```
   mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/make-big?retryWrites=true&w=majority
   ```
5. Replace `USER`, `PASS`, and keep database name `make-big`.

**Done when:** you have `MONGODB_URI` saved in a password manager.

---

## Day 2 — API on Render (~45 min)

1. Push this repo to **GitHub** (if not already).
2. [https://render.com](https://render.com) → **New** → **Web Service** → connect repo.
3. Settings:

   | Field | Value |
   |--------|--------|
   | Name | `make-big-api` |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `npm run api:prod` |
   | Health Check Path | `/api/health` |

4. **Environment** (add each):

   | Key | Value |
   |-----|--------|
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | your Atlas string |
   | `JWT_SECRET` | run `openssl rand -base64 32` and paste |
   | `FRONTEND_URL` | `https://YOUR-APP.vercel.app` (update after Day 3) |
   | `EMAIL_FROM` | Gmail address (optional but recommended) |
   | `EMAIL_PASS` | Gmail [app password](https://support.google.com/accounts/answer/185833) |
   | `GROQ_API_KEY` | optional |

5. Deploy → wait for **Live**.
6. Open: `https://make-big-api.onrender.com/api/health`  
   You should see `"status":"ok"` and `"database":"connected"`.

**Done when:** health URL works in the browser.

> Free Render services sleep after inactivity; first request may take ~30s.

---

## Day 3 — Frontend on Vercel (~30 min)

1. [https://vercel.com](https://vercel.com) → **Add New Project** → import GitHub repo.
2. Framework: **Next.js** (auto-detected).
3. **Environment Variables** (Production):

   | Key | Value |
   |-----|--------|
   | `NEXT_PUBLIC_API_URL` | `https://make-big-api.onrender.com` (no trailing slash) |
   | `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` |
   | `NEXT_PUBLIC_SITE_URL` | same as APP_URL |
   | `EMAIL_FROM` | same Gmail as Render (for OTP on Vercel) |
   | `EMAIL_PASS` | same app password |
   | `JWT_SECRET` | same as Render (if any server routes need it) |

4. Deploy → copy your Vercel URL (e.g. `https://make-big-abc.vercel.app`).
5. Go back to **Render** → set `FRONTEND_URL` to that exact URL → **Redeploy** API.

**Done when:** site loads and browser Network tab calls `https://...onrender.com/api/...`, not `localhost:5001`.

---

## Day 4 — Smoke test (~45 min)

On **desktop + phone** (use real mobile browser):

| Step | Expect |
|------|--------|
| Open site | Home / marketing loads |
| Sign up | OTP email OR dev code shown if email not set |
| Start project | Wizard completes, lands in app |
| Your project → Dashboard | Opens |
| Add task | Task appears on board |
| Home tab | Recent posts load |
| Posts tab | Can post update |
| Explore | Projects list |

If tasks fail: sign out/in; confirm project has an `id` (created via API).

**Verify API from terminal:**

```bash
API_URL=https://your-api.onrender.com node scripts/verify-deploy-ready.mjs
```

---

## Day 5 — Custom domain (optional, ~20 min)

1. **Vercel** → Project → **Domains** → add `makebig.yourcollege.in` or similar.
2. Update DNS as Vercel instructs.
3. Update `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, and Render `FRONTEND_URL` to the custom domain.
4. Redeploy both.

---

## Day 6–7 — College launch

1. You + 3 friends create **real** projects (not empty).
2. Share Vercel link in class WhatsApp / club group.
3. Pin message: “Post your capstone / hackathon team here.”
4. Watch Render logs for errors.

---

## OTP without email (beta only)

If `EMAIL_FROM` / `EMAIL_PASS` are not set on **Vercel**, sign-up still works: the app shows the **dev OTP code** on screen after “Send OTP”. Fine for a closed college test; **not** for public launch.

For production OTP: set Gmail app password on **both** Vercel and Render.

---

## Stripe Pro (optional)

1. Stripe Dashboard → Products → monthly price → copy `price_...`.
2. Vercel env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`.
3. Webhook URL: `https://your-app.vercel.app/api/stripe/webhook`.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS error in browser | `FRONTEND_URL` on Render must match Vercel URL exactly |
| API calls localhost | Set `NEXT_PUBLIC_API_URL` on Vercel, redeploy |
| Database disconnected | Check Atlas IP allowlist + `MONGODB_URI` |
| Render 502 on wake | Wait 30s, refresh; upgrade plan if needed |
| OTP never arrives | Use dev code on screen or fix Gmail app password on Vercel |

---

## Checklist (print this)

- [ ] MongoDB Atlas cluster + user + `0.0.0.0/0` IP
- [ ] Render API live + `/api/health` OK
- [ ] Vercel deployed + `NEXT_PUBLIC_API_URL` set
- [ ] Render `FRONTEND_URL` = Vercel URL
- [ ] Sign up → create project → add task → post
- [ ] Tested on phone
- [ ] 3+ real projects on the site
- [ ] Shared link in college group

---

## Local vs production

| | Local | Production |
|--|--------|------------|
| Frontend | `npm run dev` :3000 | Vercel |
| API | `npm run api:dev` :5001 | Render |
| DB | local Mongo or Atlas | Atlas only |

Copy `.env.example` → `.env` for local; never commit real `.env` to GitHub.

---

## Before you deploy (security checklist)

Do this once before sharing the link publicly:

| Check | Why |
|-------|-----|
| **Rotate secrets** if `.env` was ever committed or shared | MongoDB password, Groq key, Gmail app password |
| **`JWT_SECRET`** on Render — long random (`openssl rand -base64 32`) | Default secret lets anyone forge login tokens |
| **`MONGODB_URI`** on Render only — never `NEXT_PUBLIC_` | Database credentials must stay server-side |
| **`EMAIL_FROM` + `EMAIL_PASS`** on Vercel **and** Render | Production OTP must not show codes on screen |
| **Do not set `ALLOW_DEV_OTP=true`** in production | Prevents OTP codes leaking in API JSON |
| **`FRONTEND_URL`** on Render = exact Vercel URL | Blocks random sites from calling your API |
| **Stripe checkout** requires sign-in | Contact in Stripe metadata comes from JWT, not the client |
| **Run verify script** | `node scripts/verify-deploy-ready.mjs` |

### What stays secret (server env only)

`JWT_SECRET`, `MONGODB_URI`, `GROQ_API_KEY`, `EMAIL_PASS`, `FAST2SMS_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`

### What is public (browser-safe)

`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Auth & validation (built in)

- OTP must be verified before account creation
- Profile/project writes require Bearer token + ownership checks
- Project updates use a field whitelist (no hijacking `ownerContact`)
- Socket.io requires auth token
- Specific error messages (no generic “Something went wrong”)

---
