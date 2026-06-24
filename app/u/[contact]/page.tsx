'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProfessionalProfile } from '@/components/app/ProfessionalProfile';
import { apiGetPublicProfile } from '@/lib/api';
import { User } from '@/lib/types';
import { ProfileSkeleton } from '@/components/ui/Skeleton';
import { usePageTitle } from '@/lib/hooks/usePageTitle';

export default function PublicUserProfilePage({ params }: { params: { contact: string } }) {
  const contact = decodeURIComponent(params.contact);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    apiGetPublicProfile(contact).then((data) => {
      if (data?.user) {
        setUser({
          ...data.user,
          isLoggedIn: false,
          skills: data.user.skills || data.profile?.skills || [],
          plan: (data.user.plan === 'pro' ? 'pro' : 'free') as User['plan'],
        });
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
  }, [contact]);

  usePageTitle(user?.name ? user.name : 'Profile');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f2ef] dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <div className="min-h-screen bg-[#f3f2ef] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-[#666]">Profile not found.</p>
        <Link href="/" className="text-[#0A66C2] font-semibold hover:underline">
          ← Back to Make Big
        </Link>
      </div>
    );
  }

  return <ProfessionalProfile user={user} isOwnProfile={false} variant="page" />;
}
