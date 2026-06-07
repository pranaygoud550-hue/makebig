'use client';

import { ProjectData } from '@/lib/types';
import { hasActiveWorkspace, workspaceLabel } from '@/lib/projectWorkspace';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { BrandLogo } from '@/components/BrandLogo';
import { APP_NAV_TABS, AppTab } from '@/components/AppBottomNav';
import { useTheme } from '@/lib/context/ThemeContext';

interface AppTopBarProps {
  currentProject?: ProjectData | null;
  activeTab?: AppTab;
  onTabChange?: (tab: AppTab) => void;
  unreadCount?: number;
  onStartProject: () => void;
  onJoinProject: () => void;
  onOpenDashboard?: () => void;
  onOpenProfile?: () => void;
  onLogout: () => void;
  userName?: string;
  profileImage?: string | null;
}

export function AppTopBar({
  currentProject,
  activeTab = 'home',
  onTabChange,
  unreadCount = 0,
  onStartProject,
  onJoinProject,
  onOpenDashboard,
  onOpenProfile,
  onLogout,
  userName,
  profileImage,
}: AppTopBarProps) {
  const hasProject = hasActiveWorkspace(currentProject);
  const { resolved, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-[#d9d9d9] dark:border-gray-700 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-14 md:h-auto md:py-3 flex items-center justify-between gap-3">
        <div className="min-w-0 shrink flex items-center gap-2">
          <BrandLogo size="sm" href={null} />
          {hasProject && (
            <p className="hidden md:block text-[10px] text-[#666] dark:text-gray-400 truncate max-w-[200px]">
              {workspaceLabel(currentProject)}
            </p>
          )}
        </div>

        {onTabChange && (
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center overflow-x-auto">
            {APP_NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`relative px-3 py-2 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors active:scale-95 ${
                    isActive
                      ? 'text-[#0A66C2] dark:text-sky-400 border-[#0A66C2] dark:border-sky-400'
                      : 'text-[#666] dark:text-gray-400 border-transparent hover:text-[#0A66C2] dark:hover:text-sky-400'
                  }`}
                >
                  {tab.label}
                  {tab.id === 'notifications' && unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {hasProject ? (
            <>
              {onOpenDashboard && (
                <button
                  type="button"
                  onClick={onOpenDashboard}
                  className="hidden lg:block px-3 py-1.5 bg-[#0A66C2] text-white text-xs sm:text-sm font-semibold rounded-full hover:bg-[#004182] active:scale-95 transition-transform whitespace-nowrap"
                >
                  Dashboard
                </button>
              )}
              <button
                type="button"
                onClick={onStartProject}
                className="hidden lg:block px-3 py-1.5 border border-[#d9d9d9] dark:border-gray-600 text-[#666] dark:text-gray-300 text-xs sm:text-sm font-semibold rounded-full hover:border-[#0A66C2] active:scale-95 transition-transform whitespace-nowrap"
                title="Start another project"
              >
                + New
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onStartProject}
                className="hidden md:block px-3 py-1.5 bg-[#0A66C2] text-white text-xs sm:text-sm font-semibold rounded-full hover:bg-[#004182] active:scale-95 transition-transform whitespace-nowrap"
              >
                Start a project
              </button>
              <button
                type="button"
                onClick={onJoinProject}
                className="hidden md:block px-3 py-1.5 border border-[#0A66C2] text-[#0A66C2] dark:text-sky-400 text-xs sm:text-sm font-semibold rounded-full hover:bg-[#EEF3FB] dark:hover:bg-gray-800 active:scale-95 transition-transform whitespace-nowrap"
              >
                Join a project
              </button>
            </>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f3f2ef] dark:hover:bg-gray-800 transition-colors text-lg active:scale-95"
            title={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle dark mode"
          >
            {resolved === 'dark' ? '☀️' : '🌙'}
          </button>

          {onTabChange && (
            <button
              type="button"
              onClick={() => onTabChange('notifications')}
              className="md:hidden relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f3f2ef] dark:hover:bg-gray-800 transition-colors text-lg active:scale-95"
              title="Notifications"
              aria-label="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {onOpenProfile && userName && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-[#f3f2ef] dark:hover:bg-gray-800 transition-colors active:scale-95"
              title="My profile"
            >
              <ProfileAvatar name={userName} imageUrl={profileImage} size="sm" />
              <span className="hidden md:inline text-xs font-semibold text-[#1d2226] dark:text-white max-w-[80px] truncate">
                {userName.split(' ')[0]}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="hidden md:block px-2 py-1.5 text-xs text-[#666] dark:text-gray-400 hover:text-[#0A66C2] dark:hover:text-sky-400 font-medium active:scale-95 transition-transform"
            title={userName ? `Sign out (${userName})` : 'Sign out'}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
