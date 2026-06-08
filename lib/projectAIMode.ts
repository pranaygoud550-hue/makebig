export type ProjectAIMode = 'assistant' | 'agent';

const EVENT = 'makebig:ai-mode';

function storageKey(projectId: string) {
  return `makebig_ai_mode_${projectId}`;
}

export function getProjectAIMode(projectId: string): ProjectAIMode {
  if (typeof window === 'undefined') return 'assistant';
  return sessionStorage.getItem(storageKey(projectId)) === 'agent' ? 'agent' : 'assistant';
}

export function setProjectAIMode(projectId: string, mode: ProjectAIMode) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(storageKey(projectId), mode);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { projectId, mode } }));
}

export function subscribeProjectAIMode(
  projectId: string,
  handler: (mode: ProjectAIMode) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const onEvent = (e: Event) => {
    const detail = (e as CustomEvent<{ projectId: string; mode: ProjectAIMode }>).detail;
    if (detail?.projectId === projectId) handler(detail.mode);
  };
  window.addEventListener(EVENT, onEvent);
  return () => window.removeEventListener(EVENT, onEvent);
}
