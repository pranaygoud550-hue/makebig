import { NextResponse } from 'next/server';

import { getApiOrigin } from '@/lib/apiBase';

const API = getApiOrigin();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const limit = searchParams.get('limit') || '12';

  try {
    const res = await fetch(
      `${API}/api/search?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`,
      { cache: 'no-store' }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Search unavailable' },
      { status: 503 }
    );
  }
}
