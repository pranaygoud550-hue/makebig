-- Subscription / monetisation
alter table public.users
  add column if not exists plan text not null default 'free' check (plan in ('free', 'pro'));

alter table public.users
  add column if not exists stripe_customer_id text;

create table if not exists public.pricing_interest (
  id uuid primary key default gen_random_uuid(),
  contact text not null,
  plan text not null default 'pro',
  created_at timestamptz default now(),
  unique(contact, plan)
);

alter table public.pricing_interest enable row level security;

drop policy if exists "users can record own pricing interest" on public.pricing_interest;
create policy "users can record own pricing interest"
on public.pricing_interest for insert
with check (lower(contact) = public.current_contact());

drop policy if exists "users can read own pricing interest" on public.pricing_interest;
create policy "users can read own pricing interest"
on public.pricing_interest for select
using (lower(contact) = public.current_contact());
