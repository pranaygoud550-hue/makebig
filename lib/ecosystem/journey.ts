import { JOURNEY_STAGES, type JourneyStageId } from '@/lib/ecosystem/constants';

export type { JourneyStageId };

export const DEMO_NEXT_MILESTONE = 'Complete problem research';

export interface JourneyState {
  currentStage: JourneyStageId;
  completionPercent: number;
  configured?: boolean;
  nextMilestone?: string;
  lastUpdated?: string;
  stageNotes: Array<{
    stage: JourneyStageId;
    note: string;
    screenshotUrl?: string;
    createdAt: string;
    createdBy?: string;
  }>;
}

export function stageIndex(stage: JourneyStageId): number {
  return JOURNEY_STAGES.findIndex((s) => s.id === stage);
}

/** True only after the founder has saved journey progress (not schema defaults). */
export function isJourneyConfigured(
  journey: Partial<JourneyState> | null | undefined
): boolean {
  if (!journey) return false;
  if (journey.configured === true) return true;
  if ((journey.stageNotes?.length || 0) > 0) return true;
  if ((journey.completionPercent || 0) > 0) return true;
  if (journey.currentStage && journey.currentStage !== 'idea') return true;
  if (
    journey.nextMilestone?.trim() &&
    journey.nextMilestone !== DEMO_NEXT_MILESTONE
  ) {
    return true;
  }
  return false;
}

export function sanitizeJourneyForApi(
  journey: Partial<JourneyState> | null | undefined
): { journey: Partial<JourneyState> | null; configured: boolean } {
  const configured = isJourneyConfigured(journey);
  if (!configured) {
    return {
      configured: false,
      journey: {
        currentStage: 'idea',
        completionPercent: 0,
        stageNotes: [],
      },
    };
  }

  const nextMilestone =
    journey?.nextMilestone === DEMO_NEXT_MILESTONE ? undefined : journey?.nextMilestone;

  return {
    configured: true,
    journey: {
      currentStage: (journey?.currentStage || 'idea') as JourneyStageId,
      completionPercent: journey?.completionPercent ?? 0,
      nextMilestone,
      lastUpdated: journey?.lastUpdated,
      stageNotes: journey?.stageNotes || [],
    },
  };
}

export function journeyTimeline(currentStage: JourneyStageId) {
  const currentIdx = stageIndex(currentStage);
  return JOURNEY_STAGES.map((s, i) => ({
    ...s,
    status: i < currentIdx ? 'completed' : i === currentIdx ? 'current' : 'future',
  }));
}
