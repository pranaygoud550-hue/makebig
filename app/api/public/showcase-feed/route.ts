import { NextResponse } from 'next/server';
import { getApiOrigin } from '@/lib/apiBase';

export const runtime = 'nodejs';
export const revalidate = 60;

export async function GET() {
  try {
    const res = await fetch(`${getApiOrigin()}/api/public/showcase-feed`, {
      next: { revalidate: 60 },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ items: [] });
  }
}
