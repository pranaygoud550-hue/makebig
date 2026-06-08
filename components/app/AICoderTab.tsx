'use client';

import { ProjectWorkspaceGate } from '@/components/app/ProjectWorkspaceGate';
import { ProjectAIPanel } from '@/components/dashboard/ProjectAIPanel';
import { ProjectData, User } from '@/lib/types';
import { canUseAICofounder, workspaceLabel } from '@/lib/projectWorkspace';

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
    currentProject?.ownerContact ||
    (currentProject?.mode === 'create' ? user.contact : undefined);

  return (
    <ProjectWorkspaceGate
      currentProject={currentProject}
      userContact={user.contact}
      onOpenDashboard={onOpenDashboard}
      onProjectSynced={onProjectSynced}
      noProject={{
        icon: '🤖',
        title: 'AI Workspace',
        description: 'Create or join a project first, then chat with the Assistant or run an Agent.',
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
        <ProjectAIPanel project={currentProject} user={user} ownerContact={ownerContact} />
      ) : null}
    </ProjectWorkspaceGate>
  );
}
