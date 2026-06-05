import { NextResponse } from 'next/server';
import { getApiOrigin } from '@/lib/apiBase';

export const runtime = 'nodejs';

/** Proxy to Express + MongoDB (courses live in Atlas, not Supabase). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const API = getApiOrigin();

  try {
    const res = await fetch(`${API}/api/courses?${searchParams.toString()}`, {
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({ success: false }));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Courses API unavailable — run npm run dev (Express on port 5001)',
      },
      { status: 503 }
    );
  }
}
