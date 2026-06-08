'use client';

import { ExploreView } from '@/components/ExploreView';
import { useAuth } from '@/lib/hooks/useAuth';

export default function ExplorePage() {
  const auth = useAuth();

  return (
    <ExploreView
      embedded={false}
      userContact={auth.user?.contact}
    />
  );
}
