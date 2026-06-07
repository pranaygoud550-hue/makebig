'use client';

import { useState, useCallback, useEffect } from 'react';
import { AppTopBar } from '@/components/AppTopBar';
import { AppBottomNav, AppTab } from '@/components/AppBottomNav';
import { HomeTab } from '@/components/app/HomeTab';
import { ExploreTab } from '@/components/app/ExploreTab';
import { markOnboardingBrowse } from '@/components/app/OnboardingChecklist';
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
import { useToast } from '@/lib/context/ToastContext';
import { useRemovedFromProject } from '@/lib/hooks/useRemovedFromProject';
import { useTabPageTitle } from '@/lib/hooks/usePageTitle';
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
  onClearProject?: () => void;
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
  onClearProject,
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
  const { showToast } = useToast();

  useTabPageTitle(activeTab);

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
    if (activeTab !== 'notifications') return;
    void notificationsState.fetchNotifications().then(() => markAllRead());
  }, [activeTab, notificationsState.fetchNotifications, markAllRead]);

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

  const handleLeaveSuccess = useCallback(() => {
    onClearProject?.();
    handleTabChange('home');
  }, [onClearProject, handleTabChange]);

  const handleRemovedFromProject = useCallback(
    (payload: { projectName?: string; message?: string }) => {
      showToast(
        payload.message || `You have been removed from ${payload.projectName || 'the project'}`,
        'error'
      );
      onClearProject?.();
      handleTabChange('home');
    },
    [showToast, onClearProject, handleTabChange]
  );

  useRemovedFromProject({
    userContact: user.contact,
    activeProjectId: currentProject?.id,
    onRemoved: handleRemovedFromProject,
  });

  return (
    <div className="min-h-screen bg-[#f3f2ef] dark:bg-gray-900 flex flex-col">
      {apiOnline === false && (
        <div className="bg-white border-b border-[#e0e0e0] px-4 sm:px-6 py-2.5 text-center text-sm text-[#666]">
          Backend API is offline — posts, team chat, and AI need the Render API. Check{' '}
          <code className="font-mono text-xs bg-[#f3f2ef] text-[#1d2226] px-1.5 py-0.5 rounded border border-[#e0e0e0]">
            NEXT_PUBLIC_API_URL
          </code>{' '}
          on Vercel and that Render is awake.
        </div>
      )}
      <AppTopBar
        currentProject={currentProject}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        unreadCount={unreadCount}
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

      <main className="flex-1 pb-20 md:pb-0 w-full px-4 sm:px-6 lg:px-8 py-4 text-sm md:text-base page-enter">
        {activeTab === 'home' && (
          <HomeTab
            userName={user.name}
            userContact={user.contact}
            onJoinProject={onPublicJoinClick}
            onOpenDashboard={onOpenYourProject}
            onOpenExplore={() => {
              if (user.contact) markOnboardingBrowse(user.contact);
              setActiveTab('explore');
            }}
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
            onBrowseProjects={() => {
              if (user.contact) markOnboardingBrowse(user.contact);
              handleTabChange('explore');
            }}
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
            userContact={user.contact}
            onStartProject={onStartProject}
            onJoinProject={onJoinProject}
            onOpenDashboard={onOpenYourProject}
            onLeaveSuccess={handleLeaveSuccess}
            onShowToast={showToast}
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
