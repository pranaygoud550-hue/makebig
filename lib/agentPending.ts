const PENDING_KEY = 'makebig_pending_agent';

export interface PendingAgentRun {
  projectId: string;
  agentType: 'setup' | 'build' | 'plan' | 'analyze';
  goal: string;
}

export const AGENT_RUN_EVENT = 'makebig:run-agent';

export function queueAgentRun(payload: PendingAgentRun) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent(AGENT_RUN_EVENT, { detail: payload }));
}

export function consumePendingAgentRun(): PendingAgentRun | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PENDING_KEY);
  try {
    return JSON.parse(raw) as PendingAgentRun;
  } catch {
    return null;
  }
}
