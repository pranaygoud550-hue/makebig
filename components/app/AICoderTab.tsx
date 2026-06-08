'use client';

import { ProjectAIPanel } from '@/components/dashboard/ProjectAIPanel';
import { ProjectData, User } from '@/lib/types';
import { buildAdvisorProject, isAdvisorProject } from '@/lib/advisorProject';
import { hasActiveWorkspace, hasProjectId } from '@/lib/projectWorkspace';

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
}: AICoderTabProps) {
  const useAdvisor = !hasActiveWorkspace(currentProject) || !hasProjectId(currentProject);
  const project = useAdvisor ? buildAdvisorProject(user) : currentProject!;
  const ownerContact = useAdvisor
    ? user.contact
    : currentProject?.ownerContact ||
      (currentProject?.mode === 'create' ? user.contact : undefined);

  return (
    <div className="space-y-4">
      {useAdvisor && (
        <div className="rounded-xl border border-[#0A66C2]/25 bg-[#EEF3FB] px-4 py-3 text-sm text-[#1d2226]">
          <p className="font-semibold text-[#0A66C2]">AI Assistant — no project required</p>
          <p className="text-[#666] mt-1">
            Chat about ideas, validation, and next steps before you join or create a team project.
            {hasActiveWorkspace(currentProject) && !hasProjectId(currentProject) && (
              <>
                {' '}
                <button
                  type="button"
                  onClick={onOpenDashboard}
                  className="text-[#0A66C2] font-semibold hover:underline"
                >
                  Finish setting up your project →
                </button>
              </>
            )}
          </p>
        </div>
      )}

      <ProjectAIPanel
        project={project}
        user={user}
        ownerContact={ownerContact}
        advisorMode={isAdvisorProject(project)}
      />
    </div>
  );
}
