import { connectMongoServer } from './mongoServer';
import { filterAllowedProjects } from './projectAllowlist';
import { dedupeProjectsForDisplay } from './dedupeProjects';
import {
  getViewerProjectRelation,
  shouldHideFromExploreFeed,
} from './projectMembership';
import type { ExploreParams, ExploreProject, ExploreResult } from './publicProjects';

interface MongoProjectDoc {
  _id: { toString(): string };
  name?: string;
  desc?: string;
  categoryId?: string;
  roles?: string[];
  tags?: string[];
  city?: string;
  state?: string;
  slug?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  ownerContact?: string;
  createdAt?: Date | string;
  teamMembers?: { status?: string }[];
}

async function getBlockedSet(viewerContact?: string) {
  const blocked = new Set<string>();
  if (!viewerContact) return blocked;
  const connected = await connectMongoServer();
  if (!connected) return blocked;
  const User = (await import('@/backend/models/User.js')).default;
  const viewer = await User.findOne({ contact: viewerContact.toLowerCase() }).lean();
  for (const c of viewer?.blockedUsers || []) blocked.add(c.toLowerCase());
  const blockers = await User.find({ blockedUsers: viewerContact.toLowerCase() })
    .select('contact')
    .lean();
  for (const u of blockers) blocked.add(String(u.contact).toLowerCase());
  return blocked;
}

export async function exploreProjectsFromMongo(
  params: ExploreParams = {}
): Promise<ExploreResult | null> {
  const connected = await connectMongoServer();
  if (!connected) return null;

  const Project = (await import('@/backend/models/Project.js')).default;

  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, params.limit || 12);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {
    status: { $in: ['published', 'in-progress'] },
    visibility: { $in: ['public', 'invite-only'] },
  };

  if (params.city) {
    filter.city = new RegExp(String(params.city), 'i');
  }
  if (params.categoryId && params.categoryId !== 'all') {
    filter.categoryId = params.categoryId;
  }

  const q = (params.q || '').trim();
  const skillTerms = (params.skills || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const tagTerms = (params.tags || '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  if (tagTerms.length) {
    filter.tags = { $in: tagTerms };
  }

  const orClauses: Record<string, unknown>[] = [];
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    orClauses.push({ name: regex }, { desc: regex }, { roles: regex }, { tags: regex });
  }
  if (skillTerms.length) {
    for (const t of skillTerms) {
      const rx = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      orClauses.push({ roles: rx }, { tags: t });
    }
  }
  if (orClauses.length) {
    filter.$or = orClauses;
  }

  const [projects, totalBeforeFilter] = await Promise.all([
    Project.find(filter).sort({ createdAt: -1 }).lean(),
    Project.countDocuments(filter),
  ]);

  let withStringIds = (projects as MongoProjectDoc[]).map((p) => ({
    ...p,
    id: p._id.toString(),
    _id: p._id.toString(),
  }));

  if (skillTerms.length) {
    withStringIds = withStringIds.filter((p) =>
      skillTerms.some(
        (t) =>
          (p.roles || []).some((r) => r.toLowerCase().includes(t)) ||
          (p.tags || []).some((tag) => tag.includes(t))
      )
    );
  }

  const blocked = await getBlockedSet(params.viewerContact);
  if (blocked.size) {
    withStringIds = withStringIds.filter(
      (p) => !blocked.has(String(p.ownerContact || '').toLowerCase())
    );
  }

  if (params.viewerContact) {
    withStringIds = withStringIds.filter((p) => {
      const relation = getViewerProjectRelation(params.viewerContact, p);
      return !shouldHideFromExploreFeed(relation);
    });
  }

  const filtered = dedupeProjectsForDisplay(filterAllowedProjects(withStringIds));
  const pageSlice = filtered.slice(skip, skip + limit);

  const mapped: ExploreProject[] = pageSlice.map((p) => ({
    id: String(p.id || p._id),
    name: String(p.name || ''),
    desc: String(p.desc || ''),
    categoryId: String(p.categoryId || 'other'),
    roles: p.roles || [],
    tags: (p as MongoProjectDoc).tags || [],
    city: String(p.city || ''),
    state: String(p.state || ''),
    slug: String(p.slug || ''),
    salaryMin: p.salaryMin,
    salaryMax: p.salaryMax,
    currency: String(p.currency || 'INR'),
    ownerContact: p.ownerContact,
    createdAt: p.createdAt ? String(p.createdAt) : undefined,
    joinedCount: (p.teamMembers || []).filter((m) => m.status === 'joined').length,
    viewerRelation: params.viewerContact
      ? getViewerProjectRelation(params.viewerContact, p)
      : 'none',
  }));

  return {
    projects: mapped,
    total: filtered.length || totalBeforeFilter,
    page,
    hasMore: skip + limit < filtered.length,
  };
}
