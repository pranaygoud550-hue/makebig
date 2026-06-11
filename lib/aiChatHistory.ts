import { getAuthHeadersAsync } from '@/lib/api';
import { getApiBase } from '@/lib/apiBase';
import { isMongoBackendMode } from '@/lib/backendMode';
import type { GitHubMeta } from '@/lib/aiLinkReaderStream';

export const MAX_STORED_AI_MESSAGES = 150;

export interface StoredChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: string;
  devMode?: boolean;
  ts: number;
  linkMeta?: { url: string; title: string; domain: string };
  github?: GitHubMeta | null;
  isLinkRead?: boolean;
  streaming?: boolean;
}

export function getAIChatThreadKey(projectId?: string, advisorMode?: boolean): string {
  if (advisorMode || projectId === 'advisor') return 'advisor';
  const id = String(projectId || '').trim();
  return id ? `project:${id}` : '';
}

function historyUrl(): string {
  return isMongoBackendMode()
    ? `${getApiBase()}/ai/chat/history`
    : '/api/ai/chat/history';
}

export async function fetchAIChatHistory(
  projectId: string | undefined,
  advisorMode: boolean
): Promise<StoredChatMessage[]> {
  const threadKey = getAIChatThreadKey(projectId, advisorMode);
  if (!threadKey) return [];

  const params = new URLSearchParams({ threadKey });
  if (projectId) params.set('projectId', projectId);
  if (advisorMode) params.set('advisorMode', '1');

  const res = await fetch(`${historyUrl()}?${params}`, {
    headers: await getAuthHeadersAsync(),
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) return [];
  return (data.data?.messages || []) as StoredChatMessage[];
}

export async function saveAIChatHistory(
  projectId: string | undefined,
  advisorMode: boolean,
  messages: StoredChatMessage[]
): Promise<boolean> {
  const threadKey = getAIChatThreadKey(projectId, advisorMode);
  if (!threadKey) return false;

  const toStore = messages
    .filter((m) => !m.streaming && String(m.content || '').trim())
    .map(({ streaming: _s, ...rest }) => rest)
    .slice(-MAX_STORED_AI_MESSAGES);

  const res = await fetch(historyUrl(), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(await getAuthHeadersAsync()),
    },
    credentials: 'include',
    body: JSON.stringify({
      threadKey,
      projectId: projectId || '',
      advisorMode,
      messages: toStore,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return Boolean(res.ok && data.success);
}
