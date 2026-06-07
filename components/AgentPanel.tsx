'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AgentCompleteEvent, AgentStepEvent, AgentType } from '@/lib/agentTypes';
import { AGENT_QUICK_GOALS } from '@/lib/agentTypes';
import { startAgentRun, cancelAgentRunApi, fetchLatestBuild } from '@/lib/agentApi';
import { useAgentSocket } from '@/lib/useAgentSocket';
import { AgentProgressView, mergeAgentStep, type AgentProgressStep } from '@/components/AgentProgressView';
import { useToast } from '@/lib/context/ToastContext';
import { consumePendingAgentRun, AGENT_RUN_EVENT, type PendingAgentRun } from '@/lib/agentPending';

interface AgentPanelProps {
  projectId: string;
  projectName: string;
  userId?: string;
  userName?: string;
  userContact?: string;
  onComplete?: () => void;
}

const QUICK_AGENTS: { type: AgentType; label: string; icon: string }[] = [
  { type: 'setup', label: 'Set up my project', icon: '⚡' },
  { type: 'plan', label: 'Plan next 2 weeks', icon: '📋' },
  { type: 'build', label: 'Build something', icon: '🏗️' },
  { type: 'analyze', label: 'Analyze my startup', icon: '🔍' },
];

export function AgentPanel({
  projectId,
  projectName,
  userId,
  userName,
  userContact,
  onComplete,
}: AgentPanelProps) {
  const [customGoal, setCustomGoal] = useState('');
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [goal, setGoal] = useState('');
  const [agentType, setAgentType] = useState<AgentType>('setup');
  const [steps, setSteps] = useState<AgentProgressStep[]>([]);
  const { showToast } = useToast();

  const handleStep = useCallback((event: AgentStepEvent) => {
    if (runId && event.runId && event.runId !== runId) return;
    setSteps((prev) => mergeAgentStep(prev, event));
  }, [runId]);

  const handleComplete = useCallback(
    (event: AgentCompleteEvent) => {
      if (runId && event.runId !== runId) return;
      setRunning(false);
      setRunId(null);
      if (event.cancelled) {
        showToast('Agent stopped', 'info');
      } else if (event.failed) {
        showToast(event.summary || 'Agent failed', 'error');
      } else {
        showToast(`🤖 Agent done! ${event.summary}`, 'success');
      }
      onComplete?.();
    },
    [runId, showToast, onComplete]
  );

  useAgentSocket({
    projectId,
    userId,
    userName,
    userContact,
    enabled: Boolean(projectId),
    onStep: handleStep,
    onComplete: handleComplete,
  });

  const runAgent = useCallback(
    async (type: AgentType, goalText: string) => {
      if (!projectId || running) return;
      const g =
        goalText.trim() ||
        AGENT_QUICK_GOALS[type].replace('our startup', projectName);
      setGoal(g);
      setAgentType(type);
      setSteps([]);
      setRunning(true);
      try {
        const result = await startAgentRun(projectId, type, g);
        setRunId(result.runId);
      } catch (e) {
        setRunning(false);
        showToast(e instanceof Error ? e.message : 'Could not start agent', 'error');
      }
    },
    [projectId, running, projectName, showToast]
  );

  useEffect(() => {
    const pending = consumePendingAgentRun();
    if (pending?.projectId === projectId) {
      void runAgent(pending.agentType, pending.goal);
    }
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<PendingAgentRun>).detail;
      if (detail?.projectId === projectId) {
        void runAgent(detail.agentType, detail.goal);
      }
    };
    window.addEventListener(AGENT_RUN_EVENT, handler);
    return () => window.removeEventListener(AGENT_RUN_EVENT, handler);
  }, [projectId, runAgent]);

  const stopAgent = async () => {
    if (runId) {
      try {
        await cancelAgentRunApi(runId);
      } catch {
        /* socket will fire complete */
      }
    }
    setRunning(false);
  };

  return (
    <>
      {running && (
        <AgentProgressView
          goal={goal}
          agentType={agentType}
          steps={steps}
          onStop={() => void stopAgent()}
        />
      )}

      <div className="p-4 space-y-4">
        <p className="text-sm font-semibold text-[#e6edf3]">🤖 What should the agent do?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QUICK_AGENTS.map((a) => (
            <button
              key={a.type}
              type="button"
              disabled={running}
              onClick={() =>
                void runAgent(a.type, AGENT_QUICK_GOALS[a.type].replace('startup', projectName))
              }
              className="text-left px-4 py-3 rounded-xl border border-[#30363d] bg-[#21262d] hover:border-[#58a6ff]/50 disabled:opacity-40 transition-all"
            >
              <span className="mr-2">{a.icon}</span>
              <span className="text-sm font-semibold text-[#e6edf3]">{a.label}</span>
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs text-[#8b949e]">Or describe a custom goal:</p>
          <textarea
            value={customGoal}
            onChange={(e) => setCustomGoal(e.target.value)}
            placeholder="What do you want to build or do…"
            rows={2}
            disabled={running}
            className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#58a6ff] resize-none"
          />
          <button
            type="button"
            disabled={running || !customGoal.trim()}
            onClick={() => void runAgent('setup', customGoal)}
            className="w-full py-2.5 bg-[#1f6feb] text-white rounded-full text-sm font-bold hover:bg-[#388bfd] disabled:opacity-40"
          >
            Run Agent
          </button>
        </div>
      </div>
    </>
  );
}

export function BuildPanel({ projectId }: { projectId: string }) {
  const [build, setBuild] = useState<{ html: string; css: string; js: string; title: string } | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetchLatestBuild(projectId)
      .then(setBuild)
      .finally(() => setLoading(false));
  }, [projectId]);

  const fullDoc = build
    ? `${build.html}\n<style>${build.css}</style>\n<script>${build.js}<\/script>`
    : '';

  if (loading) {
    return <p className="text-sm text-[#8b949e] p-6 text-center">Loading builds…</p>;
  }

  if (!build) {
    return (
      <div className="p-8 text-center">
        <p className="text-3xl mb-2">🏗️</p>
        <p className="font-semibold text-[#e6edf3]">No builds yet</p>
        <p className="text-sm text-[#8b949e] mt-1">
          Run the Build agent to generate a landing page.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-[#e6edf3]">{build.title}</p>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(fullDoc)}
          className="text-xs font-semibold text-[#58a6ff] hover:underline"
        >
          Copy to clipboard
        </button>
      </div>
      <pre className="text-[10px] text-[#8b949e] bg-[#0d1117] border border-[#30363d] rounded-lg p-3 max-h-64 overflow-auto whitespace-pre-wrap">
        {fullDoc.slice(0, 4000)}
        {fullDoc.length > 4000 ? '…' : ''}
      </pre>
    </div>
  );
}
