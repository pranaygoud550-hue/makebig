import { connectMongoServer } from './mongoServer';
import { filterAllowedProjects } from './projectAllowlist';
import type { ExploreParams, ExploreProject, ExploreResult } from './publicProjects';

interface MongoProjectDoc {
  _id: { toString(): string };
  name?: string;
  desc?: string;
  categoryId?: string;
  roles?: string[];
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
  };

  if (params.city) {
    filter.city = new RegExp(String(params.city), 'i');
  }
  if (params.categoryId && params.categoryId !== 'all') {
    filter.categoryId = params.categoryId;
  }
  if (params.skills) {
    const skillArr = String(params.skills)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (skillArr.length) {
      filter.roles = { $in: skillArr.map((s) => new RegExp(s, 'i')) };
    }
  }

  const [projects, totalBeforeFilter] = await Promise.all([
    Project.find(filter).sort({ createdAt: -1 }).lean(),
    Project.countDocuments(filter),
  ]);

  const filtered = filterAllowedProjects(projects as MongoProjectDoc[]);
  const pageSlice = filtered.slice(skip, skip + limit);

  const mapped: ExploreProject[] = pageSlice.map((p) => ({
    id: p._id.toString(),
    name: String(p.name || ''),
    desc: String(p.desc || ''),
    categoryId: String(p.categoryId || 'other'),
    roles: p.roles || [],
    city: String(p.city || ''),
    state: String(p.state || ''),
    slug: String(p.slug || ''),
    salaryMin: p.salaryMin,
    salaryMax: p.salaryMax,
    currency: String(p.currency || 'INR'),
    ownerContact: p.ownerContact,
    createdAt: p.createdAt ? String(p.createdAt) : undefined,
    joinedCount: (p.teamMembers || []).filter((m) => m.status === 'joined').length,
  }));

  return {
    projects: mapped,
    total: filtered.length || totalBeforeFilter,
    page,
    hasMore: skip + limit < filtered.length,
  };
}
