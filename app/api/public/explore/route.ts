import { NextResponse } from 'next/server';
import { exploreProjectsFromMongo } from '@/lib/mongoExplore';
import { isMongoConfigured } from '@/lib/mongoServer';
import { explorePublicProjects } from '@/lib/publicProjects';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const params = {
    city: searchParams.get('city') || undefined,
    categoryId: searchParams.get('categoryId') || undefined,
    skills: searchParams.get('skills') || undefined,
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: parseInt(searchParams.get('limit') || '12', 10),
  };

  if (isMongoConfigured()) {
    try {
      const mongoResult = await exploreProjectsFromMongo(params);
      if (mongoResult) {
        return NextResponse.json({ success: true, data: mongoResult });
      }
    } catch (e) {
      console.error('[explore] MongoDB query failed:', e);
      return NextResponse.json(
        {
          success: false,
          error: 'Could not load projects — check MONGODB_URI on Vercel',
        },
        { status: 503 }
      );
    }
  }

  const result = await explorePublicProjects(params);
  return NextResponse.json({ success: true, data: result });
}
