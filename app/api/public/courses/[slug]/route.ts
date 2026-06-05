import { NextResponse } from 'next/server';
import { getApiBase } from '@/lib/apiBase';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const API_BASE = getApiBase();
  const auth = request.headers.get('authorization');
  try {
    const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(params.slug)}`, {
      headers: auth ? { Authorization: auth } : {},
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({ success: false }));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: 'Course unavailable' }, { status: 503 });
  }
}
