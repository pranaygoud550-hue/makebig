# Make Big — go live checklist

Everything you need to get **all features working** on `makebig.vercel.app` + `makebig.onrender.com`.

---

## Architecture (do not mix these up)

```
Browser → Vercel (Next.js UI)
              ↓ NEXT_PUBLIC_API_URL
         Render (Express server-new.js)
              ↓ MONGODB_URI
         MongoDB Atlas
```

- **Git push alone does not update the live site** — Vercel and Render must deploy.
- **Frontend features** (new homepage, Agent tab, Connect GitHub card) → **Vercel**
- **API + AI + crons + sockets** → **Render**

---

## Phase 1 — Code on GitHub

- [ ] Push latest `main` to `https://github.com/pranaygoud550-hue/makebig`
- [ ] Confirm latest commit on GitHub matches what you expect (`git log -1`)

---

## Phase 2 — Remove demo data from production MongoDB

Demo projects (Campus Food Delivery, etc.) appear because `npm run seed:demo` was run against **production Atlas**.

### Step A — Preview what will be deleted

On your machine, with production `MONGODB_URI` in `.env` or `backend/.env`:

```bash
npm run cleanup:demo
```

### Step B — Delete demo data

```bash
npm run cleanup:demo -- --confirm
```

Optional — also remove seeded `/learn` courses tied to demo:

```bash
npm run cleanup:demo -- --confirm --courses
```

**Never run `npm run seed:demo` against production again.** Use it only with a local/dev MongoDB.

After deploy (Phase 4), demo accounts `@demo.makebig.in` are also **hidden** from public browse/showcase/stats even if any remain in DB.

---

## Phase 3 — Render (backend API)

Dashboard: [render.com](https://render.com) → your **make-big-api** (or `makebig`) web service.

### Build & start

| Setting | Value |
|---------|--------|
| Build Command | `npm install` |
| Start Command | `npm run api:prod` |
| Health Check | `/api/health` |

### Required environment variables

Generate copy-paste blocks locally:

```bash
npm run deploy:env
```

Paste the **RENDER** block into Render → Environment.

| Variable | Required for | How to get |
|----------|--------------|------------|
| `MONGODB_URI` | Everything | MongoDB Atlas → Connect |
| `JWT_SECRET` | Login / auth | `openssl rand -base64 32` |
| `FRONTEND_URL` | CORS | `https://makebig.vercel.app` |
| `CORS_EXTRA_ORIGINS` | CORS | Same as FRONTEND_URL |
| `CORS_ALLOW_VERCEL_PREVIEWS` | Preview deploys | `true` |
| `ALLOW_DEV_OTP` | Security | `false` in production |
| `NODE_ENV` | Production mode | `production` |
| `NEXT_PUBLIC_DATA_BACKEND` | Data source | `mongo` |

### AI features (co-founder, agent, link reader, idea validator, pitch deck)

| Variable | Required for |
|----------|--------------|
| `GROQ_API_KEY` | All AI (free at [console.groq.com](https://console.groq.com)) |
| `ANTHROPIC_API_KEY` | Optional — streaming cofounder fallback |

Without Groq, AI tabs work in **demo placeholder mode** (not real AI).

### Email / OTP login

Pick **one**:

| Option | Variables |
|--------|-----------|
| Resend (recommended) | `RESEND_API_KEY`, `EMAIL_FROM`, `RESEND_ACCOUNT_EMAIL` |
| Gmail SMTP | `EMAIL_FROM`, `EMAIL_PASS` |
| SMS OTP (India) | `FAST2SMS_API_KEY` |

Also set on **Vercel** if OTP routes run there: `RESEND_API_KEY`, `JWT_SECRET` (same value as Render).

### Weekly AI report emails + health alert emails

| Variable | Required for |
|----------|--------------|
| `RESEND_API_KEY` | Sending emails |
| `EMAIL_FROM` | From address |
| `GROQ_API_KEY` | AI-generated report body |

Crons run inside `server-new.js` on Render (hourly/daily). **Render must stay deployed** (free tier sleeps — first request may be slow).

### Push notifications (PWA)

Generate VAPID keys once:

```bash
npx web-push generate-vapid-keys
```

Set on **Render**:

| Variable | Example |
|----------|---------|
| `VAPID_PUBLIC_KEY` | (from command above) |
| `VAPID_PRIVATE_KEY` | (from command above) |
| `VAPID_SUBJECT` | `mailto:you@yourdomain.com` |

### Stripe (optional — Pro pricing)

| Variable | Where |
|----------|--------|
| `STRIPE_SECRET_KEY` | Vercel + Render |
| `STRIPE_WEBHOOK_SECRET` | Vercel |
| `STRIPE_PRO_PRICE_ID` | Vercel |

### Deploy Render

- [ ] Save env vars
- [ ] **Manual Deploy** → Deploy latest commit (Render does not always auto-deploy on push)
- [ ] Open `https://makebig.onrender.com/api/health` → `"status":"ok"`, `"database":"connected"`

---

## Phase 4 — Vercel (frontend)

Dashboard: [vercel.com](https://vercel.com) → Make Big project.

### Connect repo

- [ ] GitHub repo: `pranaygoud550-hue/makebig`
- [ ] Production branch: `main`
- [ ] Auto-deploy on push: **enabled**

### Required environment variables

From `npm run deploy:env` → paste **VERCEL** block:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_DATA_BACKEND` | `mongo` |
| `NEXT_PUBLIC_API_URL` | `https://makebig.onrender.com` |
| `NEXT_PUBLIC_APP_URL` | `https://makebig.vercel.app` |
| `NEXT_PUBLIC_SITE_URL` | `https://makebig.vercel.app` |
| `JWT_SECRET` | **Same as Render** |
| `RESEND_API_KEY` | Same as Render (OTP emails) |
| `EMAIL_FROM` | Same as Render |

### Deploy Vercel

- [ ] **Redeploy** production from latest `main` (your live site was behind — old hero text was still deployed)
- [ ] After deploy, homepage should show **“Find your co-founder first”** (not old “Build Projects” hero)

### Link CORS back to Render

- [ ] Render → `FRONTEND_URL` = exact Vercel URL
- [ ] Redeploy Render again

---

## Phase 5 — Verify everything

```bash
API_URL=https://makebig.onrender.com npm run verify:deploy
```

### Public (no login)

| Check | URL / action | Expected |
|-------|----------------|----------|
| Health | `makebig.onrender.com/api/health` | JSON ok + connected |
| Homepage hero | `makebig.vercel.app` | New co-founder / GitHub positioning |
| Stats | Homepage counters | Real numbers (not 50+/100+ placeholder for long) |
| Explore | `/explore` | Real projects only — no Campus Food demo |
| Showcase feed | Homepage scroll | Live activity (no demo projects after cleanup) |
| Idea validator | `/idea-validator` | Real AI if Groq set |

### Logged in (sign up with OTP)

| Feature | Where | Needs |
|---------|--------|--------|
| Create project + tasks | Dashboard | Mongo + JWT |
| AI co-founder chat | Dashboard → AI tab | `GROQ_API_KEY` |
| AI link reader | Paste URL in cofounder chat | Groq + Render |
| AI agent (setup/plan/build) | Dashboard → Agent tab | Groq + Render + Vercel deploy |
| Connect GitHub card | Project dashboard | Published project + Vercel deploy |
| Smart search | Home tab search | Render `/api/public/smart-search` |
| Team chat / sockets | Project room | Render WebSocket |
| Push notifications | Browser prompt | VAPID keys on Render |
| Weekly report email | Automatic (cron) | Resend + Groq |
| Health alert email | Automatic (cron) | Resend |
| Skill verification / leaderboard | Profile + home | Mongo |
| Availability calendar | Profile tab | Render API |

### Network tab (browser DevTools)

- [ ] API calls go to `makebig.onrender.com/api/*` — **not** `localhost:5001`

---

## Phase 6 — Feature ↔ env quick reference

| Feature | Blocked if missing |
|---------|-------------------|
| Login OTP | `RESEND_API_KEY` or `EMAIL_PASS` or `FAST2SMS_API_KEY` |
| Real AI (not demo text) | `GROQ_API_KEY` on Render |
| Agent / link reader UI | Vercel redeploy + login |
| Weekly report email | `RESEND_API_KEY` + Groq |
| Push notifications | `VAPID_*` on Render |
| Empty explore | Wrong `NEXT_PUBLIC_API_URL` on Vercel |
| CORS errors | `FRONTEND_URL` on Render ≠ Vercel URL |
| Render 503 / slow first load | Free tier cold start — wait 30–60s |

---

## Phase 7 — Ongoing rules

1. **Push to GitHub** → wait for Vercel auto-deploy (check Deployments tab).
2. **Backend changes** (`server-new.js`, `backend/`) → **manual Redeploy on Render**.
3. **Never** `npm run seed:demo` on production Atlas.
4. **Rotate** `JWT_SECRET` and API keys if they were ever shared in chat or commits.

---

## One-command local prep

```bash
npm run deploy:env          # print env blocks for Render + Vercel
npm run cleanup:demo        # preview demo removal
npm run cleanup:demo -- --confirm   # remove demo from Atlas
npm test                    # 79+ tests should pass
API_URL=https://makebig.onrender.com npm run verify:deploy
```

When all phases are done, your deployed link should match local `npm run dev` behavior for real users.
