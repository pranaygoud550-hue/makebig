import { connectMongoServer } from '@/lib/mongoServer';
import { isMongoConfigured } from '@/lib/mongoServer';

export interface PublicStats {
  totalProjects: number;
  totalUsers: number;
  totalCities: number;
}

const FALLBACK: PublicStats = {
  totalProjects: 0,
  totalUsers: 0,
  totalCities: 0,
};

export async function fetchPublicStats(): Promise<PublicStats> {
  if (!isMongoConfigured()) return FALLBACK;

  try {
    const connected = await connectMongoServer();
    if (!connected) return FALLBACK;

    const Project = (await import('@/backend/models/Project.js')).default;
    const User = (await import('@/backend/models/User.js')).default;

    const [totalProjects, totalUsers, cities] = await Promise.all([
      Project.countDocuments({ status: { $in: ['published', 'active'] } }),
      User.countDocuments({}),
      Project.distinct('city', { city: { $nin: ['', null] } }),
    ]);

    return {
      totalProjects: totalProjects || 0,
      totalUsers: totalUsers || 0,
      totalCities: Array.isArray(cities) ? cities.filter(Boolean).length : 0,
    };
  } catch (e) {
    console.error('[stats] MongoDB query failed:', e);
    return FALLBACK;
  }
}
