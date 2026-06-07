const DISMISS_KEY = (contact: string) => `makebig_onboarding_dismiss_${contact}`;
const STEPS_KEY = (contact: string) => `makebig_onboarding_${contact}`;

export type OnboardingStepId =
  | 'account'
  | 'profile'
  | 'browse'
  | 'join_request'
  | 'project'
  | 'ai_link';

export interface OnboardingState {
  account: boolean;
  profile: boolean;
  browse: boolean;
  join_request: boolean;
  project: boolean;
  ai_link: boolean;
  dismissed: boolean;
}

const DEFAULT: Omit<OnboardingState, 'dismissed'> = {
  account: true,
  profile: false,
  browse: false,
  join_request: false,
  project: false,
  ai_link: false,
};

export function loadOnboardingState(contact: string): OnboardingState {
  if (typeof window === 'undefined') {
    return { ...DEFAULT, dismissed: false };
  }
  const dismissed = localStorage.getItem(DISMISS_KEY(contact)) === '1';
  try {
    const raw = localStorage.getItem(STEPS_KEY(contact));
    if (!raw) return { ...DEFAULT, dismissed };
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return {
      account: parsed.account ?? true,
      profile: Boolean(parsed.profile),
      browse: Boolean(parsed.browse),
      join_request: Boolean(parsed.join_request),
      project: Boolean(parsed.project),
      ai_link: Boolean(parsed.ai_link),
      dismissed,
    };
  } catch {
    return { ...DEFAULT, dismissed };
  }
}

export function saveOnboardingState(contact: string, state: Omit<OnboardingState, 'dismissed'>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STEPS_KEY(contact), JSON.stringify(state));
}

export function dismissOnboarding(contact: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DISMISS_KEY(contact), '1');
}

export function isOnboardingComplete(state: OnboardingState) {
  return (
    state.profile &&
    state.browse &&
    state.join_request &&
    state.project &&
    state.ai_link
  );
}
