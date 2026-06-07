const DISMISS_KEY = (contact: string) => `makebig_onboarding_dismiss_${contact}`;
const STEPS_KEY = (contact: string) => `makebig_onboarding_${contact}`;

export type OnboardingStepId =
  | 'account'
  | 'profile'
  | 'project'
  | 'tasks'
  | 'post'
  | 'standup';

export interface OnboardingState {
  account: boolean;
  profile: boolean;
  project: boolean;
  tasks: boolean;
  post: boolean;
  standup: boolean;
  dismissed: boolean;
}

const DEFAULT: Omit<OnboardingState, 'dismissed'> = {
  account: true,
  profile: false,
  project: false,
  tasks: false,
  post: false,
  standup: false,
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
      project: Boolean(parsed.project),
      tasks: Boolean(parsed.tasks),
      post: Boolean(parsed.post),
      standup: Boolean(parsed.standup),
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
  return state.profile && state.project && state.tasks && state.post && state.standup;
}
