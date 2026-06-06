import { NextResponse } from 'next/server';
import { listVerifiableSkills } from '@/lib/skillVerification/exam';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ success: true, data: { skills: listVerifiableSkills() } });
}
