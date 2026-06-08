import { getAuthHeadersAsync } from '@/lib/api';
import { getAICofounderStreamUrl } from '@/lib/aiCofounderUrls';

export const AI_CONTEXT_WINDOW = 200_000;

export interface StreamMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalUsed?: number;
  percent?: number;
  contextWindow?: number;
}

export interface StreamDonePayload {
  devMode?: boolean;
  provider?: string;
  usage?: StreamUsage;
}

export interface StreamCofounderParams {
  projectId: string;
  advisorMode?: boolean;
  messages: StreamMessage[];
  action?: string;
  context?: Record<string, string>;
  onDelta: (text: string) => void;
  onDone: (payload: StreamDonePayload) => void;
  onError: (message: string) => void;
  signal?: AbortSignal;
}

export async function streamAICofounder({
  projectId,
  advisorMode,
  messages,
  action,
  context,
  onDelta,
  onDone,
  onError,
  signal,
}: StreamCofounderParams): Promise<void> {
  const res = await fetch(getAICofounderStreamUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await getAuthHeadersAsync()),
    },
    credentials: 'include',
    body: JSON.stringify({ projectId, advisorMode, messages, action, context }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const body = err as { error?: string; message?: string };
    onError(
      body.error ||
        body.message ||
        (res.status === 401 ? 'Sign in again to use AI Co-founder' : `Request failed (${res.status})`)
    );
    return;
  }

  if (!res.body) {
    onError('No response stream');
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      try {
        const payload = JSON.parse(trimmed.slice(5).trim()) as {
          type: string;
          text?: string;
          message?: string;
          devMode?: boolean;
          provider?: string;
          usage?: StreamUsage;
        };

        if (payload.type === 'delta' && payload.text) {
          onDelta(payload.text);
        } else if (payload.type === 'done') {
          onDone({
            devMode: payload.devMode,
            provider: payload.provider,
            usage: payload.usage,
          });
        } else if (payload.type === 'error') {
          onError(payload.message || 'Stream error');
        }
      } catch {
        /* ignore malformed SSE lines */
      }
    }
  }
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
