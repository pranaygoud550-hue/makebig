'use client';

import { ExploreView } from '@/components/ExploreView';
import { BrowseProject } from '@/lib/api';
import type { DashboardNavTab } from '@/components/DashboardNew';

interface ExploreTabProps {
  userContact?: string;
  onJoinProject?: (project: BrowseProject) => void;
  onOpenDashboard?: (section?: DashboardNavTab) => void;
}

export function ExploreTab({ userContact, onJoinProject, onOpenDashboard }: ExploreTabProps) {
  return (
    <ExploreView
      embedded
      userContact={userContact}
      onJoinProject={onJoinProject}
      onOpenDashboard={onOpenDashboard}
    />
  );
}
