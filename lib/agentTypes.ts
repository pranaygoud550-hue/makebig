export type AgentType = 'setup' | 'build' | 'plan' | 'analyze';

export interface AgentStepEvent {
  runId?: string;
  step: number;
  action: string;
  status: 'running' | 'done' | 'pending';
  data?: Record<string, unknown>;
}

export interface AgentCompleteEvent {
  runId: string;
  summary: string;
  actionsCount?: number;
  agentType?: AgentType;
  failed?: boolean;
  cancelled?: boolean;
  buildId?: string;
  health?: number;
}

export interface AgentRunRecord {
  id: string;
  goal: string;
  agentType: AgentType;
  status: string;
  summary: string;
  actionsCount: number;
  steps: Array<{
    step: number;
    action: string;
    status: string;
    summary?: string;
    data?: Record<string, unknown>;
    completedAt?: string;
  }>;
  runBy: string;
  createdAt: string;
  completedAt?: string;
  canUndo: boolean;
}

export const AGENT_STEP_LABELS: Record<AgentType, Record<number, string>> = {
  setup: {
    1: 'Read project details',
    2: 'Wrote project description',
    3: 'Created team roles',
    4: 'Creating tasks',
    5: 'Setting journey stage',
    6: 'Writing your pitch',
    7: 'Final summary',
  },
  plan: {
    1: 'Read current state',
    2: 'Analyze gaps',
    3: 'Generate sprint plan',
    4: 'Set milestones',
    5: 'Notify team',
  },
  build: {
    1: 'Read project context',
    2: 'Generate landing page code',
    3: 'Save build',
    4: 'Build complete',
  },
  analyze: {
    1: 'Read all project data',
    2: 'Calculate health breakdown',
    3: 'Generate recommendations',
    4: 'Update health score',
  },
};

export const AGENT_TOTAL_STEPS: Record<AgentType, number> = {
  setup: 7,
  plan: 5,
  build: 4,
  analyze: 4,
};

export const AGENT_QUICK_GOALS: Record<AgentType, string> = {
  setup: 'Set up our startup project',
  plan: 'Plan our next 2 weeks',
  build: 'Build a landing page',
  analyze: 'Analyze our startup health',
};
