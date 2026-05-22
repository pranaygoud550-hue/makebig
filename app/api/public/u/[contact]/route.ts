import { NextResponse } from 'next/server';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export async function GET(
  _request: Request,
  { params }: { params: { contact: string } }
) {
  try {
    const contact = decodeURIComponent(params.contact);
    const res = await fetch(
      `${API}/api/users/${encodeURIComponent(contact)}/public-profile`,
      { cache: 'no-store' }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch {
    return NextResponse.json({ success: false, error: 'Profile unavailable' }, { status: 503 });
  }
}
