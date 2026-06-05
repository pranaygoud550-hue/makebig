# Supabase migration guide (Make Big)

The app is now a **pure Next.js 14** app. Data and auth use **Supabase**; `server-new.js` (Express + MongoDB) has been removed.

## Step 1 — Supabase project setup

1. Open your Supabase project → **SQL Editor**.
2. Run `supabase/schema.sql` (tables + RLS policies).
3. Run `supabase/migrations/20260526000000_profile_and_project_extras.sql` (profile bio fields, invite notifications trigger).

## Step 2 — Environment variables

Copy `.env.example` → `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-only, never expose to client
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Enable **Email** auth in Supabase Dashboard → Authentication → Providers (Email + optional Magic Link).

## Step 3 — Typed client (`lib/supabase.ts`)

- `lib/database.types.ts` — TypeScript types from your schema.
- `lib/supabase.ts` — browser client `createClient<Database>()`.
- `lib/supabase-server.ts` — service-role client for API routes / SSR.

Regenerate types after schema changes:

```bash
npx supabase gen types typescript --project-id YOUR_REF > lib/database.types.ts
```

## Step 4 — Data layer (`lib/supabase-data.ts`)

Replaces Express handlers for:

| Old API | New function |
|---------|----------------|
| `apiGetSeed()` | `dbGetSeed()` |
| `apiUpsertUser()` | `dbUpsertUser()` |
| `apiGetProfile()` | `dbGetProfile()` |
| `apiUpsertProfile()` | `dbUpsertProfile()` |
| `apiPublishProject()` | `dbPublishProject()` |
| `apiGetNotifications()` | `dbGetNotifications()` |
| `POST /api/invites` | `dbSendInvite()` / `dbAcceptInvite()` / … |

`lib/api.ts` calls these and **requires** Supabase (`requireSupabase()`).

## Step 5 — Row Level Security

Policies are defined in `supabase/schema.sql`:

- Users read/write **own** `users` row (`auth_user_id` or `contact`).
- Profiles: public read when `available_for_invites`, own row for writes.
- Projects: public read for published; owners full control.
- Invites: sender/receiver only.
- Notifications: own rows only.

Helper functions: `current_contact()`, `is_project_member(project_uuid)`.

## Step 6 — Auth (`components/AuthModal.tsx`)

- **Sign in:** Password · Magic link · OTP (optional tab)
- **Sign up:** Email + password, then profile fields → `supabase.auth.signUp()`
- **OAuth:** Google / GitHub via Supabase

Session is stored by Supabase Auth; `useAuth` syncs the `users` table via `apiUpsertUser`.

## Step 7 — Run the app

```bash
npm run dev
```

Only Next.js runs on port **3000** (no Express on 5001).

## Step 8 — What still uses MongoDB (optional)

- `npm run seed:demo` — demo seed script (MongoDB)
- **Courses** API previously lived on Express; course routes return empty until you add a `courses` table to Supabase.

## Realtime

Notifications use **Supabase Realtime** (`postgres_changes` on `notifications`) instead of Socket.io.

## Deploy (Vercel)

Set the same env vars on Vercel. No `NEXT_PUBLIC_API_URL` to a separate API server is required.
