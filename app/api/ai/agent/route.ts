import { NextResponse } from 'next/server';
import { getApiOrigin } from '@/lib/apiBase';
import { verifyAuthToken } from '@/lib/verifyAuthToken';

export async function POST(request: Request) {
  const auth = await verifyAuthToken(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const res = await fetch(`${getApiOrigin()}/api/ai/agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: request.headers.get('Authorization') || '',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
