'use client';

import { CoursesView } from '@/components/CoursesView';

interface CoursesTabProps {
  userContact?: string;
  onStartProject?: (categoryId: string, skills?: string[]) => void;
  onExploreCategory?: (categoryId: string) => void;
}

export function CoursesTab(props: CoursesTabProps) {
  return <CoursesView {...props} />;
}
