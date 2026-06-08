import type { AppTab } from '@/components/AppBottomNav';

export const APP_TAB_REQUEST = 'makeBigRequestTab';
const TAB_STORAGE_KEY = 'makeBigActiveTab';

/** Switch AppShell tab after create/join (sessionStorage alone is not enough). */
export function requestAppTab(tab: AppTab) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(TAB_STORAGE_KEY, tab);
  window.dispatchEvent(new CustomEvent(APP_TAB_REQUEST, { detail: tab }));
}
