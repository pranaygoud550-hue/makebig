import { NextResponse } from 'next/server';
import { explorePublicProjects } from '@/lib/publicProjects';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = await explorePublicProjects({
    city: searchParams.get('city') || undefined,
    categoryId: searchParams.get('categoryId') || undefined,
    skills: searchParams.get('skills') || undefined,
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: parseInt(searchParams.get('limit') || '12', 10),
  });
  return NextResponse.json({ success: true, data: result });
}
