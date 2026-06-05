import { NextResponse } from 'next/server';
import { verifyAuthFromRequest } from '@/lib/verifyAuthToken';
import { supabaseAdmin } from '@/lib/supabase-server';
import { dbPublishProject } from '@/lib/supabase-data';

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const auth = await verifyAuthFromRequest(request);
  if (!auth?.contact) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await context.params;
  if (!projectId?.trim()) {
    return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
  }

  const admin = supabaseAdmin;
  if (!admin) {
    return NextResponse.json(
      { success: false, error: 'Supabase is not configured' },
      { status: 503 }
    );
  }

  const { data: existing, error: fetchError } = await admin
    .from('projects')
    .select('id, owner_contact')
    .eq('id', projectId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
  }

  if (existing.owner_contact !== auth.contact) {
    return NextResponse.json(
      { success: false, error: 'You can only publish your own projects' },
      { status: 403 }
    );
  }

  try {
    const project = await dbPublishProject(projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Publish failed' }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: project });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Publish failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
