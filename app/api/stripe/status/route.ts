import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    configured: Boolean(
      process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_PRICE_ID
    ),
  });
}
