'use client';

import { AICofounder } from '@/components/AICofounder';
import { ProjectWorkspaceGate } from '@/components/app/ProjectWorkspaceGate';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { ProjectData, User } from '@/lib/types';
import {
  canUseAICofounder,
  isProjectOwner,
  workspaceLabel,
} from '@/lib/projectWorkspace';
import Link from 'next/link';

interface AICoderTabProps {
  user: User;
  currentProject: ProjectData | null;
  onOpenDashboard: () => void;
  onProjectSynced: (project: ProjectData) => void;
}

export function AICoderTab({
  user,
  currentProject,
  onOpenDashboard,
  onProjectSynced,
}: AICoderTabProps) {
  const owner = isProjectOwner(currentProject, user.contact);
  const ownerContact =
    currentProject?.ownerContact ||
    (owner ? user.contact : undefined);
  const { isPro } = useSubscription(ownerContact);

  return (
    <ProjectWorkspaceGate
      currentProject={currentProject}
      userContact={user.contact}
      onOpenDashboard={onOpenDashboard}
      onProjectSynced={onProjectSynced}
      noProject={{
        icon: '🤖',
        title: 'AI Co-founder',
        description: 'Create or join a project first, then get task ideas, pitch drafts, and health checks.',
      }}
      needsSync={{
        icon: '🤖',
        title: `AI for ${workspaceLabel(currentProject)}`,
        description:
          'Link your project online to use AI on your real project data (tasks, team, timeline).',
      }}
    >
      {currentProject && !canUseAICofounder(currentProject) ? (
        <div className="bg-white rounded-2xl border border-[#e0e0e0] p-8 text-center space-y-3">
          <p className="text-2xl">🤝</p>
          <p className="font-semibold text-[#1d2226]">
            {currentProject.mode === 'join'
              ? 'Pick a project to join'
              : `Set up ${workspaceLabel(currentProject)}`}
          </p>
          <p className="text-sm text-[#666] max-w-sm mx-auto">
            {currentProject.mode === 'join'
              ? 'Finish joining a project from Explore, or create your own to unlock AI.'
              : 'Publish and link your project online, then AI can use your real tasks and team data.'}
          </p>
          <button
            type="button"
            onClick={onOpenDashboard}
            className="px-5 py-2.5 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#004182]"
          >
            {currentProject.mode === 'join' ? 'Go to Explore' : 'Open team dashboard'}
          </button>
        </div>
      ) : currentProject ? (
        <div className="space-y-3">
          <header>
            <h1 className="text-xl font-bold text-[#1d2226]">AI Co-founder</h1>
            <p className="text-sm text-[#666] mt-0.5">
              {owner ? (
                <>
                  For <strong>{workspaceLabel(currentProject)}</strong> — tasks, pitch, health check.
                </>
              ) : (
                <>
                  Helping with <strong>{workspaceLabel(currentProject)}</strong> — ask about tasks,
                  ideas, and what to build next.{' '}
                  <button
                    type="button"
                    onClick={onOpenDashboard}
                    className="text-[#0A66C2] font-semibold hover:underline"
                  >
                    Open team dashboard
                  </button>
                </>
              )}
            </p>
          </header>
          {!isPro && owner && (
            <div className="bg-[#EEF3FB] border border-[#0A66C2]/20 rounded-xl px-4 py-3 text-sm text-[#1d2226]">
              <strong>Free plan</strong> — 10 AI link reads per project per day.{' '}
              <Link href="/pricing" className="text-[#0A66C2] font-semibold hover:underline">
                Upgrade to Pro
              </Link>{' '}
              for unlimited link reads, unlimited projects, and priority matching.
            </div>
          )}
          <div className="min-h-[60vh] flex flex-col bg-white rounded-2xl border border-[#e0e0e0] overflow-hidden">
            <AICofounder
              project={currentProject}
              user={user}
              ownerContact={ownerContact}
            />
          </div>
        </div>
      ) : null}
    </ProjectWorkspaceGate>
  );
}
