import { JOURNEY_STAGES, type JourneyStageId } from '@/lib/ecosystem/constants';

export type { JourneyStageId };

export interface JourneyState {
  currentStage: JourneyStageId;
  completionPercent: number;
  nextMilestone: string;
  lastUpdated: string;
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

export function defaultJourney(): JourneyState {
  return {
    currentStage: 'idea',
    completionPercent: 0,
    nextMilestone: 'Complete problem research',
    lastUpdated: new Date().toISOString(),
    stageNotes: [],
  };
}

export function journeyTimeline(currentStage: JourneyStageId) {
  const currentIdx = stageIndex(currentStage);
  return JOURNEY_STAGES.map((s, i) => ({
    ...s,
    status: i < currentIdx ? 'completed' : i === currentIdx ? 'current' : 'future',
  }));
}
