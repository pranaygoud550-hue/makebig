'use client';

import { useEffect, useState } from 'react';
import { ProjectData, User } from '@/lib/types';
import { AICofounder } from '@/components/AICofounder';
import { AgentPanel } from '@/components/AgentPanel';
import { AgentHistoryView } from '@/components/AgentHistoryView';
import { queueAgentRun } from '@/lib/agentPending';
import type { AgentType } from '@/lib/agentTypes';
import {
  getProjectAIMode,
  setProjectAIMode,
  subscribeProjectAIMode,
  type ProjectAIMode,
} from '@/lib/projectAIMode';
import { useToast } from '@/lib/context/ToastContext';

interface ProjectAIPanelProps {
  project: ProjectData;
  user: User;
  ownerContact?: string;
  agentHistoryRefresh?: number;
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: ProjectAIMode;
  onChange: (mode: ProjectAIMode) => void;
}) {
  return (
    <div
      className="inline-flex p-1 rounded-xl bg-[#21262d] border border-[#30363d]"
      role="tablist"
      aria-label="AI mode"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'assistant'}
        onClick={() => onChange('assistant')}
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
          mode === 'assistant'
            ? 'bg-[#58a6ff] text-[#0d1117] shadow-sm'
            : 'text-[#8b949e] hover:text-[#e6edf3]'
        }`}
      >
        💬 Assistant
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'agent'}
        onClick={() => onChange('agent')}
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
          mode === 'agent'
            ? 'bg-[#238636] text-white shadow-sm'
            : 'text-[#8b949e] hover:text-[#e6edf3]'
        }`}
      >
        🤖 Agent
      </button>
    </div>
  );
}

export function ProjectAIPanel({
  project,
  user,
  ownerContact,
  agentHistoryRefresh = 0,
}: ProjectAIPanelProps) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<ProjectAIMode>('assistant');

  useEffect(() => {
    if (!project.id) return;
    setMode(getProjectAIMode(project.id));
    return subscribeProjectAIMode(project.id, setMode);
  }, [project.id]);

  const switchMode = (next: ProjectAIMode) => {
    setMode(next);
    if (project.id) setProjectAIMode(project.id, next);
  };

  if (!project.id) {
    return (
      <div className="bg-white rounded-xl border border-[#e0e0e0] p-8 text-center text-sm text-[#666]">
        Save your project first to use AI Assistant & Agent.
      </div>
    );
  }

  return (
    <div id="ai-assistant" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-xl border border-[#e0e0e0] px-5 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#0A66C2]">AI workspace</p>
          <h2 className="text-lg font-bold text-[#1d2226] mt-0.5">
            {mode === 'assistant' ? 'AI Assistant' : 'AI Agent'} · {project.name}
          </h2>
          <p className="text-xs text-[#666] mt-1 max-w-lg">
            {mode === 'assistant'
              ? 'Chat, analyze links, and get advice tailored to your project.'
              : 'Automated runs that set up tasks, roles, milestones, and builds for you.'}
          </p>
        </div>
        <ModeToggle mode={mode} onChange={switchMode} />
      </div>

      {mode === 'assistant' ? (
        <div className="min-h-[62vh] flex flex-col bg-[#0d1117] rounded-2xl border border-[#30363d] overflow-hidden">
          <AICofounder
            project={project}
            user={user}
            ownerContact={ownerContact}
            hideAgentTab
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="min-h-[50vh] flex flex-col bg-[#0d1117] rounded-2xl border border-[#30363d] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#30363d] bg-[#161b22]">
              <p className="text-sm font-bold text-[#e6edf3]">Run an agent</p>
              <p className="text-xs text-[#8b949e] mt-0.5">
                Pick a goal — the agent updates your project automatically.
              </p>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <AgentPanel
                projectId={project.id}
                projectName={project.name}
                userId={user.id}
                userName={user.name}
                userContact={user.contact}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e0e0e0] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-base font-bold text-[#1d2226]">Agent history</h3>
              <button
                type="button"
                onClick={() => switchMode('assistant')}
                className="text-xs font-semibold text-[#0A66C2] hover:underline"
              >
                Switch to Assistant →
              </button>
            </div>
            <AgentHistoryView
              projectId={project.id}
              refreshKey={agentHistoryRefresh}
              onRerun={(type: AgentType, goal: string) => {
                queueAgentRun({ projectId: project.id!, agentType: type, goal });
                showToast('Agent started — watch progress above', 'info');
              }}
            />
          </div>
        </div>
      )}

      {mode === 'assistant' && (
        <p className="text-center text-xs text-[#666]">
          Need automated setup?{' '}
          <button
            type="button"
            onClick={() => switchMode('agent')}
            className="font-semibold text-[#0A66C2] hover:underline"
          >
            Switch to Agent mode
          </button>
        </p>
      )}
    </div>
  );
}
