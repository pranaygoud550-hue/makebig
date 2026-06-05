import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin, isSupabaseServerConfigured } from '@/lib/supabase-server';

export const runtime = 'nodejs';

async function upgradeContactToPro(contact: string, stripeCustomerId?: string) {
  const normalized = contact.toLowerCase().trim();
  if (!normalized) return;

  if (isSupabaseServerConfigured && supabaseAdmin) {
    await supabaseAdmin
      .from('users')
      .update({
        plan: 'pro',
        ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
      })
      .eq('contact', normalized);
  }

}

export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const stripe = new Stripe(stripeKey);
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const contact =
        session.metadata?.contact ||
        session.customer_details?.email ||
        session.customer_email ||
        '';
      const customerId =
        typeof session.customer === 'string' ? session.customer : undefined;
      await upgradeContactToPro(contact, customerId);
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const contact = subscription.metadata?.contact;
      if (contact && isSupabaseServerConfigured && supabaseAdmin) {
        await supabaseAdmin
          .from('users')
          .update({ plan: 'free' })
          .eq('contact', contact.toLowerCase());
      }
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
