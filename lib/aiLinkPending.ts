const PENDING_KEY = 'makebig_pending_ai_link';

export interface PendingAILink {
  url: string;
  question?: string;
  projectId?: string;
  mode?: 'competitor';
}

export const AI_LINK_EVENT = 'makebig:ai-link';

export function queueAILink(payload: PendingAILink) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent(AI_LINK_EVENT, { detail: payload }));
}

export function consumePendingAILink(): PendingAILink | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PENDING_KEY);
  try {
    return JSON.parse(raw) as PendingAILink;
  } catch {
    return null;
  }
}

export function peekPendingAILink(): PendingAILink | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingAILink;
  } catch {
    return null;
  }
}
