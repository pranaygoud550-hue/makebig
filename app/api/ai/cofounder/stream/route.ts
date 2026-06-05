import { NextRequest } from 'next/server';
import { verifyAuthFromRequest } from '@/lib/verifyAuthToken';
import { supabaseAdmin, isSupabaseServerConfigured } from '@/lib/supabase-server';
import type { ProjectRow } from '@/lib/database.types';
import {
  streamCofounderReply,
  computeContextUsage,
  buildSystemPrompt,
  normalizeHistory,
  CONTEXT_WINDOW,
} from '@/backend/ai/cofounder.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await verifyAuthFromRequest(request);
  if (!auth) {
    return new Response(JSON.stringify({ type: 'error', message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const admin = supabaseAdmin;
  if (!isSupabaseServerConfigured || !admin) {
    return new Response(
      JSON.stringify({
        type: 'error',
        message: 'Supabase not configured — use Express API (NEXT_PUBLIC_DATA_BACKEND=mongo)',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const body = await request.json();
  const { projectId, messages = [], action, context = {} } = body;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      try {
        if (!projectId) {
          send({ type: 'error', message: 'projectId required' });
          controller.close();
          return;
        }

        const { data: project, error } = await admin
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (error || !project) {
          send({ type: 'error', message: 'Project not found' });
          controller.close();
          return;
        }

        const row = project as ProjectRow;
        const projectDoc = {
          name: row.name,
          desc: row.description,
          categoryId: row.category_id,
          roles: row.roles,
          salaryMax: row.salary_max,
          city: row.city,
          state: row.state,
          tasks: [] as { title: string; status: string }[],
          teamMembers: [] as { contact: string; status: string }[],
          createdAt: row.created_at,
        };

        const systemPrompt = buildSystemPrompt(projectDoc);
        let fullText = '';

        const result = await streamCofounderReply({
          project: projectDoc,
          history: messages,
          action,
          context,
          onDelta: (text: string) => {
            fullText += text;
            send({ type: 'delta', text });
          },
        });

        const ctxUsage = computeContextUsage(systemPrompt, normalizeHistory(messages), fullText);

        send({
          type: 'done',
          devMode: result.devMode,
          provider: result.provider,
          projectName: row.name,
          usage: {
            inputTokens: result.usage?.inputTokens ?? ctxUsage.inputTokens,
            outputTokens: result.usage?.outputTokens ?? ctxUsage.outputTokens,
            totalUsed: ctxUsage.totalUsed,
            percent: ctxUsage.percent,
            contextWindow: CONTEXT_WINDOW,
          },
        });
      } catch (e) {
        send({
          type: 'error',
          message: e instanceof Error ? e.message : 'Stream failed',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
