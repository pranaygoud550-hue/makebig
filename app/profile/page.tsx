'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { ProfessionalProfile } from '@/components/app/ProfessionalProfile';

export default function ProfilePage() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      router.replace('/');
    }
  }, [auth.isLoading, auth.user, router]);

  if (auth.isLoading || !auth.user) {
    return (
      <div className="min-h-screen bg-[#f3f2ef] flex items-center justify-center">
        <p className="text-sm text-[#666]">Loading profile…</p>
      </div>
    );
  }

  return (
    <ProfessionalProfile
      user={auth.user}
      isOwnProfile
      variant="page"
      onSaved={() => auth.refreshProfile()}
    />
  );
}
