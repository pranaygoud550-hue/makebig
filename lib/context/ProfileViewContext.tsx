'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { MemberProfilePanel } from '@/components/app/MemberProfilePanel';

interface ProfileViewContextValue {
  openProfile: (contact: string, displayName?: string) => void;
  closeProfile: () => void;
}

const ProfileViewContext = createContext<ProfileViewContextValue | null>(null);

export function ProfileViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<{ contact: string; displayName?: string } | null>(
    null
  );

  const openProfile = useCallback((contact: string, displayName?: string) => {
    const normalized = contact?.trim().toLowerCase();
    if (!normalized) return;
    setView({ contact: normalized, displayName });
  }, []);

  const closeProfile = useCallback(() => setView(null), []);

  return (
    <ProfileViewContext.Provider value={{ openProfile, closeProfile }}>
      {children}
      <MemberProfilePanel
        contact={view?.contact ?? null}
        displayName={view?.displayName}
        onClose={closeProfile}
      />
    </ProfileViewContext.Provider>
  );
}

export function useProfileView(): ProfileViewContextValue {
  const ctx = useContext(ProfileViewContext);
  if (!ctx) {
    return {
      openProfile: () => {},
      closeProfile: () => {},
    };
  }
  return ctx;
}
