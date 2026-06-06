import { NextResponse } from 'next/server';
import { fetchAndComputeProjectReadiness } from '@/lib/startupReadiness/fetchProjectReadiness';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const result = await fetchAndComputeProjectReadiness(params.projectId);
    if (!result) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.scores });
  } catch (e) {
    console.error('readiness error:', e);
    return NextResponse.json({ success: false, error: 'Could not compute readiness' }, { status: 500 });
  }
}
