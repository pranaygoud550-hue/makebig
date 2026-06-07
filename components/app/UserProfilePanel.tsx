'use client';

import { User } from '@/lib/types';
import { ProfessionalProfile } from '@/components/app/ProfessionalProfile';
import { useEffect, useState } from 'react';
import { useSheetHistory } from '@/lib/useSheetHistory';

interface UserProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSaved?: () => void;
  onLogout?: () => void;
}

export function UserProfilePanel({ isOpen, onClose, user, onSaved, onLogout }: UserProfilePanelProps) {
  const [mounted, setMounted] = useState(isOpen);

  useSheetHistory(isOpen, onClose);

  useEffect(() => {
    if (isOpen) setMounted(true);
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <div className={isOpen ? 'block' : 'hidden'} aria-hidden={!isOpen}>
      <ProfessionalProfile
        user={user}
        isOwnProfile
        variant="panel"
        onClose={onClose}
        onSaved={onSaved}
        onLogout={onLogout}
      />
    </div>
  );
}
