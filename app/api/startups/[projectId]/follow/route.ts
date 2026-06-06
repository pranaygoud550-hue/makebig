import { NextResponse } from 'next/server';
import { getApiOrigin } from '@/lib/apiBase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API = getApiOrigin();

export async function POST(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const headers: Record<string, string> = {};
    if (authHeader) headers.Authorization = authHeader;
    const res = await fetch(`${API}/api/startups/${params.projectId}/follow`, {
      method: 'POST',
      headers,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: 'Follow failed' }, { status: 503 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const headers: Record<string, string> = {};
    if (authHeader) headers.Authorization = authHeader;
    const res = await fetch(`${API}/api/startups/${params.projectId}/follow`, {
      method: 'DELETE',
      headers,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: 'Unfollow failed' }, { status: 503 });
  }
}
