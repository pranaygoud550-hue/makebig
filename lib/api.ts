import { User, Profile, Project, PlanTier, Course, CourseLesson, VerifiedSkill } from './types';
import { getSupabaseAccessToken, isSupabaseConfigured, supabase } from './supabase';
import {
  assertCanCreateProject,
  assertCanAddTeamMember,
  PlanLimitError,
  getPlanForContact,
  normalizePlan,
} from './subscription';
import { PLAN_LIMITS } from './plans';
import { slugifyProjectName } from './site';
import { getErrorMessage, mapApiError } from './userErrors';
import { getApiBase, getApiOrigin } from './apiBase';

export { PlanLimitError };

const API_BASE = getApiBase();

function otpAuthEndpoints(path: 'send-otp' | 'verify-otp') {
  // OTP runs entirely on Vercel (Resend + MongoDB). Do not call Render.
  return [`/api/auth/${path}`];
}

// Store JWT token locally
let authToken: string | null =
  typeof window !== 'undefined'
    ? localStorage.getItem('auth_token') || localStorage.getItem('makeBigToken')
    : null;

export function setAuthToken(token: string) {
  authToken = token;
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return (
      localStorage.getItem('auth_token') ||
      localStorage.getItem('makeBigToken') ||
      localStorage.getItem('makebig_token') ||
      authToken
    );
  }
  return authToken;
}

export async function getAuthHeadersAsync(): Promise<Record<string, string>> {
  const token = await getAuthTokenAsync();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function getAuthTokenAsync(): Promise<string | null> {
  if (isSupabaseConfigured) {
    const token = await getSupabaseAccessToken();
    if (token) return token;
  }
  return getAuthToken();
}

export function clearAuthToken() {
  authToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('makeBigToken');
  }
}

// Helper to add auth header
function getAuthHeaders() {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function rowToProject(row: any): Project {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    desc: row.description || '',
    roles: row.roles || [],
    projectPurpose: row.project_purpose || row.projectPurpose,
    salaryMin: row.salary_min || 0,
    salaryMax: row.salary_max || 0,
    currency: row.currency || 'INR',
    ownerContact: row.owner_contact,
    createdAt: row.created_at,
    ...(row.slug ? { slug: row.slug } : {}),
    ...(row.city ? { city: row.city } : {}),
    ...(row.state ? { state: row.state } : {}),
  } as Project;
}

function slugifyProject(name?: string, city?: string) {
  const base = [name || 'project', city || ''].join(' ');
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export type OtpPurpose = 'signin' | 'signup';

export interface VerifyOtpResult {
  ok: boolean;
  user?: User;
}

function persistSessionUser(user: User, token: string) {
  setAuthToken(token);
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify({ ...user, isLoggedIn: true }));
  }
}

// ── OTP ──────────────────────────────────────────────────────────────────────

export async function apiSendOTP(
  contact: string,
  purpose: OtpPurpose = 'signin'
): Promise<{ sent: boolean; devCode?: string; message: string }> {
  try {
    if (isSupabaseConfigured) {
      const normalized = contact.trim();
      const isEmail = normalized.includes('@');
      const { error } = isEmail
        ? await supabase.auth.signInWithOtp({
            email: normalized,
            options: { shouldCreateUser: purpose === 'signup' },
          })
        : await supabase.auth.signInWithOtp({
            phone: normalized,
            options: { shouldCreateUser: purpose === 'signup' },
          });
      if (error) throw error;
      return { sent: true, message: 'OTP sent through Supabase Auth' };
    }

    const payload = { contact: contact.trim().toLowerCase(), purpose };
    const endpoints = otpAuthEndpoints('send-otp');

    let lastError = 'Could not send OTP — check your email/phone and try again';
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data: {
          success?: boolean;
          data?: { sent: boolean; devCode?: string; message: string };
          error?: string;
        } = await res.json();
        if (data.success && data.data) return data.data;
        lastError = mapApiError(data.error, 'otp') || lastError;
      } catch (e) {
        if (e instanceof TypeError) {
          lastError = 'Network error — check your internet connection';
          continue;
        }
        throw e;
      }
    }
    throw new Error(mapApiError(lastError, 'otp'));
  } catch (e) {
    if (e instanceof Error) throw new Error(getErrorMessage(e, 'otp'));
    throw new Error(getErrorMessage('Could not send OTP', 'otp'));
  }
}

export async function apiVerifyOTP(
  contact: string,
  code: string,
  purpose: OtpPurpose = 'signin'
): Promise<VerifyOtpResult> {
  try {
    if (isSupabaseConfigured) {
      const normalized = contact.trim();
      const isEmail = normalized.includes('@');
      const { data, error } = await supabase.auth.verifyOtp(
        isEmail
          ? { email: normalized, token: code, type: 'email' }
          : { phone: normalized, token: code, type: 'sms' }
      );
      if (error) return { ok: false };
      if (data.session?.access_token) setAuthToken(data.session.access_token);
      return { ok: Boolean(data.user) };
    }

    const payload = { contact: contact.trim().toLowerCase(), code, purpose };
    const endpoints = otpAuthEndpoints('verify-otp');

    let lastError = 'Incorrect OTP code';
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success === true) {
          const token = data.data?.token;
          const user = data.data?.user as User | undefined;
          if (purpose === 'signin' && token && user) {
            persistSessionUser(user, token);
            return { ok: true, user };
          }
          if (purpose === 'signup' && data.data?.verified) {
            return { ok: true };
          }
          if (token) setAuthToken(token);
          return { ok: true, user };
        }
        lastError = mapApiError(data.error, 'otp') || lastError;
      } catch (e) {
        if (e instanceof TypeError) {
          lastError = 'Network error — check your internet connection';
          continue;
        }
        throw e;
      }
    }
    throw new Error(mapApiError(lastError, 'otp'));
  } catch (e) {
    if (e instanceof Error) throw new Error(getErrorMessage(e, 'otp'));
    throw new Error(getErrorMessage('OTP verification failed', 'otp'));
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export async function apiCheckHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.success === true || data?.data?.status === 'ok';
  } catch {
    return false;
  }
}

export async function apiUpsertUser(
  user: Omit<User, 'id' | 'isLoggedIn'> & { verifiedSkills?: VerifiedSkill[] }
): Promise<{ user: User; token: string } | null> {
  try {
    if (isSupabaseConfigured) {
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
      const { data, error } = await supabase
        .from('users')
        .upsert(payload, { onConflict: 'contact' })
        .select()
        .single();
      if (error) throw error;
      const token = sessionData.session?.access_token || '';
      if (token) setAuthToken(token);
      return {
        user: {
          id: data.id,
          name: data.name,
          contact: data.contact,
          isLoggedIn: true,
          skills: data.skills || [],
          hobbies: data.hobbies || [],
          college: data.college || '',
          graduationYear: data.graduation_year || '',
          city: data.city || '',
          state: data.state || '',
          plan: normalizePlan(data.plan),
        },
        token,
      };
    }

    const upsertEndpoints = [`/api/users/upsert`, `${API_BASE}/users/upsert`];
    let lastUpsertError: string | null = null;

    for (const url of upsertEndpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: await getAuthHeadersAsync(),
          body: JSON.stringify(user),
        });
        const data = await res.json();
        if (data.success && data.data) {
          setAuthToken(data.data.token);
          if (typeof window !== 'undefined' && data.data.user) {
            localStorage.setItem(
              'user',
              JSON.stringify({ ...data.data.user, isLoggedIn: true })
            );
          }
          return data.data;
        }
        lastUpsertError = data.error || null;
      } catch (e) {
        if (e instanceof TypeError) continue;
        throw e;
      }
    }

    if (lastUpsertError) {
      console.error('Error upserting user:', lastUpsertError);
    }
    return null;
  } catch (e) {
    console.error('Error upserting user:', e);
    return null;
  }
}

export async function apiGetUser(contact: string): Promise<User | null> {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('contact', contact.toLowerCase().trim())
        .maybeSingle();
      if (error || !data) return null;
      return {
        id: data.id,
        name: data.name,
        contact: data.contact,
        isLoggedIn: true,
        skills: data.skills || [],
        hobbies: data.hobbies || [],
        college: data.college || '',
        graduationYear: data.graduation_year || '',
        city: data.city || '',
        state: data.state || '',
        plan: normalizePlan(data.plan),
      };
    }

    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(contact)}`, {
      method: 'GET',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data.user : null;
  } catch (e) {
    console.error('Error getting user:', e);
    return null;
  }
}

export async function apiGetProfile(contact: string): Promise<Profile | null> {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('contact', contact.toLowerCase().trim())
        .maybeSingle();
      if (error || !data) return null;
      return {
        id: data.id,
        contact: data.contact,
        role: data.role,
        tagline: data.tagline || '',
        categoryIds: data.category_ids || [],
        skills: data.skills || [],
        rateMin: data.rate_min,
        rateMax: data.rate_max,
        currency: data.currency || 'INR',
        availableForInvites: data.available_for_invites ?? true,
        bio: data.bio || '',
        portfolio: data.portfolio || '',
        profileImage: data.profile_image || data.profileImage || '',
      };
    }

    const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(contact)}`, {
      method: 'GET',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const p = data.success ? data.data.profile : null;
    if (!p) return null;
    return {
      id: p.id,
      contact: p.contact,
      role: p.role || 'member',
      tagline: p.tagline || '',
      categoryIds: p.categoryIds || [],
      skills: p.skills || [],
      rateMin: p.rateMin ?? null,
      rateMax: p.rateMax ?? null,
      currency: p.currency || 'INR',
      availableForInvites: p.availableForInvites ?? false,
      bio: p.bio || '',
      portfolio: p.portfolio || '',
      profileImage: p.profileImage || '',
    };
  } catch (e) {
    console.error('Error getting profile:', e);
    return null;
  }
}

export async function apiUpsertProfile(profile: Profile): Promise<Profile | null> {
  try {
    if (isSupabaseConfigured) {
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
      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'contact' })
        .select()
        .single();
      if (error) throw error;
      return {
        id: data.id,
        contact: data.contact,
        role: data.role,
        tagline: data.tagline || '',
        categoryIds: data.category_ids || [],
        skills: data.skills || [],
        rateMin: data.rate_min,
        rateMax: data.rate_max,
        currency: data.currency || 'INR',
        availableForInvites: data.available_for_invites ?? true,
        bio: data.bio || '',
        portfolio: data.portfolio || '',
        profileImage: data.profile_image || '',
      };
    }

    const res = await fetch(`${API_BASE}/profile/upsert`, {
      method: 'POST',
      headers: await getAuthHeadersAsync(),
      body: JSON.stringify(profile),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const p = data.success ? data.data.profile : null;
    if (!p) return null;
    return {
      id: p.id,
      contact: p.contact,
      role: p.role || 'member',
      tagline: p.tagline || '',
      categoryIds: p.categoryIds || [],
      skills: p.skills || [],
      rateMin: p.rateMin ?? null,
      rateMax: p.rateMax ?? null,
      currency: p.currency || 'INR',
      availableForInvites: p.availableForInvites ?? false,
      bio: p.bio || '',
      portfolio: p.portfolio || '',
      profileImage: p.profileImage || '',
    };
  } catch (e) {
    console.error('Error upserting profile:', e);
    return null;
  }
}

export async function apiGetPublicProfile(
  contact: string
): Promise<import('@/lib/profilePublic').PublicProfilePayload | null> {
  try {
    const res = await fetch(`/api/public/u/${encodeURIComponent(contact.trim().toLowerCase())}`, {
      cache: 'no-store',
    });
    const data = await res.json();
    if (!data.success || !data.data) return null;
    return data.data as import('@/lib/profilePublic').PublicProfilePayload;
  } catch {
    return null;
  }
}

export async function apiGetTalent(search?: string): Promise<any[]> {
  try {
    const q = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    const res = await fetch(`${API_BASE}/talent${q}`, {
      method: 'GET',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data.users || data.data.talent || [] : [];
  } catch (e) {
    console.error('Error fetching talent:', e);
    return [];
  }
}

export type FriendLinkStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends';

export interface FriendPerson {
  contact: string;
  name: string;
  college?: string;
  tagline?: string;
  skills?: string[];
}

export async function apiGetFriends(): Promise<FriendPerson[]> {
  try {
    const res = await fetch(`${API_BASE}/friends`, { headers: await getAuthHeadersAsync() });
    const data = await res.json();
    return data.success ? data.data.friends || [] : [];
  } catch {
    return [];
  }
}

export async function apiGetFriendRequests(): Promise<{
  incoming: FriendPerson[];
  outgoing: FriendPerson[];
}> {
  try {
    const res = await fetch(`${API_BASE}/friends/requests`, { headers: await getAuthHeadersAsync() });
    const data = await res.json();
    if (!data.success) return { incoming: [], outgoing: [] };
    return {
      incoming: data.data.incoming || [],
      outgoing: data.data.outgoing || [],
    };
  } catch {
    return { incoming: [], outgoing: [] };
  }
}

export async function apiGetFriendStatus(contact: string): Promise<FriendLinkStatus> {
  try {
    const res = await fetch(
      `${API_BASE}/friends/status/${encodeURIComponent(contact.trim().toLowerCase())}`,
      { headers: await getAuthHeadersAsync() }
    );
    const data = await res.json();
    return data.success ? (data.data.status as FriendLinkStatus) : 'none';
  } catch {
    return 'none';
  }
}

export async function apiSendFriendRequest(contact: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/friends/request`, {
      method: 'POST',
      headers: await getAuthHeadersAsync(),
      body: JSON.stringify({ contact: contact.trim().toLowerCase() }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

export async function apiAcceptFriendRequest(contact: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_BASE}/friends/requests/${encodeURIComponent(contact.trim().toLowerCase())}/accept`,
      { method: 'POST', headers: await getAuthHeadersAsync() }
    );
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

export async function apiDeclineFriendRequest(contact: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_BASE}/friends/requests/${encodeURIComponent(contact.trim().toLowerCase())}/decline`,
      { method: 'POST', headers: await getAuthHeadersAsync() }
    );
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

export async function apiRateProfile(contact: string, stars: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/profile/rate`, {
      method: 'POST',
      headers: await getAuthHeadersAsync(),
      body: JSON.stringify({ contact, stars }),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch {
    return false;
  }
}

export async function apiGetUserPlan(contact: string): Promise<PlanTier> {
  return getPlanForContact(contact);
}

export async function apiCreateProject(project: Partial<Project>): Promise<Project> {
  try {
    if (isSupabaseConfigured) {
      const { data: sessionData } = await supabase.auth.getSession();
      const ownerContact = project.ownerContact?.toLowerCase() || sessionData.session?.user.email?.toLowerCase() || '';
      await assertCanCreateProject(ownerContact);
      const payload = {
        owner_contact: ownerContact,
        category_id: project.categoryId || 'other',
        name: project.name || 'Untitled Project',
        description: project.desc || '',
        roles: project.roles || [],
        salary_min: project.salaryMin || 0,
        salary_max: project.salaryMax || 0,
        currency: project.currency || 'INR',
        city: (project as any).city || '',
        state: (project as any).state || '',
        slug: slugifyProject(project.name, (project as any).city),
        status: 'draft',
        visibility: 'public',
      };
      const { data, error } = await supabase.from('projects').insert(payload).select().single();
      if (error) throw error;
      await supabase.from('project_members').upsert({
        project_id: data.id,
        contact: ownerContact,
        role: 'owner',
        status: 'joined',
      }, { onConflict: 'project_id,contact' });
      await supabase.from('activities').insert({
        project_id: data.id,
        user_id: ownerContact,
        type: 'project_created',
        description: `Project "${data.name}" was created`,
      });
      return rowToProject(data);
    }

    const ownerContact = project.ownerContact?.toLowerCase() || '';
    if (ownerContact) await assertCanCreateProject(ownerContact);

    const res = await fetch(`${API_BASE}/projects/create`, {
      method: 'POST',
      headers: await getAuthHeadersAsync(),
      body: JSON.stringify(project),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = mapApiError(data?.error, 'project');
      if (data?.code === 'PLAN_LIMIT') throw new PlanLimitError(msg);
      throw new Error(msg);
    }
    if (!data.success || !data.data?.project) {
      throw new Error('Project creation failed — no project returned from server');
    }
    return data.data.project;
  } catch (e) {
    if (e instanceof PlanLimitError) throw e;
    console.error('Error creating project:', e);
    throw new Error(getErrorMessage(e, 'project'));
  }
}

export async function apiPublishProject(projectId: string): Promise<Project | null> {
  try {
    if (isSupabaseConfigured) {
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
        const { data: withSlug } = await supabase
          .from('projects')
          .update({ slug })
          .eq('id', projectId)
          .select()
          .single();
        if (withSlug) return rowToProject(withSlug);
      }
      return rowToProject(data);
    }

    const res = await fetch(`${API_BASE}/projects/${projectId}/publish`, {
      method: 'POST',
      headers: await getAuthHeadersAsync(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data.project : null;
  } catch (e) {
    console.error('Error publishing project:', e);
    return null;
  }
}

export interface BrowseProject extends Project {
  _id?: string;
  joinedCount?: number;
  teamMemberCount?: number;
  maxTeamSize?: number;
  updatedAt?: string;
  ownerContact?: string;
}

export async function apiBrowseProjects(
  categoryId?: string,
  excludeContact?: string
): Promise<BrowseProject[]> {
  try {
    if (isSupabaseConfigured) {
      let query = supabase
        .from('projects')
        .select('*, project_members(count)')
        .in('status', ['published', 'in-progress'])
        .in('visibility', ['public', 'invite-only'])
        .order('updated_at', { ascending: false })
        .limit(100);
      if (categoryId && categoryId !== 'all') query = query.eq('category_id', categoryId);
      if (excludeContact) query = query.neq('owner_contact', excludeContact.toLowerCase());
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((row: any) => ({
        ...rowToProject(row),
        joinedCount: row.project_members?.[0]?.count || 0,
        teamMemberCount: row.project_members?.[0]?.count || 0,
      }));
    }

    const params = new URLSearchParams();
    if (categoryId && categoryId !== 'all') params.append('categoryId', categoryId);
    if (excludeContact) params.append('excludeContact', excludeContact);

    const res = await fetch(`${API_BASE}/projects/browse?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data.projects : [];
  } catch (e) {
    console.error('Error browsing projects:', e);
    return [];
  }
}

export async function apiJoinProject(
  projectId: string,
  memberName: string,
  role = 'member'
): Promise<{ project: Project; message: string; pending?: boolean; joined?: boolean } | null> {
  try {
    if (isSupabaseConfigured) {
      const { data: sessionData } = await supabase.auth.getSession();
      const contact = sessionData.session?.user.email?.toLowerCase() || memberName.toLowerCase();
      const { data: ownerRow } = await supabase
        .from('projects')
        .select('owner_contact')
        .eq('id', projectId)
        .single();
      if (ownerRow?.owner_contact) {
        await assertCanAddTeamMember(projectId, ownerRow.owner_contact);
      }
      const { error } = await supabase.from('project_members').upsert({
        project_id: projectId,
        contact,
        role,
        status: 'joined',
      }, { onConflict: 'project_id,contact' });
      if (error) throw error;
      await supabase.from('activities').insert({
        project_id: projectId,
        user_id: contact,
        type: 'member_joined',
        description: `${memberName} joined the project`,
      });
      const { data: projectRow } = await supabase.from('projects').select('*').eq('id', projectId).single();
      return { project: rowToProject(projectRow), message: 'Joined project' };
    }

    const token = await getAuthTokenAsync();
    if (!token) {
      throw new Error('Sign in again to join this project');
    }

    const res = await fetch(`${API_BASE}/projects/${projectId}/join`, {
      method: 'POST',
      headers: await getAuthHeadersAsync(),
      body: JSON.stringify({ memberName, role }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      const msg =
        typeof data.error === 'string'
          ? data.error
          : data.error?.message || 'Failed to join project';
      throw new Error(msg);
    }
    return data.data;
  } catch (e) {
    console.error('Error joining project:', e);
    throw e;
  }
}

export async function apiGetJoinRequests(
  projectId: string
): Promise<{ contact: string; role: string; requestedAt?: string }[]> {
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/join-requests`, {
      headers: await getAuthHeadersAsync(),
    });
    const data = await res.json();
    return data.success ? data.data.requests || [] : [];
  } catch (e) {
    console.error('Error fetching join requests:', e);
    return [];
  }
}

export async function apiApproveJoinRequest(projectId: string, contact: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_BASE}/projects/${projectId}/join-requests/${encodeURIComponent(contact)}/approve`,
      { method: 'POST', headers: await getAuthHeadersAsync() }
    );
    const data = await res.json();
    return data.success === true;
  } catch (e) {
    console.error('Error approving join request:', e);
    return false;
  }
}

export async function apiDeclineJoinRequest(projectId: string, contact: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_BASE}/projects/${projectId}/join-requests/${encodeURIComponent(contact)}/decline`,
      { method: 'POST', headers: await getAuthHeadersAsync() }
    );
    const data = await res.json();
    return data.success === true;
  } catch (e) {
    console.error('Error declining join request:', e);
    return false;
  }
}

export async function apiGetProjects(filters?: { status?: string; ownerContact?: string; categoryId?: string }): Promise<Project[]> {
  try {
    if (isSupabaseConfigured) {
      let query = supabase.from('projects').select('*').order('updated_at', { ascending: false }).limit(100);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.ownerContact) query = query.eq('owner_contact', filters.ownerContact.toLowerCase());
      if (filters?.categoryId) query = query.eq('category_id', filters.categoryId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(rowToProject);
    }

    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.ownerContact) params.append('ownerContact', filters.ownerContact);
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    
    const res = await fetch(`${API_BASE}/projects?${params.toString()}`, {
      method: 'GET',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data.projects : [];
  } catch (e) {
    console.error('Error fetching projects:', e);
    return [];
  }
}

export async function apiGetProject(projectId: string): Promise<{ project: Project; activities: any[]; messages: any[]; teamMemberCount: number } | null> {
  try {
    if (isSupabaseConfigured) {
      const [projectRes, activitiesRes, messagesRes, membersRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('activities').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(100),
        supabase.from('messages').select('*').eq('project_id', projectId).order('created_at', { ascending: true }).limit(100),
        supabase.from('project_members').select('*', { count: 'exact', head: true }).eq('project_id', projectId).eq('status', 'joined'),
      ]);
      if (projectRes.error || !projectRes.data) return null;
      return {
        project: rowToProject(projectRes.data),
        activities: activitiesRes.data || [],
        messages: (messagesRes.data || []).map((m: any) => ({
          id: m.id,
          senderId: m.sender_id,
          senderName: m.sender_name,
          content: m.content,
          createdAt: m.created_at,
        })),
        teamMemberCount: membersRes.count || 0,
      };
    }

    const res = await fetch(`${API_BASE}/projects/${projectId}`, {
      method: 'GET',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch (e) {
    console.error('Error fetching project:', e);
    return null;
  }
}

export async function apiUpdateProject(projectId: string, updates: Partial<Project>): Promise<Project | null> {
  try {
    if (isSupabaseConfigured) {
      const payload: Record<string, any> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.desc !== undefined) payload.description = updates.desc;
      if (updates.categoryId !== undefined) payload.category_id = updates.categoryId;
      if (updates.roles !== undefined) payload.roles = updates.roles;
      if (updates.salaryMin !== undefined) payload.salary_min = updates.salaryMin;
      if (updates.salaryMax !== undefined) payload.salary_max = updates.salaryMax;
      if (updates.currency !== undefined) payload.currency = updates.currency;
      const { data, error } = await supabase.from('projects').update(payload).eq('id', projectId).select().single();
      if (error) throw error;
      return rowToProject(data);
    }

    const res = await fetch(`${API_BASE}/projects/${projectId}`, {
      method: 'PUT',
      headers: await getAuthHeadersAsync(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data.project : null;
  } catch (e) {
    console.error('Error updating project:', e);
    return null;
  }
}

export async function apiSendInvite(projectId: string, receiverContact: string, role: string, message?: string): Promise<any> {
  try {
    if (isSupabaseConfigured) {
      const { data: sessionData } = await supabase.auth.getSession();
      const senderContact = sessionData.session?.user.email?.toLowerCase() || '';
      const { data, error } = await supabase
        .from('invites')
        .insert({ project_id: projectId, sender_contact: senderContact, receiver_contact: receiverContact.toLowerCase(), role, message: message || '', status: 'pending' })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const res = await fetch(`${API_BASE}/invites/send`, {
      method: 'POST',
      headers: await getAuthHeadersAsync(),
      body: JSON.stringify({ projectId, receiverContact, role, message }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data.invite : null;
  } catch (e) {
    console.error('Error sending invite:', e);
    return null;
  }
}

export async function apiAcceptInvite(inviteId: string): Promise<any> {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('invites').update({ status: 'accepted' }).eq('id', inviteId).select().single();
      if (error) throw error;
      if (data?.project_id && data?.receiver_contact) {
        const { data: ownerRow } = await supabase
          .from('projects')
          .select('owner_contact')
          .eq('id', data.project_id)
          .single();
        if (ownerRow?.owner_contact) {
          await assertCanAddTeamMember(data.project_id, ownerRow.owner_contact);
        }
        await supabase.from('project_members').upsert({
          project_id: data.project_id,
          contact: data.receiver_contact,
          role: data.role || 'member',
          status: 'joined',
        }, { onConflict: 'project_id,contact' });
      }
      return data;
    }

    const res = await fetch(`${API_BASE}/invites/${inviteId}/accept`, {
      method: 'POST',
      headers: await getAuthHeadersAsync(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data.invite : null;
  } catch (e) {
    console.error('Error accepting invite:', e);
    return null;
  }
}

export async function apiGetProjectActivities(projectId: string): Promise<any[]> {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []).map((a: any) => ({
        id: a.id,
        type: a.type,
        description: a.description,
        createdAt: a.created_at,
      }));
    }

    const res = await fetch(`${API_BASE}/projects/${projectId}/activities`, {
      method: 'GET',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data.activities : [];
  } catch (e) {
    console.error('Error fetching activities:', e);
    return [];
  }
}

export async function apiGetProjectMessages(projectId: string): Promise<any[]> {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.id,
        senderId: m.sender_id,
        senderName: m.sender_name,
        senderContact: m.sender_contact,
        content: m.content,
        createdAt: m.created_at,
      }));
    }

    const res = await fetch(`/api/projects/${projectId}/messages`, {
      method: 'GET',
      headers: await getAuthHeadersAsync(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data.messages : [];
  } catch (e) {
    console.error('Error fetching messages:', e);
    return [];
  }
}

export async function apiSendProjectMessage(
  projectId: string,
  content: string
): Promise<{ ok: boolean; message?: Record<string, unknown>; error?: string }> {
  try {
    if (isSupabaseConfigured) {
      const headers = await getAuthHeadersAsync();
      const userRes = await fetch('/api/users/me', { headers }).catch(() => null);
      const userJson = userRes ? await userRes.json().catch(() => null) : null;
      const name = userJson?.data?.name || 'User';
      const contact = userJson?.data?.contact || '';
      const { data, error } = await supabase.from('messages').insert({
        project_id: projectId,
        sender_id: contact,
        sender_name: name,
        sender_contact: contact,
        content,
      }).select().single();
      if (error) throw error;
      return {
        ok: true,
        message: {
          id: data.id,
          senderId: data.sender_id,
          senderName: data.sender_name,
          content: data.content,
          createdAt: data.created_at,
        },
      };
    }

    const origin = getApiOrigin();
    const res = await fetch(`${origin}/api/projects/${projectId}/messages`, {
      method: 'POST',
      headers: await getAuthHeadersAsync(),
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { ok: false, error: data.error || 'Could not send message' };
    }
    return { ok: true, message: data.data.message };
  } catch (e) {
    console.error('Error sending message:', e);
    return { ok: false, error: getErrorMessage(e, 'send') };
  }
}

export async function apiGetUserNotifications(userId: string): Promise<any[]> {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${userId},user_contact.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []).map((n: any) => ({ ...n, createdAt: n.created_at }));
    }

    const res = await fetch(`${API_BASE}/users/${userId}/notifications`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data.notifications : [];
  } catch (e) {
    console.error('Error fetching notifications:', e);
    return [];
  }
}

export async function apiMarkNotificationRead(notificationId: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data.notification : null;
  } catch (e) {
    console.error('Error marking notification as read:', e);
    return null;
  }
}

export async function apiGetReceivedInvites(contact: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/invites/received?contact=${encodeURIComponent(contact)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data.invites : [];
  } catch (e) {
    console.error('Error fetching received invites:', e);
    return [];
  }
}

export async function apiGetProjectInvites(projectId: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/invites`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data.invites : [];
  } catch (e) {
    console.error('Error fetching project invites:', e);
    return [];
  }
}

export async function apiDeclineInvite(inviteId: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/invites/${inviteId}/decline`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data.invite : null;
  } catch (e) {
    console.error('Error declining invite:', e);
    return null;
  }
}

export async function apiGetTopSalaryProjects(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/projects/top-salaries`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data.projects : [];
  } catch (e) {
    console.error('Error fetching top salary projects:', e);
    return [];
  }
}

export async function apiSearchUsers(query: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/talent?search=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data.users || [] : [];
  } catch (e) {
    console.error('Error searching users:', e);
    return [];
  }
}

export interface MatchCandidate {
  id: string;
  name: string;
  contact: string;
  skills: string[];
  college: string;
  city: string;
  state: string;
  graduationYear: string;
  lastActive?: string;
  score: number;
  filledSkills: string[];
  gapSkills: string[];
  reasons: string[];
  scoreBreakdown: {
    skill: number;
    breadth: number;
    category: number;
    activity: number;
    location: number;
    collab: number;
  };
}

export interface MatchMeta {
  total: number;
  skillGap: string[];
  ownerSkills: string[];
  projectCategory: string;
  projectCity: string;
}

export async function apiGetCofounderMatches(
  projectId: string,
  limit = 20,
  ownerContact?: string
): Promise<{ matches: MatchCandidate[]; meta: MatchMeta; planLimited?: boolean } | null> {
  try {
    let effectiveLimit = limit;
    let planLimited = false;
    if (ownerContact) {
      const plan = await getPlanForContact(ownerContact);
      if (plan !== 'pro') {
        effectiveLimit = Math.min(limit, PLAN_LIMITS.free.maxMatchResults);
        planLimited = true;
      }
    }

    const res = await fetch(
      `${API_BASE}/match/cofounder?projectId=${encodeURIComponent(projectId)}&limit=${effectiveLimit}`,
      { headers: getAuthHeaders() }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    return {
      matches: data.data.matches,
      meta: data.data.meta,
      planLimited,
    };
  } catch (e) {
    console.error('Match error:', e);
    return null;
  }
}

export async function apiAICofounder(
  action: 'suggest-tasks' | 'draft-dm' | 'generate-pitch' | 'check-health' | 'custom',
  projectId: string,
  context?: Record<string, string>,
  ownerContact?: string
): Promise<{ response: string; devMode: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/ai/cofounder`, {
      method: 'POST',
      headers: await getAuthHeadersAsync(),
      body: JSON.stringify({ action, projectId, context }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 403) {
      throw new PlanLimitError(mapApiError(data?.error, 'ai') || 'AI Co-founder is a Pro feature');
    }
    if (!res.ok) {
      throw new Error(mapApiError(data?.error, 'ai'));
    }
    if (!data.success || !data.data?.response) {
      throw new Error('AI request failed — check that the API is running');
    }
    return { response: data.data.response, devMode: data.data.devMode };
  } catch (e) {
    if (e instanceof PlanLimitError) throw e;
    console.error('AI cofounder error:', e);
    throw new Error(getErrorMessage(e, 'ai'));
  }
}

export interface CoursesListResult {
  courses: Course[];
  total: number;
  page: number;
  hasMore: boolean;
}

function mapCourseLesson(row: any): CourseLesson {
  return {
    id: row._id?.toString?.() || row.id,
    title: row.title,
    content: row.content || '',
    videoUrl: row.videoUrl || '',
    order: row.order ?? 0,
  };
}

function mapCourse(row: any): Course {
  const lessons = (row.lessons || []).map(mapCourseLesson).sort((a: CourseLesson, b: CourseLesson) => a.order - b.order);
  return {
    id: row.id || row._id?.toString?.(),
    title: row.title,
    slug: row.slug,
    description: row.description || '',
    categoryId: row.categoryId,
    skills: row.skills || [],
    level: row.level || 'beginner',
    hours: row.hours ?? 1,
    coverImage: row.coverImage || '',
    lessons,
    projectSlug: row.projectSlug || '',
    lessonCount: row.lessonCount ?? lessons.length,
    enrolled: row.enrolled,
    completedLessonIds: row.completedLessonIds || [],
    progress: row.progress ?? 0,
    completed: row.completed,
  };
}

export async function apiListCourses(params?: {
  categoryId?: string;
  skills?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<CoursesListResult> {
  const qs = new URLSearchParams();
  if (params?.categoryId) qs.set('categoryId', params.categoryId);
  if (params?.skills) qs.set('skills', params.skills);
  if (params?.q) qs.set('q', params.q);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));

  const res = await fetch(`${API_BASE}/courses?${qs}`, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!data.success) {
    return { courses: [], total: 0, page: 1, hasMore: false };
  }
  return {
    courses: (data.data?.courses || []).map(mapCourse),
    total: data.data?.total ?? 0,
    page: data.data?.page ?? 1,
    hasMore: !!data.data?.hasMore,
  };
}

export async function apiGetCourse(slug: string): Promise<Course | null> {
  const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(slug)}`, {
    headers: await getAuthHeadersAsync(),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.success || !data.data) return null;
  return mapCourse(data.data);
}

export async function apiGetMyCourses(): Promise<Course[]> {
  const res = await fetch(`${API_BASE}/courses/my`, {
    headers: await getAuthHeadersAsync(),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.success) return [];
  return (data.data || []).map(mapCourse);
}

export async function apiEnrollCourse(courseId: string): Promise<Course | null> {
  const res = await fetch(`${API_BASE}/courses/${courseId}/enroll`, {
    method: 'POST',
    headers: await getAuthHeadersAsync(),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.success || !data.data) return null;
  return mapCourse(data.data);
}

export async function apiCompleteLesson(
  courseId: string,
  lessonId: string
): Promise<Course | null> {
  const res = await fetch(`${API_BASE}/courses/${courseId}/lessons/${lessonId}/complete`, {
    method: 'POST',
    headers: await getAuthHeadersAsync(),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.success || !data.data) return null;
  return mapCourse(data.data);
}
