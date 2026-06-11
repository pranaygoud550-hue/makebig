import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest } from '@/lib/verifyAuthToken';
import { connectMongoServer } from '@/lib/mongoServer';
import {
  getAIChatThreadKey,
  loadAIChatHistory,
  saveAIChatHistory,
} from '@/backend/ai/chatHistory.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyAuthFromRequest(request);
  if (!auth?.contact) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const connected = await connectMongoServer();
  if (!connected) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const advisorMode = searchParams.get('advisorMode') === '1';
  const projectId = searchParams.get('projectId') || '';
  const threadKey =
    searchParams.get('threadKey') ||
    getAIChatThreadKey({ projectId, advisorMode });

  if (!threadKey) {
    return NextResponse.json({ success: false, error: 'threadKey required' }, { status: 400 });
  }

  const messages = await loadAIChatHistory(auth.contact, threadKey);
  return NextResponse.json({ success: true, data: { threadKey, messages } });
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAuthFromRequest(request);
  if (!auth?.contact) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const connected = await connectMongoServer();
  if (!connected) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 503 }
    );
  }

  const body = await request.json();
  const advisorMode = Boolean(body.advisorMode);
  const projectId = String(body.projectId || '');
  const threadKey =
    String(body.threadKey || '') ||
    getAIChatThreadKey({ projectId, advisorMode });
  const messages = Array.isArray(body.messages) ? body.messages : [];

  if (!threadKey) {
    return NextResponse.json({ success: false, error: 'threadKey required' }, { status: 400 });
  }

  const result = await saveAIChatHistory({
    contact: auth.contact,
    threadKey,
    projectId,
    advisorMode,
    messages,
  });

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: { threadKey, count: result.count } });
}
