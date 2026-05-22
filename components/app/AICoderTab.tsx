'use client';

import { AICofounder } from '@/components/AICofounder';
import { ProjectWorkspaceGate } from '@/components/app/ProjectWorkspaceGate';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { ProjectData, User } from '@/lib/types';
import { workspaceLabel } from '@/lib/projectWorkspace';
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
  const ownerContact =
    currentProject?.mode === 'create' ? user.contact : undefined;
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
        description: 'Create a project first, then get task ideas, pitch drafts, and health checks.',
      }}
      needsSync={{
        icon: '🤖',
        title: `AI for ${workspaceLabel(currentProject)}`,
        description:
          'Link your project online to use AI on your real project data (tasks, team, timeline).',
      }}
    >
      {currentProject!.mode !== 'create' ? (
        <div className="bg-white rounded-2xl border border-[#e0e0e0] p-8 text-center space-y-3">
          <p className="text-2xl">🤝</p>
          <p className="font-semibold text-[#1d2226]">You joined {workspaceLabel(currentProject)}</p>
          <p className="text-sm text-[#666] max-w-sm mx-auto">
            AI Co-founder helps <strong>project owners</strong> plan and ship. Open the dashboard for
            team chat, tasks, and your project feed.
          </p>
          <button
            type="button"
            onClick={onOpenDashboard}
            className="px-5 py-2.5 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#004182]"
          >
            Open team dashboard
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <header>
            <h1 className="text-xl font-bold text-[#1d2226]">AI Co-founder</h1>
            <p className="text-sm text-[#666] mt-0.5">
              For <strong>{workspaceLabel(currentProject)}</strong> — tasks, pitch, health check.
            </p>
          </header>
          {!isPro && (
            <div className="bg-[#EEF3FB] border border-[#0A66C2]/20 rounded-xl px-4 py-3 text-sm text-[#1d2226]">
              <strong>Demo mode</strong> — works now with sample-quality answers.{' '}
              <Link href="/pricing" className="text-[#0A66C2] font-semibold hover:underline">
                Pro
              </Link>{' '}
              unlocks live AI when Groq is configured.
            </div>
          )}
          <div className="min-h-[60vh] flex flex-col bg-white rounded-2xl border border-[#e0e0e0] overflow-hidden">
            <AICofounder
              project={currentProject!}
              user={user}
              ownerContact={user.contact}
            />
          </div>
        </div>
      )}
    </ProjectWorkspaceGate>
  );
}
