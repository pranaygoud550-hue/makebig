'use client';

export type AppTab =
  | 'home'
  | 'explore'
  | 'posts'
  | 'ai'
  | 'notifications'
  | 'friends'
  | 'project';

export const APP_NAV_TABS: { id: AppTab; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'explore', label: 'Explore', icon: '🔍' },
  { id: 'posts', label: 'Posts', icon: '📝' },
  { id: 'ai', label: 'AI Coder', icon: '🤖' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'friends', label: 'Friends', icon: '👋' },
  { id: 'project', label: 'Your Project', icon: '📁' },
];

interface AppBottomNavProps {
  active: AppTab;
  onChange: (tab: AppTab) => void;
  unreadCount?: number;
}

export function AppBottomNav({ active, onChange, unreadCount = 0 }: AppBottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#d9d9d9] shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      <div className="w-full overflow-x-auto">
        <div className="flex items-stretch min-w-max px-1">
          {APP_NAV_TABS.map((tab) => {
            const isActive = active === tab.id;
            const showBadge = tab.id === 'notifications' && unreadCount > 0;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={`relative flex flex-col items-center justify-center px-3 py-2 min-w-[4.5rem] transition-colors ${
                  isActive ? 'text-[#0A66C2]' : 'text-[#999]'
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
                    isActive ? 'text-[#0A66C2]' : ''
                  }`}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#0A66C2] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
