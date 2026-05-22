'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProfessionalProfile } from '@/components/app/ProfessionalProfile';
import { apiGetUser } from '@/lib/api';
import { User } from '@/lib/types';

export default function PublicUserProfilePage({ params }: { params: { contact: string } }) {
  const contact = decodeURIComponent(params.contact);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    apiGetUser(contact).then((u) => {
      if (u) {
        setUser({ ...u, isLoggedIn: false });
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
  }, [contact]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f2ef] flex items-center justify-center">
        <p className="text-sm text-[#666]">Loading profile…</p>
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
