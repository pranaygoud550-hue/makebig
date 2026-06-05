import { NextResponse } from 'next/server';
import { getApiBase } from '@/lib/apiBase';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const API_BASE = getApiBase();
  const auth = request.headers.get('authorization');
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const res = await fetch(`${API_BASE}/courses/my`, {
      headers: { Authorization: auth },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({ success: false }));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: 'Courses unavailable' }, { status: 503 });
  }
}
