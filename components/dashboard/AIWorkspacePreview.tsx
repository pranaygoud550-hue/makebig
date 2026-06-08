'use client';

import { useMemo } from 'react';
import { ProjectData } from '@/lib/types';
import { buildNextActions } from './nextActions';
import { setProjectAIMode } from '@/lib/projectAIMode';

interface AIWorkspacePreviewProps {
  project: ProjectData;
  tasks: { id: string; title: string; status: string }[];
  teamMemberCount: number;
  githubConnected: boolean;
  onOpenAI: (mode: 'assistant' | 'agent') => void;
  onAddTask: () => void;
  onNavigate: (tab: 'invite' | 'team' | 'feed') => void;
}

export function AIWorkspacePreview({
  project,
  tasks,
  teamMemberCount,
  githubConnected,
  onOpenAI,
  onAddTask,
  onNavigate,
}: AIWorkspacePreviewProps) {
  const actions = useMemo(
    () =>
      buildNextActions(project, tasks, teamMemberCount, githubConnected, {
        onAddTask,
        onOpenAI,
        onNavigate,
      }),
    [project, tasks, teamMemberCount, githubConnected, onAddTask, onOpenAI, onNavigate]
  );

  const top = actions[0];

  const openWorkspace = (mode: 'assistant' | 'agent') => {
    if (project.id) setProjectAIMode(project.id, mode);
    onOpenAI(mode);
  };

  return (
    <section className="rounded-2xl border border-[#0A66C2]/20 bg-gradient-to-br from-[#EEF3FB] to-white p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#0A66C2]">AI workspace</p>
          <h3 className="font-bold text-[#1d2226] mt-1">Assistant & Agent in one place</h3>
          <p className="text-xs text-[#666] mt-1 max-w-md">
            Chat for advice or run an agent to auto-setup your project — switch anytime in the sidebar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => openWorkspace('assistant')}
            className="px-4 py-2 rounded-full text-xs font-bold bg-[#0A66C2] text-white hover:bg-[#004182]"
          >
            💬 Assistant
          </button>
          <button
            type="button"
            onClick={() => openWorkspace('agent')}
            className="px-4 py-2 rounded-full text-xs font-bold border border-[#0A66C2] text-[#0A66C2] hover:bg-[#EEF3FB]"
          >
            🤖 Agent
          </button>
        </div>
      </div>

      {top && (
        <div className="mt-4 rounded-xl border border-[#d9d9d9] bg-white p-4">
          <p className="text-xs font-bold text-[#666] uppercase">Suggested next</p>
          <p className="text-sm font-semibold text-[#1d2226] mt-1">
            {top.icon} {top.title}
          </p>
          <p className="text-xs text-[#666] mt-0.5">{top.detail}</p>
          <button
            type="button"
            onClick={() => {
              if (top.suggestedMode === 'agent') openWorkspace('agent');
              else top.onClick();
            }}
            className="mt-2 text-xs font-semibold text-[#0A66C2] hover:underline"
          >
            {top.suggestedMode === 'agent' ? 'Open Agent →' : top.cta}
          </button>
        </div>
      )}
    </section>
  );
}
