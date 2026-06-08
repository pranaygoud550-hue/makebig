import { NextResponse } from 'next/server';

import { getApiOrigin } from '@/lib/apiBase';

const API = getApiOrigin();

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const res = await fetch(`${API}/api/projects/${params.id}/detail`, {
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Detail unavailable' },
      { status: 503 }
    );
  }
}
