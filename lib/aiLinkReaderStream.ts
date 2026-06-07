import { getAuthHeadersAsync } from '@/lib/api';
import { getApiOrigin } from '@/lib/apiBase';

export interface LinkReadUsage {
  used: number;
  limit: number | null;
  isPro: boolean;
  remaining: number | null;
}

export interface GitHubMeta {
  name: string;
  stars: number;
  forks: number;
  language: string;
  lastCommitMessage?: string;
  lastCommitDate?: string;
}

export interface LinkReadPageMeta {
  title: string;
  url: string;
  github: GitHubMeta | null;
}

export interface StreamLinkReaderParams {
  projectId: string;
  url: string;
  question?: string;
  onFetching?: () => void;
  onPage?: (meta: LinkReadPageMeta) => void;
  onDelta: (text: string) => void;
  onDone: (payload: { devMode?: boolean; provider?: string; usage?: LinkReadUsage }) => void;
  onError: (message: string, usage?: LinkReadUsage) => void;
  signal?: AbortSignal;
}

export function getReadLinkStreamUrl(): string {
  const origin = getApiOrigin();
  if (typeof window !== 'undefined' && origin.includes('localhost:5001')) {
    return `${origin}/api/ai/read-link`;
  }
  return '/api/ai/read-link';
}

export async function streamLinkReader({
  projectId,
  url,
  question,
  onFetching,
  onPage,
  onDelta,
  onDone,
  onError,
  signal,
}: StreamLinkReaderParams): Promise<void> {
  const res = await fetch(getReadLinkStreamUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await getAuthHeadersAsync()),
    },
    body: JSON.stringify({ projectId, url, question }),
    signal,
  });

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const err = await res.json().catch(() => ({}));
      const body = err as {
        error?: string;
        message?: string;
        data?: { usage?: LinkReadUsage };
      };
      onError(
        body.error ||
          body.message ||
          (res.status === 401 ? 'Sign in again to read links' : `Request failed (${res.status})`),
        body.data?.usage
      );
      return;
    }
    onError(`Request failed (${res.status})`);
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
          title?: string;
          url?: string;
          github?: GitHubMeta | null;
          devMode?: boolean;
          provider?: string;
          usage?: LinkReadUsage;
          status?: string;
        };

        if (payload.type === 'meta' && payload.status === 'fetching') {
          onFetching?.();
        } else if (payload.type === 'page' && payload.url && payload.title) {
          onPage?.({
            title: payload.title,
            url: payload.url,
            github: payload.github ?? null,
          });
        } else if (payload.type === 'delta' && payload.text) {
          onDelta(payload.text);
        } else if (payload.type === 'done') {
          onDone({
            devMode: payload.devMode,
            provider: payload.provider,
            usage: payload.usage,
          });
        } else if (payload.type === 'error') {
          onError(payload.message || 'Stream error', payload.usage);
        }
      } catch {
        /* ignore malformed SSE lines */
      }
    }
  }
}

export interface LinkHistoryEntry {
  id: string;
  url: string;
  title: string;
  question: string;
  summary: string;
  response: string;
  readAt: string;
  readBy: string;
  github: GitHubMeta | null;
}

export async function fetchProjectLinkHistory(
  projectId: string
): Promise<{ links: LinkHistoryEntry[]; usage: LinkReadUsage }> {
  const headers = await getAuthHeadersAsync();
  const res = await fetch(`${getApiOrigin()}/api/projects/${projectId}/links`, { headers });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Could not load link history');
  }
  return data.data;
}
