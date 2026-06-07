import { NextResponse } from 'next/server';
import { fetchPublicStats } from '@/lib/publicStats';

export const runtime = 'nodejs';
export const revalidate = 300;

export async function GET() {
  const stats = await fetchPublicStats();
  return NextResponse.json(stats);
}
