-- Run after schema.sql in Supabase SQL editor

alter table public.profiles
  add column if not exists bio text default '',
  add column if not exists portfolio text default '',
  add column if not exists profile_image text default '';

alter table public.projects
  add column if not exists project_purpose text default 'college';

-- Notify invitee when a new invite is created (runs as security definer)
create or replace function public.on_invite_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_name text;
begin
  select name into project_name from public.projects where id = new.project_id;
  insert into public.notifications (user_contact, type, title, message, metadata)
  values (
    lower(new.receiver_contact),
    'invite',
    'Project invite',
    coalesce(new.sender_contact, 'Someone') || ' invited you to join "' || coalesce(project_name, 'a project') || '"',
    jsonb_build_object('invite_id', new.id, 'project_id', new.project_id, 'sender_contact', new.sender_contact)
  );
  return new;
end;
$$;

drop trigger if exists invites_notify on public.invites;
create trigger invites_notify
  after insert on public.invites
  for each row execute function public.on_invite_created();
