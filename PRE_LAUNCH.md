# 🚀 Pre-Launch Checklist for Make Big

Use this before demos and before production deployment. Run automated checks first:

```bash
npm run build
npm run verify:deploy
npm run seed:demo   # optional — demo projects + posts
npm run dev
```

**Last automated audit:** build ✅ · `.env` gitignored ✅ · placeholders in `.env` (rotate before demo/deploy)

---

## ✅ Before Showing to Anyone

### Security (CRITICAL)

- [ ] **MongoDB password changed** from default `Pranay123` (Atlas → Database Access → edit user)
- [ ] **JWT_SECRET** set to a strong random value (`openssl rand -base64 32`)
- [ ] **GROQ_API_KEY** regenerated at [console.groq.com](https://console.groq.com) if it was ever shared
- [x] **`.env` not in git** — confirmed gitignored; never `git add .env`
- [ ] **Both env files updated** — root `.env` **and** `backend/.env` (keep them in sync)
- [ ] **Placeholder emails/passwords** replaced for production OTP (Gmail app password or Fast2SMS)

> After updating `.env`, restart dev: `npm run dev`

### Functionality Testing

Manual smoke test at `http://localhost:3000`:

- [ ] Sign up flow (OTP in API console when `ALLOW_DEV_OTP=true`)
- [ ] Login / session persists after refresh
- [ ] **Create project** — 3 steps: What you're building → Skills & timeline → Review & publish
- [ ] **Join project** — 2 steps: Skills → Explore & join (instant join)
- [ ] App shell loads (Home, Posts, Explore, Friends, Notifications)
- [ ] Project dashboard opens (hamburger menu)
- [ ] Kanban board — create / drag tasks
- [ ] Team members view
- [ ] Messages view
- [ ] Profile panel (edit & save)
- [ ] Logout clears session

**Demo data:** run `npm run seed:demo` for Campus Food Delivery, Blood Bank, Make Big Platform + photo posts.

### Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browser (any)

### Device Testing

- [ ] Desktop (1920×1080)
- [ ] Laptop (1366×768)
- [ ] Tablet (~768px)
- [ ] Mobile (~375px)

### Console Checks

- [ ] No red errors in browser console (F12)
- [ ] No critical warnings
- [ ] Network tab: `/api/health`, auth, projects return 200

---

## ✅ Before Production Deployment

See **[DEPLOY.md](./DEPLOY.md)** for Render + Vercel steps.

### Environment Configuration

- [ ] Production MongoDB cluster (Atlas) with strong password
- [ ] Email OTP **or** SMS OTP configured (disable `ALLOW_DEV_OTP` in production)
- [ ] `JWT_SECRET` — unique, 32+ random chars on Render
- [ ] `FRONTEND_URL` — live Vercel URL on API (Render)
- [ ] `NEXT_PUBLIC_API_URL` — live Render URL on Vercel
- [ ] All env vars set on Render **and** Vercel (not only local `.env`)

### Performance & Monitoring

- [ ] Error tracking (optional: Sentry)
- [ ] Analytics (optional: Vercel Analytics)
- [ ] MongoDB Atlas backup enabled
- [ ] Rate limiting (optional — add if traffic grows)

### Documentation

- [ ] README setup instructions current
- [ ] `.env.example` copied for new developers
- [ ] User-facing help (optional)

---

## 🎯 Quick Test Commands

```bash
npm install
npm run build
npm run verify:deploy
npm run dev
```

`verify:deploy` checks placeholders, API health, and that secrets are not exposed as `NEXT_PUBLIC_*`.

---

## 📝 Notes

- Security items first — old credentials may have been exposed in chat or logs; **rotate before any public demo**.
- Create wizard is **3 steps** (not 7); join wizard is **2 steps**.
- Local OTP: with `ALLOW_DEV_OTP=true`, OTP prints in the **API terminal**, not the browser.
- Re-seed demo content anytime: `npm run seed:demo`
