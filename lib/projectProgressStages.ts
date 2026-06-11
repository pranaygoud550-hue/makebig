/** Public 5-step progress timeline for project pages */
export const PUBLIC_PROGRESS_STAGES = [
  { id: 'idea', label: 'Idea', icon: '💡' },
  { id: 'validated', label: 'Validated', icon: '✅' },
  { id: 'mvp', label: 'MVP', icon: '🛠' },
  { id: 'testing', label: 'Testing', icon: '🧪' },
  { id: 'launched', label: 'Launched', icon: '🚀' },
] as const;

export type PublicProgressStageId = (typeof PUBLIC_PROGRESS_STAGES)[number]['id'];

const JOURNEY_TO_PUBLIC: Record<string, PublicProgressStageId> = {
  idea: 'idea',
  research: 'validated',
  prototype: 'validated',
  mvp: 'mvp',
  beta: 'testing',
  launch: 'launched',
  revenue: 'launched',
  scaling: 'launched',
};

export function resolvePublicProgressStage(
  journeyStage?: string | null,
  fallback?: string
): PublicProgressStageId {
  const key = String(journeyStage || fallback || 'idea').toLowerCase();
  return JOURNEY_TO_PUBLIC[key] || 'idea';
}

export function publicStageIndex(stageId: PublicProgressStageId): number {
  return PUBLIC_PROGRESS_STAGES.findIndex((s) => s.id === stageId);
}
