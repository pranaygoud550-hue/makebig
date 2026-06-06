'use client';

import { User } from '@/lib/types';
import { ProfessionalProfile } from '@/components/app/ProfessionalProfile';
import { useEffect, useState } from 'react';

interface UserProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSaved?: () => void;
  onLogout?: () => void;
}

export function UserProfilePanel({ isOpen, onClose, user, onSaved, onLogout }: UserProfilePanelProps) {
  const [mounted, setMounted] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setMounted(true);
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4 md:p-8 ${
        isOpen ? '' : 'hidden'
      }`}
      aria-hidden={!isOpen}
    >
      <div className="w-full max-w-3xl bg-[#f3f2ef] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <ProfessionalProfile
          user={user}
          isOwnProfile
          variant="panel"
          onClose={onClose}
          onSaved={onSaved}
          onLogout={onLogout}
        />
      </div>
    </div>
  );
}
