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
  profileComplete?: boolean;
  onOpenExplore?: () => void;
  onOpenProfile?: () => void;
  onOpenProject?: () => void;
}

export function OnboardingChecklist({
  userContact,
  userCreatedAt,
  profileComplete,
  onOpenExplore,
  onOpenProfile,
  onOpenProject,
}: OnboardingChecklistProps) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!userContact) return;
    const created = userCreatedAt ? new Date(userCreatedAt).getTime() : Date.now();
    const withinWeek = Date.now() - created < 7 * 24 * 60 * 60 * 1000;
    const loaded = loadOnboardingState(userContact);
    if (!withinWeek || loaded.dismissed || isOnboardingComplete(loaded)) {
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
    const hasProject = localStorage.getItem(`makebig_has_project_${userContact}`) === '1';
    if (hasProject) next.project = true;
    if (localStorage.getItem(`makebig_tasks_week1_${userContact}`) === '1') next.tasks = true;
    if (localStorage.getItem(`makebig_post_week1_${userContact}`) === '1') next.post = true;
    if (localStorage.getItem(`makebig_standup_week1_${userContact}`) === '1') next.standup = true;
    saveOnboardingState(userContact, next);
    setState({ ...next, dismissed: state.dismissed });
    if (isOnboardingComplete(next)) setVisible(false);
  }, [userContact, state, profileComplete]);

  if (!visible || !state) return null;

  const doneCount = [state.profile, state.project, state.tasks, state.post, state.standup].filter(Boolean).length;

  const items = [
    { id: 'profile' as const, label: 'Add skills + college to your profile', done: state.profile, action: onOpenProfile },
    {
      id: 'project' as const,
      label: 'Create or join a project',
      done: state.project,
      action: onOpenExplore ?? onOpenProject,
    },
    {
      id: 'tasks' as const,
      label: 'Add 3 tasks to your project board',
      done: state.tasks,
      action: onOpenProject,
      helper: 'Open your project → Tasks tab → add three concrete next steps',
    },
    {
      id: 'post' as const,
      label: 'Post one team update',
      done: state.post,
      action: onOpenProject,
      helper: 'Posts tab — share what your team shipped or learned this week',
    },
    {
      id: 'standup' as const,
      label: 'Submit one standup in team chat',
      done: state.standup,
      action: onOpenProject,
      helper: 'Messages tab — yesterday / today / blockers',
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
      <p className="text-xs font-semibold text-[#0A66C2] uppercase tracking-widest">Week 1 focus</p>
      <h3 className="font-bold text-[#1d2226] mt-1">Finish your first sprint on Make Big</h3>
      <p className="text-xs text-[#666] mt-1">{doneCount}/5 steps — teams that complete this rarely quit in week 3.</p>
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

export function markOnboardingProject(contact: string) {
  localStorage.setItem(`makebig_has_project_${contact}`, '1');
}

/** @deprecated use markOnboardingProject / week-1 steps */
export function markOnboardingBrowse(contact: string) {
  sessionStorage.setItem(`makebig_browsed_${contact}`, '1');
}

/** @deprecated join flow still sets legacy flag */
export function markOnboardingJoin(contact: string) {
  localStorage.setItem(`makebig_join_sent_${contact}`, '1');
  markOnboardingProject(contact);
}

export function markOnboardingTasks(contact: string) {
  localStorage.setItem(`makebig_tasks_week1_${contact}`, '1');
}

export function markOnboardingPost(contact: string) {
  localStorage.setItem(`makebig_post_week1_${contact}`, '1');
}

export function markOnboardingStandup(contact: string) {
  localStorage.setItem(`makebig_standup_week1_${contact}`, '1');
}

/** @deprecated AI link is optional after week 1 */
export function markOnboardingAiLink(contact: string) {
  localStorage.setItem(`makebig_ai_link_${contact}`, '1');
}
