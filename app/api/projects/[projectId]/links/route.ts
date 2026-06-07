import { NextResponse } from 'next/server';
import { getApiOrigin } from '@/lib/apiBase';
import { verifyAuthToken } from '@/lib/verifyAuthToken';

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const auth = await verifyAuthToken(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${getApiOrigin()}/api/projects/${params.projectId}/links`, {
    headers: {
      Authorization: request.headers.get('Authorization') || '',
    },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
