'use client';

import { ExploreView } from '@/components/ExploreView';
import { BrowseProject } from '@/lib/api';

interface ExploreTabProps {
  onJoinProject?: (project: BrowseProject) => void;
}

export function ExploreTab({ onJoinProject }: ExploreTabProps) {
  return <ExploreView embedded onJoinProject={onJoinProject} />;
}
