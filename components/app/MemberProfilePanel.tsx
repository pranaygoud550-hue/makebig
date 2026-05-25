'use client';

import { useEffect, useState } from 'react';
import { ProfessionalProfile } from '@/components/app/ProfessionalProfile';
import { apiGetUser } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';
import { User } from '@/lib/types';

interface MemberProfilePanelProps {
  contact: string | null;
  displayName?: string;
  onClose: () => void;
}

export function MemberProfilePanel({
  contact,
  displayName,
  onClose,
}: MemberProfilePanelProps) {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!contact) {
      setUser(null);
      setNotFound(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    apiGetUser(contact).then((loaded) => {
      if (cancelled) return;
      if (loaded) {
        setUser({ ...loaded, isLoggedIn: false });
      } else {
        setUser({
          id: contact,
          name: displayName || contact.split('@')[0] || contact,
          contact,
          isLoggedIn: false,
          skills: [],
        });
        setNotFound(true);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [contact, displayName]);

  if (!contact) return null;

  const isOwnProfile =
    Boolean(auth.user?.contact) &&
    auth.user!.contact.toLowerCase() === contact.toLowerCase();

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-start justify-center overflow-y-auto p-4 md:p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl bg-[#f3f2ef] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 rounded-2xl">
            <p className="text-sm text-[#666]">Loading profile…</p>
          </div>
        )}
        {user && (
          <>
            {notFound && (
              <p className="px-4 pt-3 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">
                Limited profile — this member has not completed their public profile yet.
              </p>
            )}
            <ProfessionalProfile
              user={user}
              isOwnProfile={isOwnProfile}
              variant="panel"
              onClose={onClose}
            />
          </>
        )}
      </div>
    </div>
  );
}
