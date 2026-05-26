import { NextResponse } from 'next/server';
import { getApiBase } from '@/lib/apiBase';

export const runtime = 'nodejs';

const API_BASE = getApiBase();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  try {
    const res = await fetch(`${API_BASE}/courses${qs ? `?${qs}` : ''}`, {
      next: { revalidate: 60 },
    });
    const data = await res.json().catch(() => ({ success: false }));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({
      success: true,
      data: { courses: [], total: 0, page: 1, hasMore: false },
    });
  }
}
