import { NextResponse } from 'next/server';
import { getPublicProjectBySlug } from '@/lib/publicProjects';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const result = await getPublicProjectBySlug(params.slug);
  if (!result) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: result });
}
