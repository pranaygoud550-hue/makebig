import { NextResponse } from 'next/server';
import { getApiOrigin } from '@/lib/apiBase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API = getApiOrigin();

export async function GET(
  _req: Request,
  { params }: { params: { contact: string } }
) {
  try {
    const contact = decodeURIComponent(params.contact);
    const res = await fetch(`${API}/api/users/${encodeURIComponent(contact)}/reputation`, {
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: 'Reputation unavailable' }, { status: 503 });
  }
}
