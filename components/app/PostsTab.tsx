'use client';

import { ProjectFeed } from '@/components/ProjectFeed';
import { ProjectWorkspaceGate } from '@/components/app/ProjectWorkspaceGate';
import { ProjectData } from '@/lib/types';
import { workspaceLabel } from '@/lib/projectWorkspace';

interface PostsTabProps {
  currentProject: ProjectData | null;
  userContact?: string;
  onOpenDashboard: () => void;
  onProjectSynced: (project: ProjectData) => void;
  onBrowseProjects?: () => void;
}

export function PostsTab({
  currentProject,
  userContact,
  onOpenDashboard,
  onProjectSynced,
  onBrowseProjects,
}: PostsTabProps) {
  const isOwner = currentProject?.mode === 'create';
  const canPost = Boolean(userContact && currentProject?.id);

  return (
    <ProjectWorkspaceGate
      currentProject={currentProject}
      userContact={userContact}
      onOpenDashboard={onOpenDashboard}
      onProjectSynced={onProjectSynced}
      noProject={{
        icon: '📝',
        title: 'Share your progress',
        description: 'Join a project to post updates for your team',
        actions: onBrowseProjects
          ? [{ label: 'Browse projects', onClick: onBrowseProjects }]
          : undefined,
      }}
      needsSync={{
        icon: '📝',
        title: `${workspaceLabel(currentProject)} — link to post`,
        description:
          'Your project is saved on this device. Link it to the server to post updates and images for your team.',
      }}
    >
      {currentProject?.id ? (
        <div className="space-y-4">
          <header>
            <h1 className="text-xl font-bold text-[#1d2226]">
              {workspaceLabel(currentProject)} — posts
            </h1>
            <p className="text-sm text-[#666] mt-0.5">
              Share updates and photos with your team. Visible on Home for everyone.
            </p>
          </header>
          <ProjectFeed
            projectId={currentProject.id}
            userContact={userContact}
            isOwner={isOwner}
            canPost={canPost}
          />
        </div>
      ) : null}
    </ProjectWorkspaceGate>
  );
}
