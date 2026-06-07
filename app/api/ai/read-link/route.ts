import { NextRequest } from 'next/server';
import { verifyAuthFromRequest } from '@/lib/verifyAuthToken';
import { getApiOrigin } from '@/lib/apiBase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await verifyAuthFromRequest(request);
  if (!auth) {
    return new Response(JSON.stringify({ type: 'error', message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const apiRes = await fetch(`${getApiOrigin()}/api/ai/read-link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: request.headers.get('Authorization') || '',
    },
    body: JSON.stringify(body),
  });

  if (!apiRes.ok && !apiRes.body) {
    const err = await apiRes.json().catch(() => ({}));
    return new Response(JSON.stringify(err), {
      status: apiRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(apiRes.body, {
    status: apiRes.status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
