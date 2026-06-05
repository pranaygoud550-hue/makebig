import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthFromRequest } from '@/lib/verifyAuthToken';
import {
  isAnthropicConfigured,
  isGroqConfigured,
  CONTEXT_WINDOW,
} from '@/backend/ai/cofounder.js';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await verifyAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const provider = isAnthropicConfigured() ? 'anthropic' : isGroqConfigured() ? 'groq' : 'demo';

  return NextResponse.json({
    success: true,
    data: {
      provider,
      anthropic: isAnthropicConfigured(),
      groq: isGroqConfigured(),
      contextWindow: CONTEXT_WINDOW,
    },
  });
}
