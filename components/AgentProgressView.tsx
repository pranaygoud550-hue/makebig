'use client';

import type { AgentStepEvent, AgentType } from '@/lib/agentTypes';
import { AGENT_STEP_LABELS, AGENT_TOTAL_STEPS } from '@/lib/agentTypes';

export interface AgentProgressStep {
  step: number;
  action: string;
  status: 'pending' | 'running' | 'done';
  summary?: string;
  progress?: { current: number; total: number };
}

interface AgentProgressViewProps {
  goal: string;
  agentType: AgentType;
  steps: AgentProgressStep[];
  onStop: () => void;
}

function stepLabel(agentType: AgentType, step: number, action: string) {
  return AGENT_STEP_LABELS[agentType][step] || action.replace(/_/g, ' ');
}

export function AgentProgressView({
  goal,
  agentType,
  steps,
  onStop,
}: AgentProgressViewProps) {
  const total = AGENT_TOTAL_STEPS[agentType];
  const doneCount = steps.filter((s) => s.status === 'done').length;

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#161b22] border-b border-[#30363d] px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-[#e6edf3]">🤖 Agent running…</p>
            <p className="text-xs text-[#8b949e] mt-0.5 truncate max-w-[280px]">Goal: {goal}</p>
          </div>
          <button
            type="button"
            onClick={onStop}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 hover:bg-red-500/10"
          >
            Stop
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {Array.from({ length: total }, (_, i) => {
            const stepNum = i + 1;
            const recorded =
              steps.find((s) => s.step === stepNum) ||
              steps.find((s) => s.action && stepNum === s.step);
            const status = recorded?.status || (stepNum <= doneCount ? 'done' : 'pending');
            const isRunning = status === 'running';
            const isDone = status === 'done';

            return (
              <div key={stepNum} className="flex gap-3">
                <span className="text-lg shrink-0 w-6">
                  {isDone ? '✅' : isRunning ? '⏳' : '○'}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold ${
                      isDone
                        ? 'text-[#e6edf3]'
                        : isRunning
                          ? 'text-[#58a6ff]'
                          : 'text-[#6e7681]'
                    }`}
                  >
                    {stepLabel(agentType, stepNum, recorded?.action || '')}
                  </p>
                  {recorded?.summary && isDone && (
                    <p className="text-xs text-[#8b949e] mt-0.5 truncate">{recorded.summary}</p>
                  )}
                  {isRunning && recorded?.progress && (
                    <div className="mt-2">
                      <p className="text-[10px] text-[#8b949e] mb-1">
                        Creating task {recorded.progress.current}/{recorded.progress.total}
                      </p>
                      <div className="h-1.5 bg-[#21262d] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#58a6ff] transition-all duration-300"
                          style={{
                            width: `${Math.round(
                              (recorded.progress.current / recorded.progress.total) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {isRunning && !recorded?.progress && (
                    <div className="mt-2 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
                      <div className="h-full w-1/3 bg-[#58a6ff] animate-pulse rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[#30363d] px-5 py-3 text-center text-xs text-[#8b949e]">
          {doneCount} of {total} steps complete
        </div>
      </div>
    </div>
  );
}

export function mergeAgentStep(
  prev: AgentProgressStep[],
  event: AgentStepEvent
): AgentProgressStep[] {
  const next = [...prev];
  const idx = next.findIndex((s) => s.step === event.step && s.action === event.action);
  const entry: AgentProgressStep = {
    step: event.step,
    action: event.action,
    status: event.status === 'done' ? 'done' : 'running',
    summary: summarizeStep(event),
    progress:
      event.action === 'tasks_progress' && event.data
        ? {
            current: Number(event.data.current) || 0,
            total: Number(event.data.total) || 8,
          }
        : undefined,
  };

  if (event.action === 'tasks_progress' && event.step === 0) {
    const taskStep = next.findIndex((s) => s.step === 4);
    if (taskStep >= 0) {
      next[taskStep] = { ...next[taskStep], status: 'running', progress: entry.progress };
    } else {
      next.push({ step: 4, action: 'tasks_created', status: 'running', progress: entry.progress });
    }
    return next;
  }

  if (idx >= 0) next[idx] = { ...next[idx], ...entry };
  else next.push(entry);
  return next.sort((a, b) => a.step - b.step);
}

function summarizeStep(event: AgentStepEvent): string | undefined {
  const d = event.data || {};
  if (event.action === 'reading_project' && d.projectName) {
    return `${d.projectName}${d.city ? ` · ${d.city}` : ''}`;
  }
  if (event.action === 'description_written' && d.description) {
    return String(d.description).slice(0, 80);
  }
  if (event.action === 'roles_created' && Array.isArray(d.roles)) {
    return (d.roles as string[]).slice(0, 3).join(' · ');
  }
  if (event.action === 'tasks_created' && d.count) {
    return `${d.count} tasks created`;
  }
  if (event.action === 'journey_set' && d.stage) {
    return `Stage: ${d.stage}`;
  }
  if (event.action === 'pitch_written' && d.pitch) {
    return String(d.pitch).slice(0, 80);
  }
  if (event.action === 'health_updated' && d.score != null) {
    return `Score: ${d.score}/100`;
  }
  return undefined;
}
