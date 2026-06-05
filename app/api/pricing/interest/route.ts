import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseServerConfigured } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { contact?: string; plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const contact = body.contact?.trim().toLowerCase();
  const plan = body.plan?.trim().toLowerCase() || 'pro';

  if (!contact) {
    return NextResponse.json({ error: 'Contact required' }, { status: 400 });
  }

  if (isSupabaseServerConfigured && supabaseAdmin) {
    const { error } = await supabaseAdmin
      .from('pricing_interest')
      .upsert({ contact, plan }, { onConflict: 'contact,plan' });
    if (error) {
      console.error('pricing_interest insert:', error.message);
      return NextResponse.json({ error: 'Could not save interest' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  console.info('[pricing interest]', { contact, plan });
  return NextResponse.json({ ok: true, stored: 'log' });
}
