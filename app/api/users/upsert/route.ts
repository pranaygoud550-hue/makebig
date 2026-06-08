import { NextResponse } from 'next/server';
import { connectMongoServer } from '@/lib/mongoServer';
import { upsertVerifiedUser } from '@/lib/userUpsert.js';
import { setAuthCookieOnResponse } from '@/lib/authSessionServer';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    await connectMongoServer();
    const body = await req.json();
    const result = await upsertVerifiedUser(body, { requireVerified: true });

    if (!result.ok || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || 'Could not save account' },
        { status: result.status || 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      data: { user: result.data.user },
    });
    return setAuthCookieOnResponse(response, result.data.token);
  } catch (e) {
    console.error('users/upsert error:', e);
    return NextResponse.json(
      { success: false, error: 'Could not save your account — try again' },
      { status: 500 }
    );
  }
}
