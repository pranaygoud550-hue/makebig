'use client';

import { ProjectData } from '@/lib/types';
import { hasActiveWorkspace, workspaceLabel } from '@/lib/projectWorkspace';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { BrandLogo } from '@/components/BrandLogo';
import { APP_NAV_TABS, AppTab } from '@/components/AppBottomNav';

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

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#d9d9d9] shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-14 md:h-auto md:py-3 flex items-center justify-between gap-3">
        {/* Logo — always visible */}
        <div className="min-w-0 shrink flex items-center gap-2">
          <BrandLogo size="sm" href={null} />
          {hasProject && (
            <p className="hidden sm:block text-[10px] text-[#666] truncate max-w-[120px] md:max-w-[200px]">
              {workspaceLabel(currentProject)}
            </p>
          )}
        </div>

        {/* Desktop nav links */}
        {onTabChange && (
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center overflow-x-auto">
            {APP_NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`px-3 py-2 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'text-[#0A66C2] border-[#0A66C2]'
                      : 'text-[#666] border-transparent hover:text-[#0A66C2]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        )}

        {/* Right actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Project actions — desktop only when no bottom nav context */}
          {hasProject ? (
            <>
              {onOpenDashboard && (
                <button
                  type="button"
                  onClick={onOpenDashboard}
                  className="hidden lg:block px-3 py-1.5 bg-[#0A66C2] text-white text-xs sm:text-sm font-semibold rounded-full hover:bg-[#004182] transition-colors whitespace-nowrap"
                >
                  Dashboard
                </button>
              )}
              <button
                type="button"
                onClick={onStartProject}
                className="hidden lg:block px-3 py-1.5 border border-[#d9d9d9] text-[#666] text-xs sm:text-sm font-semibold rounded-full hover:border-[#0A66C2] hover:text-[#0A66C2] transition-colors whitespace-nowrap"
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
                className="hidden md:block px-3 py-1.5 bg-[#0A66C2] text-white text-xs sm:text-sm font-semibold rounded-full hover:bg-[#004182] transition-colors whitespace-nowrap"
              >
                Start a project
              </button>
              <button
                type="button"
                onClick={onJoinProject}
                className="hidden md:block px-3 py-1.5 border border-[#0A66C2] text-[#0A66C2] text-xs sm:text-sm font-semibold rounded-full hover:bg-[#EEF3FB] transition-colors whitespace-nowrap"
              >
                Join a project
              </button>
            </>
          )}

          {/* Notification bell — mobile + desktop */}
          {onTabChange && (
            <button
              type="button"
              onClick={() => onTabChange('notifications')}
              className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f3f2ef] transition-colors text-lg"
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
              className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-[#f3f2ef] transition-colors"
              title="My profile"
            >
              <ProfileAvatar name={userName} imageUrl={profileImage} size="sm" />
              <span className="hidden md:inline text-xs font-semibold text-[#1d2226] max-w-[80px] truncate">
                {userName.split(' ')[0]}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="hidden md:block px-2 py-1.5 text-xs text-[#666] hover:text-[#0A66C2] font-medium"
            title={userName ? `Sign out (${userName})` : 'Sign out'}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
