'use client';

import { ProjectData } from '@/lib/types';
import { hasActiveWorkspace, workspaceLabel } from '@/lib/projectWorkspace';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';

interface AppTopBarProps {
  currentProject?: ProjectData | null;
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
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0 shrink">
          <BrandLogo size="sm" href={null} />
          {hasProject && (
            <p className="text-[10px] text-[#666] truncate max-w-[140px] sm:max-w-[200px]">
              {workspaceLabel(currentProject)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
          {hasProject ? (
            <>
              {onOpenDashboard && (
                <button
                  type="button"
                  onClick={onOpenDashboard}
                  className="px-3 py-1.5 bg-[#0A66C2] text-white text-xs sm:text-sm font-semibold rounded-full hover:bg-[#004182] transition-colors whitespace-nowrap"
                >
                  Dashboard
                </button>
              )}
              <button
                type="button"
                onClick={onStartProject}
                className="hidden sm:block px-3 py-1.5 border border-[#d9d9d9] text-[#666] text-xs sm:text-sm font-semibold rounded-full hover:border-[#0A66C2] hover:text-[#0A66C2] transition-colors whitespace-nowrap"
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
                className="px-3 py-1.5 bg-[#0A66C2] text-white text-xs sm:text-sm font-semibold rounded-full hover:bg-[#004182] transition-colors whitespace-nowrap"
              >
                Start a project
              </button>
              <button
                type="button"
                onClick={onJoinProject}
                className="px-3 py-1.5 border border-[#0A66C2] text-[#0A66C2] text-xs sm:text-sm font-semibold rounded-full hover:bg-[#EEF3FB] transition-colors whitespace-nowrap"
              >
                Join a project
              </button>
            </>
          )}
          {onOpenProfile && userName && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-[#f3f2ef] transition-colors"
              title="My profile"
            >
              <ProfileAvatar name={userName} imageUrl={profileImage} size="sm" />
              <span className="hidden sm:inline text-xs font-semibold text-[#1d2226] max-w-[80px] truncate">
                {userName.split(' ')[0]}
              </span>
            </button>
          )}
          {userName && (
            <Link
              href="/profile"
              className="hidden md:inline text-xs font-semibold text-[#0A66C2] hover:underline whitespace-nowrap"
            >
              Profile
            </Link>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="hidden sm:block px-2 py-1.5 text-xs text-[#666] hover:text-[#0A66C2] font-medium"
            title={userName ? `Sign out (${userName})` : 'Sign out'}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
