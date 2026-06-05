import { NextResponse } from 'next/server';
import { getApiBase } from '@/lib/apiBase';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  const API_BASE = getApiBase();
  const auth = request.headers.get('authorization');
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(params.courseId)}/enroll`, {
      method: 'POST',
      headers: { Authorization: auth },
    });
    const data = await res.json().catch(() => ({ success: false }));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: 'Enroll failed' }, { status: 503 });
  }
}
