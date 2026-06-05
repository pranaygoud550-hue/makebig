# MongoDB + Express restore (original Make Big flow)

The Express API (`server-new.js`) and MongoDB backend are back. Use this when you want your **existing Atlas data**, **OTP auth**, **Socket.io**, and **courses** from the original stack.

## 1. `.env` settings

```env
# Use MongoDB + Express (required for old flow)
NEXT_PUBLIC_DATA_BACKEND=mongo

MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
ALLOW_DEV_OTP=true

FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional — leave empty or comment out while on Mongo:
# NEXT_PUBLIC_SUPABASE_URL=
# NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## 2. Run both servers

```bash
npm run dev
```

This starts:

- **Express API** → http://localhost:5001
- **Next.js** → http://localhost:3000

## 3. Auth

With `NEXT_PUBLIC_DATA_BACKEND=mongo`:

- Sign in / sign up use **OTP** (Express `/api/auth/send-otp` and `verify-otp`)
- Session is a **JWT** stored in `localStorage` (`auth_token`)
- Supabase password / magic link tabs are disabled when Supabase is off

## 4. What talks to MongoDB

| Feature | Path |
|---------|------|
| Users, profiles, projects | `server-new.js` → Mongoose models in `backend/models/` |
| Notifications | Socket.io + REST on Express |
| Courses | MongoDB via Express `/api/courses/*` |
| AI Co-founder stream | Express + `backend/ai/cofounder.js` (and/or Next proxy) |

`lib/api.ts` calls `http://localhost:5001/api/...` in dev (see `lib/apiBase.ts`).

## 5. Switch back to Supabase later

```env
NEXT_PUBLIC_DATA_BACKEND=supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Then run only Next if you prefer: `npm run dev:next`

## 6. Demo data (courses, projects, posts)

If **Learn** shows empty or only a few courses, seed your Atlas database:

```bash
npm run seed:demo
```

This upserts **21 courses** (5 full lesson paths + starter path per sector), **3 demo projects**, users, posts, and tasks. Requires `MONGODB_URI` in `.env`.

After seeding, restart `npm run dev` and open `/learn`.

## 7. Courses & Explore data source

| Feature | Source |
|---------|--------|
| `/learn` course list | Express `GET /api/courses` → MongoDB `courses` collection |
| Explore / search | Express `GET /api/explore`, `/api/search` |
| Projects, chat, tasks | MongoDB via Express |

The Next.js route `/api/public/courses` **proxies** to Express — it no longer returns an empty Supabase stub.

## 8. Explicit Supabase mode only when you want it

```env
NEXT_PUBLIC_DATA_BACKEND=supabase
```

Without that line, the app defaults to **mongo** (original stack), even if Supabase env vars are still in `.env`.
