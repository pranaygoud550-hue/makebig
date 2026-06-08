'use client';

export type AppTab =
  | 'home'
  | 'explore'
  | 'posts'
  | 'ai'
  | 'notifications'
  | 'friends'
  | 'project';

export const APP_NAV_TABS: { id: AppTab; label: string; icon: string; mobileLabel?: string }[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'explore', label: 'Explore', icon: '🔍' },
  { id: 'posts', label: 'Posts', icon: '📝' },
  { id: 'ai', label: 'AI Workspace', mobileLabel: 'AI', icon: '🤖' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'friends', label: 'Friends', icon: '👋' },
  { id: 'project', label: 'Your Project', mobileLabel: 'Project', icon: '📁' },
];

export const MOBILE_NAV_TABS = APP_NAV_TABS;

interface AppBottomNavProps {
  active: AppTab;
  onChange: (tab: AppTab) => void;
  unreadCount?: number;
}

export function AppBottomNav({ active, onChange, unreadCount = 0 }: AppBottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-[#d9d9d9] dark:border-gray-700 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
      <div className="w-full overflow-x-auto">
        <div className="flex items-stretch min-w-max px-1 h-16">
          {MOBILE_NAV_TABS.map((tab) => {
            const isActive = active === tab.id;
            const showBadge = tab.id === 'notifications' && unreadCount > 0;
            const label = tab.mobileLabel || tab.label;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={`relative flex flex-col items-center justify-center px-2.5 min-w-[3.5rem] transition-colors active:scale-95 ${
                  isActive ? 'text-[#0A66C2] dark:text-sky-400' : 'text-[#999] dark:text-gray-500'
                }`}
              >
                <span className="text-xl leading-none relative">
                  {tab.icon}
                  {showBadge && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[10px] font-semibold mt-0.5 whitespace-nowrap ${
                    isActive ? 'text-[#0A66C2] dark:text-sky-400' : ''
                  }`}
                >
                  {label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#0A66C2] dark:bg-sky-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
