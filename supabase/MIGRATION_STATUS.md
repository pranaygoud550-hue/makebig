# Supabase Migration Status

The production path now uses Supabase when these environment variables are set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Completed migration work:

- Supabase client and server admin helpers are wired in.
- Supabase Auth powers OTP/OAuth when configured.
- Supabase access tokens are accepted by backend auth middleware.
- Postgres schema and RLS policies live in `supabase/schema.sql`.
- The central API client uses Supabase for users, profiles, projects, invites, activities, messages, and notifications.
- Dashboard tasks/team data can read/write through Supabase.
- Project chat, presence, project list updates, dashboard tasks, and team changes use Supabase Realtime when configured.
- Legacy flat-file database files were removed.

Remaining legacy fallback:

- `server-new.js`, Mongoose models, and Socket.io dependencies remain as a fallback for local development until real Supabase credentials are added and `supabase/schema.sql` has been applied in the Supabase project.
- After that verification, the fallback can be deleted safely.
