/**
 * Public project data for SEO pages, OG images, explore, and sitemap.
 * Works with Supabase (service role) or the Express API fallback.
 */

import { supabaseAdmin, isSupabaseServerConfigured } from './supabase-server';
import { isMongoBackendModeServer } from './backendModeServer';
import { slugifyProjectName } from './site';
import { getApiOrigin } from './apiBase';

const API = getApiOrigin();

const PUBLIC_STATUSES = ['published', 'in-progress'];

export interface PublicProject {
  id: string;
  name: string;
  desc: string;
  categoryId: string;
  roles: string[];
  city: string;
  state: string;
  slug: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  createdAt?: string;
  teamSize?: number;
}

export interface PublicPost {
  id: string;
  authorId: string;
  body: string;
  imageUrl?: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

export interface ExploreProject extends PublicProject {
  ownerContact?: string;
  joinedCount?: number;
}

function mapProjectRow(row: Record<string, unknown>): PublicProject {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    desc: String(row.description || row.desc || ''),
    categoryId: String(row.category_id || row.categoryId || 'other'),
    roles: (row.roles as string[]) || [],
    city: String(row.city || ''),
    state: String(row.state || ''),
    slug: String(row.slug || ''),
    salaryMin: (row.salary_min ?? row.salaryMin) as number | undefined,
    salaryMax: (row.salary_max ?? row.salaryMax) as number | undefined,
    currency: String(row.currency || 'INR'),
    createdAt: String(row.created_at || row.createdAt || ''),
    teamSize: typeof row.teamSize === 'number' ? row.teamSize : undefined,
  };
}

async function fetchFromApi<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function getPublicProjectBySlug(
  slug: string
): Promise<{ project: PublicProject; posts: PublicPost[] } | null> {
  if (!isMongoBackendModeServer() && isSupabaseServerConfigured && supabaseAdmin) {
    const { data: row, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('slug', slug)
      .in('status', PUBLIC_STATUSES)
      .maybeSingle();

    if (error || !row) return null;

    const { count: memberCount } = await supabaseAdmin
      .from('project_members')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', row.id)
      .eq('status', 'joined');

    const { data: postRows } = await supabaseAdmin
      .from('posts')
      .select('id, author_contact, body, image_url, created_at')
      .eq('project_id', row.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const posts: PublicPost[] = await Promise.all(
      (postRows || []).map(async (p) => {
        const [{ count: likes }, { count: comments }] = await Promise.all([
          supabaseAdmin!
            .from('likes')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', p.id),
          supabaseAdmin!
            .from('comments')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', p.id),
        ]);
        return {
          id: p.id,
          authorId: p.author_contact,
          body: p.body,
          imageUrl: p.image_url || undefined,
          likeCount: likes || 0,
          commentCount: comments || 0,
          createdAt: p.created_at,
        };
      })
    );

    const project = mapProjectRow(row);
    project.teamSize = memberCount || 0;
    return { project, posts };
  }

  const data = await fetchFromApi<{ project: PublicProject; posts: PublicPost[] }>(
    `/api/p/${encodeURIComponent(slug)}`
  );
  return data || null;
}

export async function getPublishedSlugs(): Promise<string[]> {
  if (!isMongoBackendModeServer() && isSupabaseServerConfigured && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('slug')
      .in('status', PUBLIC_STATUSES)
      .not('slug', 'is', null)
      .neq('slug', '');
    if (error) return [];
    return (data || []).map((r) => r.slug).filter(Boolean);
  }

  const data = await fetchFromApi<{ slugs: (string | { slug?: string })[] }>('/api/slugs');
  return (data?.slugs || [])
    .map((s) => (typeof s === 'string' ? s : s?.slug))
    .filter((s): s is string => typeof s === 'string' && s.length > 0);
}

export interface ExploreParams {
  city?: string;
  categoryId?: string;
  skills?: string;
  tags?: string;
  q?: string;
  page?: number;
  limit?: number;
  viewerContact?: string;
}

export interface ExploreResult {
  projects: ExploreProject[];
  total: number;
  page: number;
  hasMore: boolean;
}

export async function explorePublicProjects(params: ExploreParams = {}): Promise<ExploreResult> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, params.limit || 12);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  if (!isMongoBackendModeServer() && isSupabaseServerConfigured && supabaseAdmin) {
    let query = supabaseAdmin
      .from('projects')
      .select('*, project_members(count)', { count: 'exact' })
      .in('status', PUBLIC_STATUSES)
      .in('visibility', ['public', 'invite-only'])
      .order('updated_at', { ascending: false });

    if (params.city) query = query.ilike('city', `%${params.city}%`);
    if (params.categoryId && params.categoryId !== 'all') {
      query = query.eq('category_id', params.categoryId);
    }
    if (params.skills) {
      const terms = params.skills.split(',').map((s) => s.trim()).filter(Boolean);
      if (terms.length === 1) {
        query = query.contains('roles', [terms[0]]);
      }
    }

    const { data, error, count } = await query.range(from, to);
    if (error) return { projects: [], total: 0, page, hasMore: false };

    const projects: ExploreProject[] = (data || []).map((row) => {
      const p = mapProjectRow(row);
      return {
        ...p,
        ownerContact: row.owner_contact,
        joinedCount: row.project_members?.[0]?.count || 0,
      };
    });

    const total = count || 0;
    return { projects, total, page, hasMore: from + limit < total };
  }

  const qs = new URLSearchParams();
  if (params.city) qs.set('city', params.city);
  if (params.categoryId) qs.set('categoryId', params.categoryId);
  if (params.skills) qs.set('skills', params.skills);
  qs.set('page', String(page));
  qs.set('limit', String(limit));

  const data = await fetchFromApi<ExploreResult>(`/api/explore?${qs}`);
  return data || { projects: [], total: 0, page, hasMore: false };
}

/** Ensure a published project has a unique slug (Supabase). */
export async function ensureProjectSlug(
  projectId: string,
  name: string,
  city?: string
): Promise<string | null> {
  if (!isSupabaseServerConfigured || !supabaseAdmin) return null;

  const { data: existing } = await supabaseAdmin
    .from('projects')
    .select('slug')
    .eq('id', projectId)
    .single();

  if (existing?.slug) return existing.slug;

  let base = slugifyProjectName(name, city);
  let slug = base;
  let suffix = 0;

  while (true) {
    const { data: clash } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('slug', slug)
      .neq('id', projectId)
      .maybeSingle();
    if (!clash) break;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  const { data, error } = await supabaseAdmin
    .from('projects')
    .update({ slug })
    .eq('id', projectId)
    .select('slug')
    .single();

  if (error) return null;
  return data?.slug || slug;
}
