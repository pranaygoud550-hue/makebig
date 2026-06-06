import { NextResponse } from 'next/server';
import { connectMongoServer } from '@/lib/mongoServer';
import { upsertVerifiedUser } from '@/lib/userUpsert.js';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    await connectMongoServer();
    const body = await req.json();
    const result = await upsertVerifiedUser(body, { requireVerified: true });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (e) {
    console.error('users/upsert error:', e);
    return NextResponse.json(
      { success: false, error: 'Could not save your account — try again' },
      { status: 500 }
    );
  }
}
