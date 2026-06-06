import { NextResponse } from 'next/server';
import { examForClient } from '@/lib/skillVerification/exam';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { skillId: string } }) {
  const exam = examForClient(params.skillId);
  if (!exam) {
    return NextResponse.json({ success: false, error: 'Skill not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: exam });
}
