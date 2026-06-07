'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AgentRunRecord, AgentType } from '@/lib/agentTypes';
import { AGENT_QUICK_GOALS } from '@/lib/agentTypes';
import { fetchAgentRuns, undoAgentRunApi } from '@/lib/agentApi';
import { timeAgo } from '@/lib/linkReaderUtils';

interface AgentHistoryViewProps {
  projectId: string;
  onRerun: (agentType: AgentType, goal: string) => void;
  refreshKey?: number;
}

export function AgentHistoryView({ projectId, onRerun, refreshKey = 0 }: AgentHistoryViewProps) {
  const [runs, setRuns] = useState<AgentRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [undoing, setUndoing] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await fetchAgentRuns(projectId);
      setRuns(data);
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const handleUndo = async (run: AgentRunRecord) => {
    if (
      !window.confirm(
        'Undo this agent run? This will revert description, roles, tasks, milestones, and builds created by that run.'
      )
    ) {
      return;
    }
    setUndoing(run.id);
    try {
      await undoAgentRunApi(projectId, run.id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Undo failed');
    } finally {
      setUndoing(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-[#666] py-8 text-center">Loading agent history…</p>;
  }

  if (!runs.length) {
    return (
      <div className="py-12 text-center px-4">
        <p className="text-3xl mb-2">🤖</p>
        <p className="font-semibold text-[#1d2226]">No agent runs yet</p>
        <p className="text-sm text-[#666] mt-1">
          Run an agent from AI Co-founder or the quick buttons below.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {runs.map((run) => (
        <div
          key={run.id}
          className="bg-white border border-[#e0e0e0] rounded-xl p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase text-[#0A66C2]">{run.agentType}</p>
              <p className="font-semibold text-[#1d2226] truncate">{run.goal}</p>
              {run.summary && (
                <p className="text-xs text-[#666] mt-1">{run.summary}</p>
              )}
              <p className="text-[10px] text-[#999] mt-1">
                {run.steps?.length || run.actionsCount} steps · {timeAgo(run.createdAt)}
              </p>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                run.status === 'complete'
                  ? 'bg-green-50 text-green-700'
                  : run.status === 'running'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-[#f3f2ef] text-[#666]'
              }`}
            >
              {run.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={() =>
                onRerun(run.agentType, run.goal || AGENT_QUICK_GOALS[run.agentType])
              }
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-[#0A66C2]/30 text-[#0A66C2] hover:bg-[#EEF3FB]"
            >
              Re-run
            </button>
            {run.canUndo && (
              <button
                type="button"
                disabled={undoing === run.id}
                onClick={() => void handleUndo(run)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                {undoing === run.id ? 'Undoing…' : 'Undo'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
