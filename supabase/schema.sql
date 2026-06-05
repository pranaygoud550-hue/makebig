-- Make Big Supabase schema
-- Run in Supabase SQL editor or through `supabase db push`.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  legacy_mongo_id text unique,
  name text not null,
  contact text not null unique,
  skills text[] default '{}',
  hobbies text[] default '{}',
  college text default '',
  graduation_year text default '',
  city text default '',
  state text default '',
  last_active timestamptz default now(),
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.pricing_interest (
  id uuid primary key default gen_random_uuid(),
  contact text not null,
  plan text not null default 'pro',
  created_at timestamptz default now(),
  unique(contact, plan)
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  contact text not null unique,
  role text not null default 'member',
  tagline text default '',
  category_ids text[] default '{}',
  skills text[] default '{}',
  rate_min integer,
  rate_max integer,
  currency text default 'INR',
  available_for_invites boolean default true,
  bio text default '',
  portfolio text default '',
  profile_image text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  legacy_mongo_id text unique,
  owner_user_id uuid references public.users(id) on delete set null,
  owner_contact text not null,
  category_id text not null,
  name text not null,
  description text default '',
  roles text[] default '{}',
  team_size integer default 0,
  deadline date,
  vision text default '',
  salary_min integer default 0,
  salary_max integer default 0,
  currency text default 'INR',
  city text default '',
  state text default '',
  slug text unique,
  status text default 'draft',
  visibility text default 'public',
  project_purpose text default 'college',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  contact text not null,
  role text default 'member',
  status text default 'joined',
  joined_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(project_id, contact)
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text default '',
  status text default 'todo',
  priority text default 'medium',
  assignee text default '',
  created_by text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sender_id text not null,
  sender_name text not null,
  sender_contact text default '',
  content text not null,
  created_at timestamptz default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id text default '',
  type text not null,
  description text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  sender_contact text not null,
  receiver_contact text not null,
  role text default 'member',
  message text default '',
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  user_contact text default '',
  type text not null,
  title text not null,
  message text not null,
  read boolean default false,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  author_contact text not null,
  body text not null,
  image_url text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  user_contact text not null,
  created_at timestamptz default now(),
  unique(post_id, user_contact)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  author_contact text not null,
  body text not null,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz default now()
);

create index if not exists idx_projects_status_updated on public.projects(status, updated_at desc);
create index if not exists idx_projects_city_category on public.projects(city, category_id);
create index if not exists idx_project_tasks_project_status on public.project_tasks(project_id, status);
create index if not exists idx_messages_project_created on public.messages(project_id, created_at);
create index if not exists idx_activities_project_created on public.activities(project_id, created_at desc);
create index if not exists idx_notifications_user_read on public.notifications(user_id, read, created_at desc);

create trigger set_users_updated_at before update on public.users for each row execute procedure public.set_updated_at();
create trigger set_profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger set_projects_updated_at before update on public.projects for each row execute procedure public.set_updated_at();
create trigger set_project_tasks_updated_at before update on public.project_tasks for each row execute procedure public.set_updated_at();
create trigger set_invites_updated_at before update on public.invites for each row execute procedure public.set_updated_at();
create trigger set_posts_updated_at before update on public.posts for each row execute procedure public.set_updated_at();

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_tasks enable row level security;
alter table public.messages enable row level security;
alter table public.activities enable row level security;
alter table public.invites enable row level security;
alter table public.notifications enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.pricing_interest enable row level security;

create policy "users can record own pricing interest"
on public.pricing_interest for insert
with check (lower(contact) = public.current_contact());

create policy "users can read own pricing interest"
on public.pricing_interest for select
using (lower(contact) = public.current_contact());

create or replace function public.current_contact()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', auth.jwt() ->> 'phone', ''));
$$;

create or replace function public.is_project_member(project_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = project_uuid
      and lower(pm.contact) = public.current_contact()
      and pm.status = 'joined'
  )
  or exists (
    select 1 from public.projects p
    where p.id = project_uuid
      and lower(p.owner_contact) = public.current_contact()
  );
$$;

create policy "public can read active projects"
on public.projects for select
using (status in ('published', 'in-progress') and visibility in ('public', 'invite-only'));

create policy "owners can manage projects"
on public.projects for all
using (lower(owner_contact) = public.current_contact())
with check (lower(owner_contact) = public.current_contact());

create policy "users can read own user row"
on public.users for select
using (auth_user_id = auth.uid() or lower(contact) = public.current_contact());

create policy "users can upsert own user row"
on public.users for all
using (auth_user_id = auth.uid() or lower(contact) = public.current_contact())
with check (auth_user_id = auth.uid() or lower(contact) = public.current_contact());

create policy "public profiles are readable"
on public.profiles for select
using (available_for_invites = true or lower(contact) = public.current_contact());

create policy "users manage own profile"
on public.profiles for all
using (lower(contact) = public.current_contact())
with check (lower(contact) = public.current_contact());

create policy "project members readable to project users"
on public.project_members for select
using (public.is_project_member(project_id));

create policy "owners manage project members"
on public.project_members for all
using (exists (select 1 from public.projects p where p.id = project_id and lower(p.owner_contact) = public.current_contact()))
with check (exists (select 1 from public.projects p where p.id = project_id and lower(p.owner_contact) = public.current_contact()));

create policy "project tasks readable to project users"
on public.project_tasks for select
using (public.is_project_member(project_id));

create policy "project users manage tasks"
on public.project_tasks for all
using (public.is_project_member(project_id))
with check (public.is_project_member(project_id));

create policy "project users read messages"
on public.messages for select
using (public.is_project_member(project_id));

create policy "project users send messages"
on public.messages for insert
with check (public.is_project_member(project_id) and lower(sender_contact) = public.current_contact());

create policy "project users read activities"
on public.activities for select
using (project_id is null or public.is_project_member(project_id));

create policy "project users create activities"
on public.activities for insert
with check (project_id is null or public.is_project_member(project_id));

create policy "invite participants can read"
on public.invites for select
using (lower(sender_contact) = public.current_contact() or lower(receiver_contact) = public.current_contact());

create policy "authenticated users can create invites"
on public.invites for insert
with check (lower(sender_contact) = public.current_contact());

create policy "invite participants can update"
on public.invites for update
using (lower(sender_contact) = public.current_contact() or lower(receiver_contact) = public.current_contact());

create policy "users read own notifications"
on public.notifications for select
using (auth.uid() = user_id or lower(user_contact) = public.current_contact());

create policy "users update own notifications"
on public.notifications for update
using (auth.uid() = user_id or lower(user_contact) = public.current_contact());

create policy "public read posts"
on public.posts for select
using (exists (select 1 from public.projects p where p.id = project_id and p.status in ('published', 'in-progress')));

create policy "project members create posts"
on public.posts for insert
with check (public.is_project_member(project_id) and lower(author_contact) = public.current_contact());

create policy "public read likes"
on public.likes for select
using (true);

create policy "authenticated toggle likes"
on public.likes for all
using (lower(user_contact) = public.current_contact())
with check (lower(user_contact) = public.current_contact());

create policy "public read comments"
on public.comments for select
using (true);

create policy "authenticated create comments"
on public.comments for insert
with check (lower(author_contact) = public.current_contact());
