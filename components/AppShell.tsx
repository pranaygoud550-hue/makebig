'use client';

import { useState, useCallback, useEffect } from 'react';
import { AppTopBar } from '@/components/AppTopBar';
import { AppBottomNav, AppTab } from '@/components/AppBottomNav';
import { HomeTab } from '@/components/app/HomeTab';
import { ExploreTab } from '@/components/app/ExploreTab';
import { PostsTab } from '@/components/app/PostsTab';
import { AICoderTab } from '@/components/app/AICoderTab';
import { NotificationsView } from '@/components/app/NotificationsView';
import { FriendsView } from '@/components/app/FriendsView';
import { YourProjectTab } from '@/components/app/YourProjectTab';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { BrowseProject } from '@/lib/api';
import { Profile, ProjectData, User } from '@/lib/types';
import { UserProfilePanel } from '@/components/app/UserProfilePanel';
import { projectNeedsSync } from '@/lib/projectWorkspace';
import { apiCheckHealth } from '@/lib/api';
import { ensureProjectOnline } from '@/lib/ensureProjectOnline';
import type { DashboardNavTab } from '@/components/DashboardNew';

const TAB_STORAGE_KEY = 'makeBigActiveTab';
const PROFILE_OPEN_KEY = 'makeBigProfileOpen';

function readStoredTab(): AppTab {
  if (typeof window === 'undefined') return 'home';
  const saved = sessionStorage.getItem(TAB_STORAGE_KEY);
  const allowed: AppTab[] = ['home', 'explore', 'posts', 'ai', 'notifications', 'friends', 'project'];
  return saved && allowed.includes(saved as AppTab) ? (saved as AppTab) : 'home';
}

interface AppShellProps {
  user: User;
  userProfile?: Profile | null;
  currentProject: ProjectData | null;
  onStartProject: () => void;
  onJoinProject: () => void;
  onOpenYourProject: (section?: DashboardNavTab) => void;
  onLogout: () => void;
  onPublicJoinClick: (project: BrowseProject) => void;
  onProjectUpdate: (project: ProjectData) => void;
  onProfileSaved?: () => void | Promise<void>;
}

export function AppShell({
  user,
  userProfile,
  currentProject,
  onStartProject,
  onJoinProject,
  onOpenYourProject,
  onLogout,
  onPublicJoinClick,
  onProjectUpdate,
  onProfileSaved,
}: AppShellProps) {
  const [activeTab, setActiveTab] = useState<AppTab>(() => readStoredTab());
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [showProfile, setShowProfile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(PROFILE_OPEN_KEY) === '1';
  });
  const notifUserKey = user.id || user.contact;
  const notificationsState = useNotifications(notifUserKey);
  const { unreadCount, markAllRead } = notificationsState;

  const handleTabChange = useCallback((tab: AppTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(TAB_STORAGE_KEY, tab);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(TAB_STORAGE_KEY, activeTab);
    }
  }, [activeTab]);

  const handleProjectSynced = useCallback(
    (project: ProjectData) => {
      onProjectUpdate(project);
    },
    [onProjectUpdate]
  );

  useEffect(() => {
    apiCheckHealth().then(setApiOnline);
  }, []);

  useEffect(() => {
    if (activeTab === 'notifications') {
      markAllRead();
    }
  }, [activeTab, markAllRead]);

  useEffect(() => {
    if (!user.contact || !currentProject || !projectNeedsSync(currentProject)) return;
    let cancelled = false;
    ensureProjectOnline(currentProject, user.contact).then((result) => {
      if (!cancelled && result.ok && result.project) onProjectUpdate(result.project);
    });
    return () => {
      cancelled = true;
    };
  }, [user.contact, currentProject?.name, currentProject?.id, onProjectUpdate]);

  return (
    <div className="min-h-screen bg-[#f3f2ef] flex flex-col">
      {apiOnline === false && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-900">
          Backend API is offline — posts, team chat, and AI need the Render API. Check{' '}
          <code className="font-mono text-xs bg-white/80 px-1 rounded">NEXT_PUBLIC_API_URL</code>{' '}
          on Vercel and that Render is awake.
        </div>
      )}
      <AppTopBar
        currentProject={currentProject}
        onStartProject={onStartProject}
        onJoinProject={onJoinProject}
        onOpenDashboard={() => onOpenYourProject('dashboard')}
        onOpenProfile={() => {
          setShowProfile(true);
          if (typeof window !== 'undefined') sessionStorage.setItem(PROFILE_OPEN_KEY, '1');
        }}
        onLogout={onLogout}
        userName={user.name}
        profileImage={userProfile?.profileImage}
      />

      <UserProfilePanel
        isOpen={showProfile}
        onClose={() => {
          setShowProfile(false);
          if (typeof window !== 'undefined') sessionStorage.setItem(PROFILE_OPEN_KEY, '0');
        }}
        user={user}
        onSaved={async () => {
          await onProfileSaved?.();
          setShowProfile(false);
          if (typeof window !== 'undefined') sessionStorage.setItem(PROFILE_OPEN_KEY, '0');
        }}
        onLogout={onLogout}
      />

      <main className="flex-1 pb-20 max-w-4xl w-full mx-auto px-4 py-4">
        {activeTab === 'home' && (
          <HomeTab
            userName={user.name}
            userContact={user.contact}
            onJoinProject={onPublicJoinClick}
            onOpenDashboard={onOpenYourProject}
          />
        )}
        {activeTab === 'explore' && (
          <ExploreTab
            userContact={user.contact}
            onJoinProject={onPublicJoinClick}
            onOpenDashboard={onOpenYourProject}
          />
        )}
        {activeTab === 'posts' && (
          <PostsTab
            currentProject={currentProject}
            userContact={user.contact}
            onOpenDashboard={() => onOpenYourProject('feed')}
            onProjectSynced={handleProjectSynced}
          />
        )}
        {activeTab === 'ai' && (
          <AICoderTab
            user={user}
            currentProject={currentProject}
            onOpenDashboard={() => onOpenYourProject('dashboard')}
            onProjectSynced={handleProjectSynced}
          />
        )}
        {activeTab === 'notifications' && (
          <NotificationsView userId={notifUserKey} {...notificationsState} />
        )}
        {activeTab === 'friends' && (
          <FriendsView
            currentProject={currentProject}
            userContact={user.contact}
            onInvite={currentProject?.id ? () => onOpenYourProject('invite') : undefined}
          />
        )}
        {activeTab === 'project' && (
          <YourProjectTab
            currentProject={currentProject}
            onStartProject={onStartProject}
            onJoinProject={onJoinProject}
            onOpenDashboard={onOpenYourProject}
          />
        )}
      </main>

      <AppBottomNav
        active={activeTab}
        onChange={handleTabChange}
        unreadCount={unreadCount}
      />
    </div>
  );
}
