'use client';

import { useEffect } from 'react';
import { ExploreView } from '@/components/ExploreView';
import { BrowseProject } from '@/lib/api';
import type { DashboardNavTab } from '@/components/DashboardNew';
import { markOnboardingBrowse } from '@/components/app/OnboardingChecklist';

interface ExploreTabProps {
  userContact?: string;
  onJoinProject?: (project: BrowseProject) => void;
  onOpenDashboard?: (section?: DashboardNavTab) => void;
}

export function ExploreTab({ userContact, onJoinProject, onOpenDashboard }: ExploreTabProps) {
  useEffect(() => {
    if (userContact) markOnboardingBrowse(userContact);
  }, [userContact]);

  return (
    <ExploreView
      embedded
      userContact={userContact}
      onJoinProject={onJoinProject}
      onOpenDashboard={onOpenDashboard}
    />
  );
}
