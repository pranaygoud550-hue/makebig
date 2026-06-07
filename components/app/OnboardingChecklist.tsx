'use client';

import { useEffect, useState } from 'react';
import {
  dismissOnboarding,
  isOnboardingComplete,
  loadOnboardingState,
  saveOnboardingState,
  type OnboardingState,
} from '@/lib/onboardingStorage';

interface OnboardingChecklistProps {
  userContact: string;
  userCreatedAt?: string;
  userName?: string;
  profileComplete?: boolean;
  onOpenExplore?: () => void;
  onOpenProfile?: () => void;
  onOpenAI?: () => void;
}

export function OnboardingChecklist({
  userContact,
  userCreatedAt,
  profileComplete,
  onOpenExplore,
  onOpenProfile,
  onOpenAI,
}: OnboardingChecklistProps) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!userContact) return;
    const created = userCreatedAt ? new Date(userCreatedAt).getTime() : Date.now();
    const within48h = Date.now() - created < 48 * 60 * 60 * 1000;
    const loaded = loadOnboardingState(userContact);
    if (!within48h || loaded.dismissed || isOnboardingComplete(loaded)) {
      setVisible(false);
      return;
    }
    setState(loaded);
    setVisible(true);
  }, [userContact, userCreatedAt]);

  useEffect(() => {
    if (!userContact || !state) return;
    const next = { ...state };
    if (profileComplete) next.profile = true;
    const joined = localStorage.getItem(`makebig_join_sent_${userContact}`) === '1';
    if (joined) next.join_request = true;
    const hasProject = localStorage.getItem(`makebig_has_project_${userContact}`) === '1';
    if (hasProject) next.project = true;
    const browsed = sessionStorage.getItem(`makebig_browsed_${userContact}`) === '1';
    if (browsed) next.browse = true;
    const aiLink = localStorage.getItem(`makebig_ai_link_${userContact}`) === '1';
    if (aiLink) next.ai_link = true;
    saveOnboardingState(userContact, next);
    setState({ ...next, dismissed: state.dismissed });
    if (isOnboardingComplete(next)) setVisible(false);
  }, [userContact, state, profileComplete]);

  if (!visible || !state) return null;

  const items = [
    { id: 'account' as const, label: 'Create your account', done: true, action: null },
    { id: 'profile' as const, label: 'Complete your profile', done: state.profile, action: onOpenProfile },
    { id: 'browse' as const, label: 'Browse projects', done: state.browse, action: onOpenExplore },
    { id: 'join_request' as const, label: 'Send your first join request', done: state.join_request, action: onOpenExplore },
    { id: 'project' as const, label: 'Start or join a project', done: state.project, action: null },
    {
      id: 'ai_link' as const,
      label: 'Share a link with your AI co-founder',
      done: state.ai_link,
      action: onOpenAI,
      helper:
        'Paste your GitHub repo, a competitor site, or any relevant link and get instant advice',
    },
  ];

  return (
    <div className="mb-6 bg-gradient-to-r from-[#EEF3FB] to-white border border-[#0A66C2]/20 rounded-2xl p-5 relative">
      <button
        type="button"
        onClick={() => {
          dismissOnboarding(userContact);
          setVisible(false);
        }}
        className="absolute top-3 right-3 text-[#999] hover:text-[#666] text-lg"
        aria-label="Dismiss"
      >
        ×
      </button>
      <h3 className="font-bold text-[#1d2226]">Welcome to Make Big! Get started 🚀</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <span className="mt-0.5">{item.done ? '✅' : '⬜'}</span>
            <div>
              {item.action && !item.done ? (
                <button type="button" onClick={item.action} className="text-[#0A66C2] hover:underline text-left">
                  {item.label} →
                </button>
              ) : (
                <span className={item.done ? 'text-[#666]' : 'text-[#1d2226]'}>{item.label}</span>
              )}
              {'helper' in item && item.helper && !item.done && (
                <p className="text-xs text-[#666] mt-0.5">{item.helper}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function markOnboardingBrowse(contact: string) {
  sessionStorage.setItem(`makebig_browsed_${contact}`, '1');
}

export function markOnboardingJoin(contact: string) {
  localStorage.setItem(`makebig_join_sent_${contact}`, '1');
}

export function markOnboardingProject(contact: string) {
  localStorage.setItem(`makebig_has_project_${contact}`, '1');
}

export function markOnboardingAiLink(contact: string) {
  localStorage.setItem(`makebig_ai_link_${contact}`, '1');
}
