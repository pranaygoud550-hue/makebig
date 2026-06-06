import { NextResponse } from 'next/server';
import { getApiOrigin } from '@/lib/apiBase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API = getApiOrigin();

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const res = await fetch(`${API}/api/startup-feed?${url.searchParams}`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: 'Feed unavailable' }, { status: 503 });
  }
}
