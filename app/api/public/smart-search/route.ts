import { NextResponse } from 'next/server';
import { getApiOrigin } from '@/lib/apiBase';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  try {
    const res = await fetch(
      `${getApiOrigin()}/api/public/smart-search?q=${encodeURIComponent(q)}`
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ projects: [], users: [], posts: [], trending: [] });
  }
}
