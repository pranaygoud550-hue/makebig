/**
 * Supabase data access — replaces Express/MongoDB for core app entities.
 */
import { supabase, requireSupabase, normalizeAuthContact } from '@/lib/supabase';
import { supabaseAdmin, isSupabaseServerConfigured } from '@/lib/supabase-server';
import type { User, Profile, Project } from '@/lib/types';
import type { ProfileRow, ProjectRow, UserRow } from '@/lib/database.types';
import { normalizePlan } from '@/lib/subscription';
import { slugifyProjectName } from '@/lib/site';

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    isLoggedIn: true,
    skills: row.skills || [],
    hobbies: row.hobbies || [],
    college: row.college || '',
    graduationYear: row.graduation_year || '',
    city: row.city || '',
    state: row.state || '',
    plan: normalizePlan(row.plan),
  };
}

function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    contact: row.contact,
    role: (row.role as Profile['role']) || 'member',
    tagline: row.tagline || '',
    categoryIds: row.category_ids || [],
    skills: row.skills || [],
    rateMin: row.rate_min,
    rateMax: row.rate_max,
    currency: row.currency || 'INR',
    availableForInvites: row.available_for_invites ?? true,
    bio: row.bio || '',
    portfolio: row.portfolio || '',
    profileImage: row.profile_image || '',
  };
}

export function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    desc: row.description || '',
    roles: row.roles || [],
    projectPurpose: (row.project_purpose as Project['projectPurpose']) || undefined,
    salaryMin: row.salary_min || 0,
    salaryMax: row.salary_max || 0,
    currency: row.currency || 'INR',
    ownerContact: row.owner_contact,
    createdAt: row.created_at,
    ...(row.slug ? { slug: row.slug } : {}),
    ...(row.city ? { city: row.city } : {}),
    ...(row.state ? { state: row.state } : {}),
  };
}

async function sessionContact(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const u = data.session?.user;
  return normalizeAuthContact(u?.email, u?.phone);
}

// ── Seed (replaces apiGetSeed / bootstrap) ───────────────────────────────────

export interface SeedPayload {
  projects: Project[];
  talent: { contact: string; name: string; skills: string[] }[];
}

export async function dbGetSeed(): Promise<SeedPayload> {
  requireSupabase();
  const [projectsRes, usersRes] = await Promise.all([
    supabase
      .from('projects')
      .select('*')
      .in('status', ['published', 'in-progress'])
      .order('updated_at', { ascending: false })
      .limit(24),
    supabase
      .from('users')
      .select('contact, name, skills')
      .order('last_active', { ascending: false })
      .limit(40),
  ]);

  return {
    projects: (projectsRes.data || []).map(rowToProject),
    talent: (usersRes.data || []).map((u) => ({
      contact: u.contact,
      name: u.name,
      skills: u.skills || [],
    })),
  };
}

// ── Users ────────────────────────────────────────────────────────────────────

export async function dbUpsertUser(
  user: Omit<User, 'id' | 'isLoggedIn'>
): Promise<{ user: User; token: string } | null> {
  requireSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const authUser = sessionData.session?.user;
  const contact = user.contact.toLowerCase().trim();

  const payload = {
    auth_user_id: authUser?.id || null,
    name: user.name,
    contact,
    skills: user.skills || [],
    hobbies: user.hobbies || [],
    college: user.college || '',
    graduation_year: user.graduationYear || '',
    city: user.city || '',
    state: user.state || '',
    last_active: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('users').upsert(payload, { onConflict: 'contact' }).select().single();
  if (error) throw error;

  const token = sessionData.session?.access_token || '';
  return { user: rowToUser(data), token };
}

export async function dbGetUser(contact: string): Promise<User | null> {
  requireSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('contact', contact.toLowerCase().trim())
    .maybeSingle();
  if (error || !data) return null;
  return rowToUser(data);
}

// ── Profiles ─────────────────────────────────────────────────────────────────

export async function dbGetProfile(contact: string): Promise<Profile | null> {
  requireSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('contact', contact.toLowerCase().trim())
    .maybeSingle();
  if (error || !data) return null;
  return rowToProfile(data);
}

export async function dbUpsertProfile(profile: Profile): Promise<Profile | null> {
  requireSupabase();
  const payload = {
    contact: profile.contact.toLowerCase().trim(),
    role: profile.role,
    tagline: profile.tagline,
    category_ids: profile.categoryIds,
    skills: profile.skills,
    rate_min: profile.rateMin,
    rate_max: profile.rateMax,
    currency: profile.currency,
    available_for_invites: profile.availableForInvites,
    bio: profile.bio || '',
    portfolio: profile.portfolio || '',
    profile_image: profile.profileImage || '',
  };
  const { data, error } = await supabase.from('profiles').upsert(payload, { onConflict: 'contact' }).select().single();
  if (error) throw error;
  return rowToProfile(data);
}

// ── Projects ─────────────────────────────────────────────────────────────────

export async function dbPublishProject(projectId: string): Promise<Project | null> {
  requireSupabase();
  const { data, error } = await supabase
    .from('projects')
    .update({ status: 'published' })
    .eq('id', projectId)
    .select()
    .single();
  if (error) throw error;

  await supabase.from('activities').insert({
    project_id: data.id,
    user_id: data.owner_contact,
    type: 'project_published',
    description: `Project "${data.name}" was published`,
  });

  if (!data.slug) {
    const base = slugifyProjectName(data.name, data.city || '');
    let slug = base;
    for (let i = 0; i < 20; i++) {
      const { data: clash } = await supabase
        .from('projects')
        .select('id')
        .eq('slug', slug)
        .neq('id', projectId)
        .maybeSingle();
      if (!clash) break;
      slug = `${base}-${i + 1}`;
    }
    const { data: withSlug } = await supabase.from('projects').update({ slug }).eq('id', projectId).select().single();
    if (withSlug) return rowToProject(withSlug);
  }

  return rowToProject(data);
}

// ── Notifications ────────────────────────────────────────────────────────────

export async function dbGetNotifications(contactOrUserId: string) {
  requireSupabase();
  const key = contactOrUserId.toLowerCase().trim();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .or(`user_contact.eq.${key},user_id.eq.${key}`)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.read,
    createdAt: n.created_at,
    userId: n.user_id || n.user_contact,
    metadata: n.metadata,
  }));
}

export async function dbMarkNotificationRead(notificationId: string) {
  requireSupabase();
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function dbMarkAllNotificationsRead(contact: string) {
  requireSupabase();
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_contact', contact.toLowerCase().trim());
}

// ── Invites ──────────────────────────────────────────────────────────────────

export async function dbSendInvite(
  projectId: string,
  receiverContact: string,
  role: string,
  message?: string
) {
  requireSupabase();
  const senderContact = await sessionContact();
  const { data, error } = await supabase
    .from('invites')
    .insert({
      project_id: projectId,
      sender_contact: senderContact,
      receiver_contact: receiverContact.toLowerCase().trim(),
      role: role || 'member',
      message: message || '',
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function dbAcceptInvite(inviteId: string) {
  requireSupabase();
  const { data, error } = await supabase
    .from('invites')
    .update({ status: 'accepted' })
    .eq('id', inviteId)
    .select()
    .single();
  if (error) throw error;

  if (data?.project_id && data?.receiver_contact) {
    await supabase.from('project_members').upsert(
      {
        project_id: data.project_id,
        contact: data.receiver_contact,
        role: data.role || 'member',
        status: 'joined',
      },
      { onConflict: 'project_id,contact' }
    );
  }
  return data;
}

export async function dbDeclineInvite(inviteId: string) {
  requireSupabase();
  const { data, error } = await supabase
    .from('invites')
    .update({ status: 'declined' })
    .eq('id', inviteId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function dbGetReceivedInvites(contact: string) {
  requireSupabase();
  const { data, error } = await supabase
    .from('invites')
    .select('*, projects(name, slug)')
    .eq('receiver_contact', contact.toLowerCase().trim())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function dbGetProjectInvites(projectId: string) {
  requireSupabase();
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Health check — verifies Supabase is reachable */
export async function dbCheckHealth(): Promise<boolean> {
  if (!isSupabaseServerConfigured || !supabaseAdmin) {
    try {
      requireSupabase();
      const { error } = await supabase.from('users').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
  const { error } = await supabaseAdmin.from('users').select('id').limit(1);
  return !error;
}
