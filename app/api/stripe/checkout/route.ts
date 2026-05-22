import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { verifyAuthFromRequest } from '@/lib/verifyAuthToken';
import { validateEmail } from '@/lib/userErrors';

export const runtime = 'nodejs';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!stripe || !priceId) {
    return NextResponse.json(
      { error: 'Stripe is not configured yet', comingSoon: true },
      { status: 503 }
    );
  }

  const auth = await verifyAuthFromRequest(request);
  if (!auth?.contact) {
    return NextResponse.json({ error: 'Sign in to upgrade your account' }, { status: 401 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const emailFromBody = body.email?.trim().toLowerCase();
  const email = auth.contact.includes('@')
    ? auth.contact
    : emailFromBody || '';

  if (!email) {
    return NextResponse.json(
      { error: 'Upgrade requires an email address — sign in with email to continue' },
      { status: 400 }
    );
  }

  const emailErr = validateEmail(email);
  if (emailErr) {
    return NextResponse.json({ error: emailErr }, { status: 400 });
  }

  if (auth.contact.includes('@') && email !== auth.contact) {
    return NextResponse.json({ error: 'Checkout email must match your signed-in account' }, { status: 403 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?canceled=1`,
      metadata: {
        contact: auth.contact,
      },
      subscription_data: {
        metadata: {
          contact: auth.contact,
        },
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Checkout session could not be created' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    console.error('Stripe checkout error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
